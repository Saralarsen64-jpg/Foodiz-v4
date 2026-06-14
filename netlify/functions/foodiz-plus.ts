import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const templates = [
  { key: "local_evening", title: "Ce soir à {city} : {product}", message: "Une envie gourmande ? {product} vous attend chez {restaurant}." },
  { key: "discovery", title: "À découvrir chez {restaurant}", message: "Découvrez {product}, préparé près de chez vous à {city}." },
  { key: "return", title: "Revenez chez {restaurant}", message: "Vous aviez apprécié notre cuisine : laissez-vous tenter par {product}." },
  { key: "simple", title: "{product} vous attend", message: "Commandez {product} chez {restaurant} et profitez pleinement de votre prochain repas." },
];

function render(value: string, context: Record<string, string>) {
  return value.replace(/\{(\w+)\}/g, (_, key) => context[key] || "");
}

async function getRestaurant(userId: string) {
  const { data } = await adminSupabase.from("restaurants").select("id,name,city,owner_id").eq("owner_id", userId).maybeSingle();
  return data;
}

async function getActiveSubscription(restaurantId: string) {
  const { data } = await adminSupabase
    .from("partner_subscriptions")
    .select("*, plan:foodiz_plus_plans(*)")
    .eq("restaurant_id", restaurantId)
    .in("status", ["active", "trialing"])
    .gt("current_period_end", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

async function campaignUsage(restaurantId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  weekStart.setUTCHours(0, 0, 0, 0);
  const [monthly, weekly] = await Promise.all([
    adminSupabase.from("marketing_campaigns").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).in("status", ["scheduled", "sending", "sent"]).gte("created_at", monthStart),
    adminSupabase.from("marketing_campaigns").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId).in("status", ["scheduled", "sending", "sent"]).gte("created_at", weekStart.toISOString()),
  ]);
  return { monthly: monthly.count || 0, weekly: weekly.count || 0 };
}

