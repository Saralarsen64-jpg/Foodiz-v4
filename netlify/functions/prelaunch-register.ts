import type { Handler } from "@netlify/functions";
import { adminSupabase, appIsLaunched } from "./_lib/auth.js";
import {
  cleanText,
  normalizeEmail,
  requestFingerprint,
  sendPrelaunchEmail,
  sha256,
} from "./_lib/prelaunch.js";

type PublicRole = "client" | "livreur" | "partenaire";

const roleToAuthRole: Record<PublicRole, "client" | "courier" | "partner"> = {
  client: "client",
  livreur: "courier",
  partenaire: "partner",
};

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validPhone = /^[+()\d\s.-]{8,24}$/;

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (await appIsLaunched()) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: "Foodiz est lancé. Utilisez désormais l’inscription classique." }),
    };
  }

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Requête invalide." }) };
  }

  // Invisible honeypot: legitimate clients never fill this value.
  if (cleanText(input.companyWebsite)) {
    return { statusCode: 200, body: JSON.stringify({ registered: true }) };
  }

  const role = cleanText(input.role) as PublicRole;
  const firstName = cleanText(input.firstName, 80);
  const lastName = cleanText(input.lastName, 80);
  const email = normalizeEmail(input.email);
  const phone = cleanText(input.phone, 30);
  const city = cleanText(input.city, 100);
  const password = String(input.password || "");
  const passwordConfirmation = String(input.passwordConfirmation || "");
  const marketingConsent = input.marketingConsent === true;

  if (!roleToAuthRole[role]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Rôle invalide." }) };
  }
  if (!firstName || !lastName || !city || !validEmail.test(email) || !validPhone.test(phone)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Vérifiez vos informations personnelles." }) };
  }
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre." }),
    };
  }
  if (password !== passwordConfirmation) {
    return { statusCode: 400, body: JSON.stringify({ error: "Les mots de passe ne correspondent pas." }) };
  }
  if (!marketingConsent) {
    return { statusCode: 400, body: JSON.stringify({ error: "Votre consentement est requis pour rejoindre la liste d’attente." }) };
  }

  const establishmentName = cleanText(input.establishmentName, 140);
  const establishmentType = cleanText(input.establishmentType, 30);
  const siret = cleanText(input.siret, 20);
  const vehicleType = cleanText(input.vehicleType, 30);
  const availability = cleanText(input.availability, 30);

  if (role === "partenaire" && (
    !establishmentName
    || !["restaurant", "market", "epicerie", "autre"].includes(establishmentType)
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Complétez les informations de votre établissement." }) };
  }
  if (role === "livreur" && (
    !["velo", "scooter", "voiture", "autre"].includes(vehicleType)
    || !["journee", "soiree", "nuit", "week_end"].includes(availability)
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Complétez votre véhicule et vos disponibilités." }) };
  }

  const fingerprint = requestFingerprint(event.headers);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminSupabase
    .from("prelaunch_registration_attempts")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint_hash", fingerprint)
    .gte("created_at", oneHourAgo);
  if ((count || 0) >= 5) {
    return { statusCode: 429, body: JSON.stringify({ error: "Trop de tentatives. Réessayez dans une heure." }) };
  }
  await adminSupabase.from("prelaunch_registration_attempts").insert({
    fingerprint_hash: fingerprint,
    email_hash: sha256(email),
  });

  const { data: existing } = await adminSupabase
    .from("prelaunch_profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return { statusCode: 409, body: JSON.stringify({ error: "Cette adresse est déjà pré-inscrite." }) };
  }

  const authRole = roleToAuthRole[role];
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: authRole,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      phone,
      city,
      business_name: role === "partenaire" ? establishmentName : undefined,
      siret: role === "partenaire" ? siret || undefined : undefined,
      cgu_accepted: true,
      prelaunch: true,
    },
  });

  if (authError || !authData.user) {
    const duplicate = authError?.message.toLowerCase().includes("already");
    return {
      statusCode: duplicate ? 409 : 500,
      body: JSON.stringify({ error: duplicate ? "Cette adresse possède déjà un compte Foodiz." : "Impossible de créer votre pré-inscription." }),
    };
  }

  const userId = authData.user.id;
  try {
    const { data: profile, error: profileError } = await adminSupabase
      .from("prelaunch_profiles")
      .insert({
        user_id: userId,
        role,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        city,
        marketing_consent: true,
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (profileError || !profile) throw profileError || new Error("Prelaunch profile creation failed");

    if (role === "partenaire") {
      const { error } = await adminSupabase.from("prelaunch_partner_details").insert({
        prelaunch_profile_id: profile.id,
        establishment_name: establishmentName,
        establishment_type: establishmentType,
        siret: siret || null,
      });
      if (error) throw error;
    }

    if (role === "livreur") {
      const { error } = await adminSupabase.from("prelaunch_driver_details").insert({
        prelaunch_profile_id: profile.id,
        vehicle_type: vehicleType,
        availability,
      });
      if (error) throw error;
    }
  } catch (error) {
    await adminSupabase.auth.admin.deleteUser(userId);
    console.error("Prelaunch registration rollback:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Votre pré-inscription n’a pas pu être enregistrée." }) };
  }

  try {
    await sendPrelaunchEmail({
      to: email,
      subject: "Votre pré-inscription Foodiz est confirmée",
      headline: `Bienvenue ${firstName}`,
      body: "Votre pré-inscription est bien enregistrée. Vous recevrez votre accès dès le lancement officiel de Foodiz.",
    });
  } catch (error) {
    console.error("Prelaunch confirmation email failed:", error);
  }

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registered: true,
      message: "Votre pré-inscription est bien enregistrée. Vous recevrez votre accès dès le lancement officiel de Foodiz.",
    }),
  };
};

export { handler };
