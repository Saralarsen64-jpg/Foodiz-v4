import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "admin") {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Ce compte ne peut pas être supprimé depuis l’application." }),
    };
  }

  const { count: activeOrderCount } = await adminSupabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .or(`client_id.eq.${user.id},courier_id.eq.${user.id}`)
    .not("status", "in", "(delivered,cancelled)");
  if ((activeOrderCount || 0) > 0) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: "Terminez ou annulez la commande en cours avant de supprimer le compte.",
      }),
    };
  }

  if (profile.role === "partner") {
    const { data: restaurants } = await adminSupabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id);
    const restaurantIds = (restaurants || []).map((restaurant) => restaurant.id);
    if (restaurantIds.length) {
      const { count } = await adminSupabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("restaurant_id", restaurantIds)
        .not("status", "in", "(delivered,cancelled)");
      if ((count || 0) > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            error: "Traitez les commandes de l’établissement avant de supprimer le compte.",
          }),
        };
      }
      await adminSupabase
        .from("restaurants")
        .update({ is_active: false, status: "suspended" })
        .in("id", restaurantIds);
    }
  }

  if (profile.role === "courier") {
    await adminSupabase
      .from("courier_applications")
      .update({
        status: "rejected",
        document_review_comment: "Compte supprimé à la demande de l’utilisateur",
      })
      .eq("user_id", user.id);
  }

  const anonymizedEmail = `deleted-${user.id}@deleted.foodiz.invalid`;
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      email: anonymizedEmail,
      first_name: null,
      last_name: null,
      full_name: "Compte supprimé",
      phone: null,
      address: null,
      postal_code: null,
      city: null,
      latitude: null,
      longitude: null,
      avatar_url: null,
      status: "deleted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "La suppression n’a pas pu être finalisée." }),
    };
  }

  const { error: authError } = await adminSupabase.auth.admin.updateUserById(
    user.id,
    {
      email: anonymizedEmail,
      phone: undefined,
      password: crypto.randomUUID() + crypto.randomUUID(),
      ban_duration: "876000h",
      user_metadata: { deleted: true },
    },
  );
  if (authError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Le compte a été anonymisé mais sa fermeture doit être finalisée par le support." }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      deleted: true,
      retainedForLegalObligations: true,
    }),
  };
};

export { handler };
