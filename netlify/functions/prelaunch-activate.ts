import type { Handler } from "@netlify/functions";
import { adminSupabase, appIsLaunched } from "./_lib/auth.js";
import { sha256 } from "./_lib/prelaunch.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!(await appIsLaunched())) {
    return {
      statusCode: 423,
      body: JSON.stringify({ error: "L’accès Weello n’est pas encore ouvert." }),
    };
  }

  let token = "";
  try {
    token = String(JSON.parse(event.body || "{}").token || "").trim();
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Lien d’activation invalide." }) };
  }
  if (token.length < 32) {
    return { statusCode: 400, body: JSON.stringify({ error: "Lien d’activation invalide." }) };
  }

  const { data: profile } = await adminSupabase
    .from("prelaunch_profiles")
    .select("id,user_id,role,status,launch_token_expires_at")
    .eq("launch_token", sha256(token))
    .maybeSingle();

  if (!profile || !profile.launch_token_expires_at) {
    return { statusCode: 404, body: JSON.stringify({ error: "Ce lien d’activation est invalide." }) };
  }
  if (profile.status === "activated") {
    const loginRole = profile.role === "livreur" ? "courier" : profile.role === "partenaire" ? "partner" : "client";
    return {
      statusCode: 200,
      body: JSON.stringify({ activated: true, loginPath: `/auth/login?role=${loginRole}` }),
    };
  }
  if (new Date(profile.launch_token_expires_at).getTime() <= Date.now()) {
    return { statusCode: 410, body: JSON.stringify({ error: "Ce lien a expiré. Demandez un nouvel accès à Weello." }) };
  }
  if (profile.status !== "launch_email_sent") {
    return { statusCode: 409, body: JSON.stringify({ error: "Ce compte ne peut pas encore être activé." }) };
  }

  const now = new Date().toISOString();
  const { error } = await adminSupabase
    .from("prelaunch_profiles")
    .update({
      status: "activated",
      activated_at: now,
      launch_token: null,
      launch_token_expires_at: null,
    })
    .eq("id", profile.id)
    .eq("status", "launch_email_sent");
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "L’activation a échoué." }) };
  }

  const { data: authUser } = await adminSupabase.auth.admin.getUserById(profile.user_id);
  await adminSupabase.auth.admin.updateUserById(profile.user_id, {
    user_metadata: {
      ...(authUser.user?.user_metadata || {}),
      prelaunch: false,
      activated_at: now,
    },
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      activated: true,
      message: "Votre accès Weello est activé. Vous pouvez maintenant vous connecter.",
      loginPath: `/auth/login?role=${profile.role === "livreur" ? "courier" : profile.role === "partenaire" ? "partner" : "client"}`,
    }),
  };
};

export { handler };
