import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

type Role = "partner" | "courier";

type Diagnostic = {
  resolved: boolean;
  priority: "normal" | "high" | "urgent";
  title: string;
  explanation: string;
  action?: { label: string; path: string };
  attempted: string[];
  context: Record<string, unknown>;
};

const response = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method Not Allowed" });

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return response(401, { error: "Unauthorized" });

    const body = JSON.parse(event.body || "{}") as { role?: Role; category?: string; orderId?: string };
    if (!body.role || !body.category || !["partner", "courier"].includes(body.role)) {
      return response(400, { error: "Invalid diagnostic request" });
    }

    const { data: profile } = await adminSupabase.from("profiles").select("role,courier_online,status").eq("id", user.id).single();
    if (!profile || profile.role !== body.role) return response(403, { error: "Forbidden" });

    let diagnostic: Diagnostic;

    if (body.role === "partner") {
      const [{ data: restaurant }, { data: application }, { data: bank }] = await Promise.all([
        adminSupabase.from("restaurants").select("id,name,status,is_active,address,city").eq("owner_id", user.id).maybeSingle(),
        adminSupabase.from("partner_applications").select("status,rejection_reason,updated_at").eq("user_id", user.id).maybeSingle(),
        adminSupabase.from("bank_accounts").select("id,iban,holder_name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (!restaurant) {
        diagnostic = { resolved: false, priority: "high", title: "Établissement introuvable", explanation: "Votre compte partenaire ne semble pas encore rattaché à un établissement. L'équipe doit vérifier votre dossier.", action: { label: "Voir mon dossier", path: "/partner/validation-status" }, attempted: ["Rattachement de l'établissement vérifié"], context: { application_status: application?.status || null } };
      } else if (body.category === "order") {
        if (!body.orderId) return response(400, { error: "Missing order ID" });
        const { data: order } = await adminSupabase.from("orders").select("id,status,payment_status,updated_at,created_at").eq("id", body.orderId).eq("restaurant_id", restaurant.id).maybeSingle();
        if (!order) return response(404, { error: "Order not found" });
        const ageMinutes = (Date.now() - new Date(order.updated_at || order.created_at).getTime()) / 60000;
        if (order.payment_status === "failed") diagnostic = { resolved: false, priority: "high", title: "Paiement non confirmé", explanation: "Cette commande ne possède pas de paiement confirmé. Ne préparez pas la commande avant régularisation.", attempted: ["Paiement et propriété de la commande vérifiés"], context: { order_status: order.status, payment_status: order.payment_status, age_minutes: Math.round(ageMinutes) } };
        else if (["pending", "preparing", "ready"].includes(order.status) && ageMinutes > 60) diagnostic = { resolved: false, priority: "urgent", title: "Commande active sans évolution", explanation: "La dernière mise à jour dépasse une heure. Le support recevra automatiquement son statut et son ancienneté.", action: { label: "Ouvrir la commande", path: `/partner/orders/${order.id}` }, attempted: ["Statut, paiement et ancienneté contrôlés"], context: { order_status: order.status, payment_status: order.payment_status, age_minutes: Math.round(ageMinutes) } };
        else diagnostic = { resolved: true, priority: "normal", title: `Commande ${order.status}`, explanation: "La commande est bien rattachée à votre établissement. Son détail contient les actions actuellement autorisées.", action: { label: "Ouvrir la commande", path: `/partner/orders/${order.id}` }, attempted: ["Statut, paiement et propriété de la commande vérifiés"], context: { order_status: order.status, payment_status: order.payment_status, age_minutes: Math.round(ageMinutes) } };
      } else if (body.category === "menu") {
        const { data: products } = await adminSupabase.from("products").select("id,is_active,image_url,description").eq("restaurant_id", restaurant.id);
        const list = products || [];
        const active = list.filter((product) => product.is_active).length;
        const incomplete = list.filter((product) => !product.image_url || !product.description).length;
        diagnostic = list.length === 0
          ? { resolved: true, priority: "normal", title: "Votre carte est vide", explanation: "Ajoutez votre premier produit pour rendre votre offre visible aux clients.", action: { label: "Ajouter un produit", path: "/partner/products/new" }, attempted: ["Produits de l'établissement comptés"], context: { products: 0, active_products: 0 } }
          : { resolved: true, priority: "normal", title: `${active} produit${active > 1 ? "s" : ""} actif${active > 1 ? "s" : ""}`, explanation: incomplete ? `${incomplete} produit(s) gagneraient à recevoir une image ou une description complète.` : "Les produits actifs disposent tous d'une image et d'une description.", action: { label: "Gérer ma carte", path: "/partner/menu" }, attempted: ["Produits actifs et fiches incomplètes vérifiés"], context: { products: list.length, active_products: active, incomplete_products: incomplete } };
      } else if (body.category === "payout") {
        const complete = Boolean(bank?.iban && bank?.holder_name);
        diagnostic = { resolved: true, priority: "normal", title: complete ? "Coordonnées de versement enregistrées" : "Coordonnées de versement incomplètes", explanation: complete ? "Votre IBAN et le titulaire sont enregistrés. Les virements automatiques resteront indisponibles jusqu'à l'activation de Stripe Connect." : "Ajoutez un IBAN et le nom du titulaire. Aucun virement automatique n'est encore déclenché par Foodiz.", action: { label: complete ? "Voir mes revenus" : "Compléter mes informations", path: complete ? "/partner/revenues" : "/partner/settings" }, attempted: ["Présence des coordonnées de versement vérifiée", "Disponibilité des virements automatiques contrôlée"], context: { bank_account_complete: complete, automatic_payouts_enabled: false } };
      } else {
        diagnostic = { resolved: true, priority: "normal", title: "Compte partenaire opérationnel", explanation: `Votre établissement ${restaurant.name} est ${restaurant.is_active ? "actif" : "actuellement inactif"}. Vous pouvez modifier ses informations depuis les paramètres.`, action: { label: "Ouvrir les paramètres", path: "/partner/settings" }, attempted: ["État du compte et de l'établissement vérifié"], context: { restaurant_status: restaurant.status, restaurant_active: restaurant.is_active, application_status: application?.status || null } };
      }
    } else {
      const [{ data: application }, { data: bank }] = await Promise.all([
        adminSupabase.from("courier_applications").select("status,updated_at").eq("user_id", user.id).maybeSingle(),
        adminSupabase.from("bank_accounts").select("id,iban,holder_name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (body.category === "delivery") {
        if (!body.orderId) return response(400, { error: "Missing order ID" });
        const [{ data: order }, { data: tracking }] = await Promise.all([
          adminSupabase.from("orders").select("id,status,updated_at,created_at").eq("id", body.orderId).eq("courier_id", user.id).maybeSingle(),
          adminSupabase.from("delivery_tracking").select("status,current_latitude,current_longitude,updated_at").eq("order_id", body.orderId).eq("courier_id", user.id).maybeSingle(),
        ]);
        if (!order) return response(404, { error: "Delivery not found" });
        const latestUpdate = tracking?.updated_at || order.updated_at || order.created_at;
        const ageMinutes = (Date.now() - new Date(latestUpdate).getTime()) / 60000;
        const stale = ["pickup", "picked_up", "delivering", "in_transit"].includes(order.status) && ageMinutes > 45;
        diagnostic = stale
          ? { resolved: false, priority: "urgent", title: "Suivi de livraison trop ancien", explanation: "La dernière position ou étape dépasse 45 minutes. Vérifiez votre connexion et transmettez la situation au support si la mise à jour reste impossible.", action: { label: "Ouvrir le suivi", path: `/courier/deliveries/${order.id}/tracking` }, attempted: ["Affectation, statut et fraîcheur du suivi vérifiés"], context: { order_status: order.status, tracking_status: tracking?.status || null, tracking_age_minutes: Math.round(ageMinutes), has_coordinates: Boolean(tracking?.current_latitude && tracking?.current_longitude) } }
          : { resolved: true, priority: "normal", title: `Livraison ${order.status}`, explanation: tracking ? "Le suivi est bien rattaché à cette course. Continuez à valider chaque étape depuis l'écran de livraison." : "La course est bien affectée. Ouvrez-la pour initialiser ou poursuivre le suivi.", action: { label: "Ouvrir la livraison", path: `/courier/deliveries/${order.id}` }, attempted: ["Affectation, statut et suivi de livraison vérifiés"], context: { order_status: order.status, tracking_status: tracking?.status || null, tracking_age_minutes: Math.round(ageMinutes) } };
      } else if (body.category === "payout") {
        const { data: delivered } = await adminSupabase.from("orders").select("delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,courier_delay_penalty_cents").eq("courier_id", user.id).eq("status", "delivered");
        const totalCents = (delivered || []).reduce((sum, order) => sum + (order.delivery_fee_cents || 0) + (order.courier_earnings_cents || 0) + (order.courier_prime_fund_cents || 0) - (order.courier_delay_penalty_cents || 0), 0);
        const complete = Boolean(bank?.iban && bank?.holder_name);
        diagnostic = { resolved: true, priority: "normal", title: `${(totalCents / 100).toFixed(2)} € de gains enregistrés`, explanation: complete ? "Vos coordonnées sont enregistrées. Les virements automatiques resteront indisponibles jusqu'à l'activation de Stripe Connect." : "Complétez vos coordonnées de versement. Les virements automatiques ne sont pas encore activés.", action: { label: complete ? "Voir mes gains" : "Compléter mon IBAN", path: complete ? "/courier/revenues" : "/courier/settings" }, attempted: ["Gains livrés et coordonnées de versement vérifiés"], context: { delivered_orders: delivered?.length || 0, recorded_earnings_cents: totalCents, bank_account_complete: complete, automatic_payouts_enabled: false } };
      } else if (body.category === "availability") {
        const { data: activeOrder } = await adminSupabase.from("orders").select("id,status").eq("courier_id", user.id).in("status", ["pickup", "picked_up", "delivering", "in_transit"]).limit(1).maybeSingle();
        diagnostic = activeOrder
          ? { resolved: true, priority: "normal", title: "Une livraison est déjà en cours", explanation: "Terminez cette course avant d'en accepter une autre.", action: { label: "Reprendre la livraison", path: `/courier/deliveries/${activeOrder.id}` }, attempted: ["Disponibilité et course active vérifiées"], context: { courier_online: profile.courier_online, active_order_id: activeOrder.id, active_order_status: activeOrder.status } }
          : { resolved: true, priority: "normal", title: profile.courier_online ? "Vous êtes disponible" : "Vous êtes actuellement hors ligne", explanation: profile.courier_online ? "Les courses disponibles peuvent apparaître dans votre tableau de bord." : "Passez en ligne depuis l'accueil pour recevoir les prochaines courses.", action: { label: "Retour au tableau de bord", path: "/courier" }, attempted: ["Statut de disponibilité et course active vérifiés"], context: { courier_online: profile.courier_online, active_order_id: null } };
      } else {
        diagnostic = { resolved: true, priority: "normal", title: "Compte livreur vérifié", explanation: `Votre dossier est ${application?.status || "sans statut"}. Les informations personnelles et bancaires peuvent être mises à jour depuis votre profil.`, action: { label: "Ouvrir mes paramètres", path: "/courier/settings" }, attempted: ["Rôle, dossier et état du compte vérifiés"], context: { application_status: application?.status || null, profile_status: profile.status } };
      }
    }

    return response(200, { diagnostic });
  } catch (error) {
    console.error("Support diagnostic failed", error);
    return response(500, { error: "Diagnostic failed" });
  }
};

export { handler };