async function selectAudience(restaurantId: string, city: string, audience: string) {
  const { data: orders } = await adminSupabase
    .from("orders")
    .select("client_id,created_at,status,client:profiles!orders_client_id_fkey(city)")
    .eq("restaurant_id", restaurantId)
    .eq("status", "delivered")
    .order("created_at", { ascending: false });

  const byClient = new Map<string, { count: number; lastOrder: string; city: string }>();
  for (const order of orders || []) {
    const profile = order.client as any;
    const current = byClient.get(order.client_id);
    byClient.set(order.client_id, {
      count: (current?.count || 0) + 1,
      lastOrder: current?.lastOrder || order.created_at,
      city: profile?.city || "",
    });
  }

  const inactiveBefore = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let userIds = [...byClient.entries()].filter(([, value]) => {
    if (city && value.city.toLocaleLowerCase("fr") !== city.toLocaleLowerCase("fr")) return false;
    if (audience === "new_customers") return value.count === 1;
    if (audience === "loyal_customers") return value.count >= 3;
    if (audience === "inactive_customers") return new Date(value.lastOrder).getTime() < inactiveBefore;
    return true;
  }).map(([userId]) => userId);

  if (userIds.length) {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await adminSupabase.from("marketing_campaign_deliveries").select("user_id").in("user_id", userIds).gte("delivered_at", since);
    const excluded = new Set((recent || []).map((row) => row.user_id));
    userIds = userIds.filter((id) => !excluded.has(id));
  }
  return userIds;
}

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return json(401, { error: "Unauthorized" });

  const restaurant = await getRestaurant(user.id);
  if (!restaurant) return json(404, { error: "Restaurant not found" });

  if (event.httpMethod === "GET") {
    const [plans, subscription, usage, products, campaigns] = await Promise.all([
      adminSupabase.from("foodiz_plus_plans").select("*").eq("is_active", true).order("monthly_price_cents"),
      getActiveSubscription(restaurant.id),
      campaignUsage(restaurant.id),
      adminSupabase.from("products").select("id,name,category,partner_price_cents").eq("restaurant_id", restaurant.id).eq("is_active", true).order("name"),
      adminSupabase.from("marketing_campaigns").select("id,title,description,status,target_city,target_audience,recipient_count,opened_count,clicked_count,converted_orders_count,created_at,sent_at").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(30),
    ]);
    return json(200, { restaurant, plans: plans.data || [], subscription, usage, products: products.data || [], campaigns: campaigns.data || [] });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" });

  try {
    const body = JSON.parse(event.body || "{}") as { action?: string; productId?: string; city?: string; audience?: string; title?: string; message?: string; templateKey?: string };
    const { data: product } = await adminSupabase.from("products").select("id,name,category").eq("id", body.productId || "").eq("restaurant_id", restaurant.id).eq("is_active", true).maybeSingle();
    if (!product) return json(400, { error: "Invalid product" });
    const city = (body.city || restaurant.city || "votre ville").trim();
    const context = { product: product.name, restaurant: restaurant.name, city };

    if (body.action === "generate") {
      const seed = `${product.id}:${city}:${body.audience || "all_customers"}`;
      const start = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % templates.length;
      const suggestions = [0, 1, 2].map((offset) => templates[(start + offset) % templates.length]).map((template) => ({ key: template.key, title: render(template.title, context), message: render(template.message, context) }));
      const estimatedRecipients = await selectAudience(restaurant.id, city, body.audience || "all_customers");
      return json(200, { suggestions, estimatedRecipientCount: estimatedRecipients.length });
    }

    if (body.action !== "send") return json(400, { error: "Invalid action" });
    const subscription = await getActiveSubscription(restaurant.id);
    if (!subscription?.plan) return json(402, { error: "ACTIVE_SUBSCRIPTION_REQUIRED" });
    const usage = await campaignUsage(restaurant.id);
    const plan = subscription.plan as any;
    if (usage.monthly >= plan.monthly_campaign_limit) return json(409, { error: "MONTHLY_QUOTA_REACHED" });
    if (usage.weekly >= plan.weekly_campaign_limit) return json(409, { error: "WEEKLY_QUOTA_REACHED" });
    if (!body.title?.trim() || !body.message?.trim()) return json(400, { error: "Missing campaign content" });

    const audience = body.audience || "all_customers";
    const recipientIds = await selectAudience(restaurant.id, city, audience);
    const now = new Date().toISOString();
    const { data: campaign, error: campaignError } = await adminSupabase.from("marketing_campaigns").insert({
      restaurant_id: restaurant.id, product_id: product.id, title: body.title.trim().slice(0, 90), description: body.message.trim().slice(0, 240),
      start_date: now, end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), is_active: true, target_city: city,
      target_audience: audience, template_key: body.templateKey || null, status: "sending", subscription_id: subscription.id,
    }).select("id,title,description").single();
    if (campaignError || !campaign) throw campaignError || new Error("Campaign creation failed");

    let delivered = 0;
    for (const userId of recipientIds) {
      const { data: notification, error } = await adminSupabase.from("notifications").insert({ user_id: userId, title: campaign.title, message: campaign.description, type: "marketing", link: `/client/establishments/${restaurant.id}` }).select("id").single();
      if (!error && notification) {
        await adminSupabase.from("marketing_campaign_deliveries").insert({ campaign_id: campaign.id, user_id: userId, notification_id: notification.id });
        delivered += 1;
      }
    }

    await adminSupabase.from("marketing_campaigns").update({ status: "sent", sent_at: now, recipient_count: delivered }).eq("id", campaign.id);
    return json(200, { campaignId: campaign.id, recipientCount: delivered, usage: { monthly: usage.monthly + 1, weekly: usage.weekly + 1 } });
  } catch (error) {
    console.error("Foodiz+ campaign error", error);
    return json(500, { error: "Campaign operation failed" });
  }
};

export { handler };
