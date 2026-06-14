import { Handler } from "@netlify/functions";
import { adminSupabase } from "./_lib/auth.js";

type Offer = {
  title: string;
  description: string;
  reward_type: "fixed_discount" | "percent_discount" | "free_delivery" | "free_item";
  face_value_cents: number;
  minimum_order_cents: number;
  discount_percent: number;
};

function responseText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI returned no structured output");
}

const handler: Handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return { statusCode: 405, body: "Method Not Allowed" };

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || event.headers.authorization !== `Bearer ${cronSecret}`) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";
  if (!openaiKey) return { statusCode: 503, body: JSON.stringify({ error: "OPENAI_API_KEY is missing" }) };

  const { data: lastRun } = await adminSupabase
    .from("advantage_generation_runs")
    .select("generated_at")
    .eq("status", "success")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastRun && Date.now() - new Date(lastRun.generated_at).getTime() < 48 * 60 * 60 * 1000) {
    return { statusCode: 200, body: JSON.stringify({ rotated: false, reason: "cycle_not_due" }) };
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [ordersResult, restaurantsResult, rewardsResult, recentOffersResult] = await Promise.all([
    adminSupabase.from("orders").select("final_client_total_cents").eq("status", "delivered").gte("delivered_at", since).limit(1000),
    adminSupabase.from("restaurants").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminSupabase.from("client_rewards").select("status").gte("created_at", since).limit(1000),
    adminSupabase.from("advantage_catalog").select("title,reward_type,face_value_cents").order("created_at", { ascending: false }).limit(12),
  ]);

  const totals = (ordersResult.data || []).map((order) => Number(order.final_client_total_cents || 0)).filter(Boolean);
  const averageOrderCents = totals.length ? Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length) : 2500;
  const rewards = rewardsResult.data || [];
  const usedRewards = rewards.filter((reward) => reward.status === "used").length;
  const stats = {
    average_order_cents: averageOrderCents,
    delivered_orders_30d: totals.length,
    active_restaurants: restaurantsResult.count || 0,
    rewards_created_30d: rewards.length,
    rewards_used_30d: usedRewards,
    recent_offers: recentOffersResult.data || [],
  };

  const aiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      instructions: "Tu conçois les avantages fidélité Foodiz en français. Propose exactement 4 offres variées, simples, réalistes et financièrement prudentes. Évite les titres récents. La valeur faciale est un plafond économique interne en centimes. Pour une remise en pourcentage, indique aussi un plafond via face_value_cents. N'évoque jamais la conversion interne des points dans les textes visibles.",
      input: `Statistiques anonymisées Foodiz : ${JSON.stringify(stats)}`,
      text: {
        format: {
          type: "json_schema",
          name: "foodiz_advantage_cycle",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              offers: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", minLength: 5, maxLength: 80 },
                    description: { type: "string", minLength: 10, maxLength: 180 },
                    reward_type: { type: "string", enum: ["fixed_discount", "percent_discount", "free_delivery", "free_item"] },
                    face_value_cents: { type: "integer", minimum: 100, maximum: 1500 },
                    minimum_order_cents: { type: "integer", minimum: 100, maximum: 10000 },
                    discount_percent: { type: "integer", minimum: 0, maximum: 20 },
                  },
                  required: ["title", "description", "reward_type", "face_value_cents", "minimum_order_cents", "discount_percent"],
                },
              },
            },
            required: ["offers"],
          },
        },
      },
    }),
  });

  if (!aiResponse.ok) {
    const detail = (await aiResponse.text()).slice(0, 500);
    await adminSupabase.from("advantage_generation_runs").insert({ model_name: model, status: "failed", error_message: detail });
    return { statusCode: 502, body: JSON.stringify({ error: "Advantage generation failed" }) };
  }

  try {
    const parsed = JSON.parse(responseText(await aiResponse.json())) as { offers: Offer[] };
    const { data: cycleId, error } = await adminSupabase.rpc("publish_ai_advantage_cycle", {
      proposals: parsed.offers,
      model_name: model,
    });
    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ rotated: Boolean(cycleId), cycleId }) };
  } catch (error: any) {
    await adminSupabase.from("advantage_generation_runs").insert({ model_name: model, status: "failed", error_message: String(error?.message || error).slice(0, 500) });
    return { statusCode: 500, body: JSON.stringify({ error: "Generated offers were rejected by Foodiz safeguards" }) };
  }
};

export { handler };
