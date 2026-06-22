import type { Handler } from "@netlify/functions";
import { adminSupabase, appIsLaunched } from "./_lib/auth.js";
import {
  cleanText,
  createLaunchToken,
  normalizeEmail,
  normalizeFoodizPhone,
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
  const submittedPhone = cleanText(input.phone, 30);
  const phone = normalizeFoodizPhone(submittedPhone);
  const city = cleanText(input.city, 100);
  const password = String(input.password || "");
  const passwordConfirmation = String(input.passwordConfirmation || "");
  const marketingConsent = input.marketingConsent === true;

  if (!roleToAuthRole[role]) {
    return { statusCode: 400, body: JSON.stringify({ error: "Rôle invalide." }) };
  }
  if (!firstName || !lastName || !city || !validEmail.test(email) || !phone) {
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
  const siret = cleanText(input.siret, 20).replace(/\s+/g, "");
  const vehicleType = cleanText(input.vehicleType, 30);
  const availability = cleanText(input.availability, 30);
  const address = cleanText(input.address, 180);
  const postalCode = cleanText(input.postalCode, 10);

  if (role === "partenaire" && (
    !establishmentName
    || !["restaurant", "market", "epicerie", "autre"].includes(establishmentType)
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Complétez les informations de votre établissement." }) };
  }
  if (role === "livreur" && (
    !/^[0-9]{14}$/.test(siret)
    || !address
    || !/^[0-9]{5}$/.test(postalCode)
    || !["velo", "scooter", "voiture", "autre"].includes(vehicleType)
    || !["journee", "soiree", "nuit", "week_end"].includes(availability)
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Renseignez un SIRET valide, votre adresse professionnelle, votre véhicule et vos disponibilités." }) };
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

  if (role === "client" || role === "livreur") {
    const authRole = roleToAuthRole[role];
    const [{ data: existingProfile }, { data: existingPrelaunch }] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id")
        .eq("phone_normalized", phone)
        .in("role", ["client", "courier"])
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("prelaunch_profiles")
        .select("id")
        .eq("phone_normalized", phone)
        .in("role", ["client", "livreur"])
        .limit(1)
        .maybeSingle(),
    ]);
    if (existingProfile || existingPrelaunch) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Ce numéro de téléphone est déjà associé à un compte Foodiz." }),
      };
    }
    if (!authRole) {
      return { statusCode: 400, body: JSON.stringify({ error: "Rôle invalide." }) };
    }
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
      siret: role === "partenaire" || role === "livreur" ? siret || undefined : undefined,
      cgu_accepted: true,
      prelaunch: true,
    },
  });

  if (authError || !authData.user) {
    const duplicate = authError?.message.toLowerCase().includes("already");
    const duplicatePhone = authError?.message.toLowerCase().includes("phone")
      || authError?.message.toLowerCase().includes("duplicate key");
    return {
      statusCode: duplicate || duplicatePhone ? 409 : 500,
      body: JSON.stringify({
        error: duplicatePhone
          ? "Ce numéro de téléphone est déjà associé à un compte Foodiz."
          : duplicate
            ? "Cette adresse possède déjà un compte Foodiz."
            : "Impossible de créer votre pré-inscription.",
      }),
    };
  }

  const userId = authData.user.id;
  const courierUploadToken = role === "livreur" ? createLaunchToken() : null;
  const courierUploadTokenExpiresAt = role === "livreur"
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;
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
        siret,
        legal_name: `${firstName} ${lastName}`.trim(),
        address,
        postal_code: postalCode,
        vehicle_type: vehicleType,
        availability,
        document_review_status: "documents_required",
        document_upload_token_hash: courierUploadToken?.hash,
        document_upload_token_expires_at: courierUploadTokenExpiresAt,
      });
      if (error) throw error;

      const { error: applicationError } = await adminSupabase
        .from("courier_applications")
        .update({
          legal_name: `${firstName} ${lastName}`.trim(),
          siret,
          address,
          postal_code: postalCode,
          city,
          vehicle_type: vehicleType,
          status: "pending",
          document_review_status: "documents_required",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      if (applicationError) throw applicationError;
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
      body: role === "livreur"
        ? "Votre compte livreur est créé. Votre accès aux courses restera bloqué jusqu’à la validation de vos justificatifs par Foodiz."
        : "Votre pré-inscription est bien enregistrée. Vous recevrez votre accès dès le lancement officiel de Foodiz.",
    });
  } catch (error) {
    console.error("Prelaunch confirmation email failed:", error);
  }

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registered: true,
      courierDocumentUploadToken: courierUploadToken?.raw,
      courierDocumentUploadExpiresAt: courierUploadTokenExpiresAt,
      message: role === "livreur"
        ? "Votre compte est créé. Transmettez maintenant vos trois justificatifs obligatoires."
        : "Votre pré-inscription est bien enregistrée. Vous recevrez votre accès dès le lancement officiel de Foodiz.",
    }),
  };
};

export { handler };
