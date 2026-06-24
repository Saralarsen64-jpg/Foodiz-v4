import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

type OfferTemplate = {
  template_key: string;
  title: string;
  description: string;
  points_cost: number;
  face_value_cents: number;
  minimum_order_cents: number;
  category: "all" | "restaurant" | "market";
  reward_type: "fixed_discount" | "free_delivery" | "free_item";
  eligible_products: string[];
  eligible_establishments: string[];
};

const templates: Record<number, Omit<OfferTemplate, "points_cost" | "face_value_cents" | "eligible_products" | "eligible_establishments">[]> = {
  250: [
    { template_key: "250-drink", title: "Boisson offerte", description: "Une boisson offerte dans la limite de 2,50 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "250-produce", title: "2,50 € sur vos fruits et légumes", description: "Une réduction sur votre sélection de fruits et légumes dès 10 € d'achat.", minimum_order_cents: 1000, category: "market", reward_type: "fixed_discount" },
    { template_key: "250-groceries", title: "2,50 € sur vos courses", description: "Une réduction sur vos courses dès 15 € d'achat.", minimum_order_cents: 1500, category: "market", reward_type: "fixed_discount" },
    { template_key: "250-service", title: "Frais de service offerts", description: "Vos frais de service sont offerts dans la limite de 2,50 €.", minimum_order_cents: 0, category: "all", reward_type: "fixed_discount" },
    { template_key: "250-dessert", title: "Dessert offert", description: "Un dessert offert dans la limite de 2,50 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
  ],
  500: [
    { template_key: "500-groceries", title: "5 € sur vos courses", description: "Une réduction sur vos courses dès 12 € d'achat.", minimum_order_cents: 1200, category: "market", reward_type: "fixed_discount" },
    { template_key: "500-market", title: "5 € sur le Market", description: "Une réduction sur votre commande Market dès 15 € d'achat.", minimum_order_cents: 1500, category: "market", reward_type: "fixed_discount" },
    { template_key: "500-restaurant", title: "5 € sur votre commande restaurant", description: "Une réduction sur votre commande restaurant dès 20 € d'achat.", minimum_order_cents: 2000, category: "restaurant", reward_type: "fixed_discount" },
    { template_key: "500-starter", title: "Entrée offerte", description: "Une entrée offerte dans la limite de 5 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "500-dessert", title: "Dessert offert", description: "Un dessert offert dans la limite de 5 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "500-kids", title: "Menu enfant offert", description: "Un menu enfant offert dans la limite de 5 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "500-delivery", title: "Livraison offerte", description: "Vos frais de livraison sont offerts dans la limite de 5 €.", minimum_order_cents: 0, category: "all", reward_type: "free_delivery" },
  ],
  800: [
    { template_key: "800-dessert", title: "Dessert offert", description: "Un dessert offert dans la limite de 8 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "800-groceries", title: "8 € sur vos courses", description: "Une réduction sur vos courses dès 25 € d'achat.", minimum_order_cents: 2500, category: "market", reward_type: "fixed_discount" },
    { template_key: "800-restaurant", title: "8 € sur votre commande restaurant", description: "Une réduction sur votre commande restaurant dès 30 € d'achat.", minimum_order_cents: 3000, category: "restaurant", reward_type: "fixed_discount" },
    { template_key: "800-market-item", title: "Produit Market offert", description: "Un produit Market offert dans la limite de 8 €.", minimum_order_cents: 0, category: "market", reward_type: "free_item" },
    { template_key: "800-pizza", title: "Pizza offerte", description: "Une pizza offerte dans la limite de 8 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "800-salad", title: "Salade offerte", description: "Une salade offerte dans la limite de 8 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
  ],
  1000: [
    { template_key: "1000-groceries", title: "10 € sur vos courses", description: "Une réduction sur vos courses dès 35 € d'achat.", minimum_order_cents: 3500, category: "market", reward_type: "fixed_discount" },
    { template_key: "1000-restaurant", title: "10 € sur votre commande restaurant", description: "Une réduction sur votre commande restaurant dès 40 € d'achat.", minimum_order_cents: 4000, category: "restaurant", reward_type: "fixed_discount" },
    { template_key: "1000-menu", title: "Menu offert", description: "Un menu offert dans la limite de 10 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "1000-market-item", title: "Produit Market offert", description: "Un produit Market offert dans la limite de 10 €.", minimum_order_cents: 0, category: "market", reward_type: "free_item" },
    { template_key: "1000-delivery-48h", title: "Livraison gratuite pendant 48 h", description: "Vos livraisons sont offertes pendant 48 h, dans la limite totale de 10 €.", minimum_order_cents: 0, category: "all", reward_type: "free_delivery" },
  ],
  1500: [
    { template_key: "1500-menu", title: "Menu offert", description: "Un menu offert dans la limite de 15 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "1500-groceries", title: "15 € sur vos courses", description: "Une réduction sur vos courses dès 50 € d'achat.", minimum_order_cents: 5000, category: "market", reward_type: "fixed_discount" },
    { template_key: "1500-restaurant", title: "15 € sur votre commande restaurant", description: "Une réduction sur votre commande restaurant dès 60 € d'achat.", minimum_order_cents: 6000, category: "restaurant", reward_type: "fixed_discount" },
    { template_key: "1500-fruit", title: "Panier de fruits offert", description: "Un panier de fruits offert dans la limite de 15 €.", minimum_order_cents: 0, category: "market", reward_type: "free_item" },
    { template_key: "1500-treats", title: "Pack gourmandises offert", description: "Un pack de gourmandises offert dans la limite de 15 €.", minimum_order_cents: 0, category: "market", reward_type: "free_item" },
  ],
  2000: [
    { template_key: "2000-groceries", title: "20 € sur vos courses", description: "Une réduction sur vos courses dès 80 € d'achat.", minimum_order_cents: 8000, category: "market", reward_type: "fixed_discount" },
    { template_key: "2000-restaurant", title: "20 € sur votre commande restaurant", description: "Une réduction sur votre commande restaurant dès 80 € d'achat.", minimum_order_cents: 8000, category: "restaurant", reward_type: "fixed_discount" },
    { template_key: "2000-premium", title: "Menu premium offert", description: "Un menu premium offert dans la limite de 20 €.", minimum_order_cents: 0, category: "restaurant", reward_type: "free_item" },
    { template_key: "2000-market-item", title: "Produit Market offert", description: "Un produit Market offert dans la limite de 20 €.", minimum_order_cents: 0, category: "market", reward_type: "free_item" },
    { template_key: "2000-delivery-7d", title: "Livraison gratuite pendant 7 jours", description: "Vos livraisons sont offertes pendant 7 jours, dans la limite totale de 20 €.", minimum_order_cents: 0, category: "all", reward_type: "free_delivery" },
  ],
};

const handler: Handler = async (event) => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return { statusCode: 405, body: "Method Not Allowed" };
  const cronSecret = process.env.CRON_SECRET;
  const authorizedCron = Boolean(cronSecret && event.headers.authorization === `Bearer ${cronSecret}`);
  const user = authorizedCron ? null : await authenticatedUser(event.headers);
  if (!authorizedCron && !user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { data: recent } = await adminSupabase.from("advantage_catalog").select("template_key,points_cost").order("created_at", { ascending: false }).limit(18);
  const recentByTier = new Map<number, Set<string>>();
  for (const row of recent || []) {
    if (!recentByTier.has(row.points_cost)) recentByTier.set(row.points_cost, new Set());
    if (row.template_key) recentByTier.get(row.points_cost)?.add(row.template_key);
  }

  const cycleNumber = Math.floor(Date.now() / (48 * 60 * 60 * 1000));
  const proposals: OfferTemplate[] = Object.entries(templates).map(([tierText, options], tierIndex) => {
    const tier = Number(tierText);
    const recentKeys = recentByTier.get(tier) || new Set<string>();
    const available = options.filter((option) => !recentKeys.has(option.template_key));
    const pool = available.length ? available : options;
    const selected = pool[(cycleNumber + tierIndex) % pool.length];
    return { ...selected, points_cost: tier, face_value_cents: tier, eligible_products: [], eligible_establishments: [] };
  });

  const { data: cycleId, error } = await adminSupabase.rpc("publish_foodiz_advantage_cycle", { proposals });
  if (error) {
    console.error("Advantage cycle publication failed", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Le cycle d’avantages n’a pas pu être publié." }) };
  }

  const { data: currentCycle } = await adminSupabase
    .from("advantage_catalog")
    .select("cycle_id,valid_until")
    .eq("source", "rules_engine")
    .eq("is_active", true)
    .gt("valid_until", new Date().toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!currentCycle?.cycle_id) return { statusCode: 503, body: JSON.stringify({ error: "No active advantage cycle" }) };

  const { data: offers, error: offersError } = await adminSupabase
    .from("advantage_catalog")
    .select("id,cycle_id,template_key,title,description,points_cost,face_value_cents,minimum_order_cents,category,reward_type,valid_until,generated_at")
    .eq("cycle_id", currentCycle.cycle_id)
    .eq("is_active", true)
    .order("points_cost");
  if (offersError) {
    console.error("Advantage offers retrieval failed", offersError);
    return { statusCode: 500, body: JSON.stringify({ error: "Les avantages n’ont pas pu être chargés." }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ rotated: Boolean(cycleId), cycleId: currentCycle.cycle_id, validUntil: currentCycle.valid_until, offers: offers || [] }),
  };
};

export { handler };
