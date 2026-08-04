import type { Handler } from "@netlify/functions";

import { adminSupabase } from "./_lib/auth.js";
import { geocodeAddress, RoutingProviderError } from "./_lib/routingProvider.js";
import {
  cleanText,
  createLaunchToken,
  normalizeEmail,
  normalizeWeelloPhone,
  requestFingerprint,
  sendPrelaunchEmail,
  sha256,
} from "./_lib/prelaunch.js";

type ProfessionalRole = "livreur" | "partenaire";

const roleToAuthRole = {
  livreur: "courier",
  partenaire: "partner",
} as const;

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validSlots = ["matin", "midi", "apres_midi", "soiree", "nuit", "week_end"];
const validDays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const validEstablishmentTypes = [
  "restaurant", "fast_food", "bakery", "pastry", "butcher", "caterer",
  "grocery", "greengrocer", "supermarket", "local_shop", "franchise",
  "national_brand", "other",
];

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function cleanStringArray(value: unknown, allowedValues: string[], maxItems: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((entry) => cleanText(entry, 30))
      .filter((entry) => allowedValues.includes(entry)),
  )).slice(0, maxItems);
}

function legacyAvailability(slots: string[], flexible: boolean) {
  if (slots.includes("week_end")) return "week_end";
  if (slots.includes("nuit")) return "nuit";
  if (slots.includes("soiree")) return "soiree";
  return flexible || slots.length > 0 ? "journee" : "";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  if (cleanText(input.companyWebsite)) return reply(200, { registered: true });

  const role = cleanText(input.role) as ProfessionalRole;
  const authRole = roleToAuthRole[role];
  const firstName = cleanText(input.firstName, 80);
  const lastName = cleanText(input.lastName, 80);
  const email = normalizeEmail(input.email);
  const phone = normalizeWeelloPhone(cleanText(input.phone, 30));
  const city = cleanText(input.city, 100);
  const address = cleanText(input.address, 180);
  const postalCode = cleanText(input.postalCode, 10);
  const siret = cleanText(input.siret, 20).replace(/\s+/g, "");
  const password = String(input.password || "");
  const passwordConfirmation = String(input.passwordConfirmation || "");
  const cguAccepted = input.cguAccepted === true;
  const marketingConsent = input.marketingConsent === true;

  if (!authRole) return reply(400, { error: "Rôle professionnel invalide." });
  if (!firstName || !lastName || !city || !validEmail.test(email) || !phone) {
    return reply(400, { error: "Vérifiez vos informations personnelles." });
  }
  if (!/^[0-9]{14}$/.test(siret) || !address || !/^[0-9]{5}$/.test(postalCode)) {
    return reply(400, { error: "Renseignez un SIRET français valide et une adresse professionnelle complète." });
  }
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return reply(400, { error: "Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre." });
  }
  if (password !== passwordConfirmation) {
    return reply(400, { error: "Les mots de passe ne correspondent pas." });
  }
  if (!cguAccepted) {
    return reply(400, { error: "Vous devez accepter les CGU et la politique de confidentialité." });
  }

  const establishmentName = cleanText(input.establishmentName, 140);
  const establishmentType = cleanText(input.establishmentType, 30);
  const handlesAnimalProducts = input.handlesAnimalProducts === true;
  const sellsAlcohol = input.sellsAlcohol === true;
  const requiresHygieneProof = input.requiresHygieneProof === true;
  const vehicleType = cleanText(input.vehicleType, 30);
  const availabilitySlots = cleanStringArray(input.availabilitySlots, validSlots, 6);
  const availabilityDays = cleanStringArray(input.availabilityDays, validDays, 7);
  const availabilityFlexible = input.availabilityFlexible === true;

  if (role === "partenaire" && (
    !establishmentName
    || !validEstablishmentTypes.includes(establishmentType)
  )) {
    return reply(400, { error: "Complétez le nom et le type de votre établissement." });
  }
  if (role === "livreur" && (
    !["velo", "scooter", "voiture", "autre"].includes(vehicleType)
    || (!availabilityFlexible && (availabilitySlots.length === 0 || availabilityDays.length === 0))
  )) {
    return reply(400, { error: "Renseignez votre véhicule, vos créneaux et vos jours de disponibilité." });
  }

  const fingerprint = requestFingerprint(event.headers);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await adminSupabase
    .from("prelaunch_registration_attempts")
    .select("id", { count: "exact", head: true })
    .eq("fingerprint_hash", fingerprint)
    .gte("created_at", oneHourAgo);
  if ((count || 0) >= 5) {
    return reply(429, { error: "Trop de tentatives. Réessayez dans une heure." });
  }
  await adminSupabase.from("prelaunch_registration_attempts").insert({
    fingerprint_hash: fingerprint,
    email_hash: sha256(email),
  });

  const [
    { data: existingEmail },
    { data: existingPhone },
    { data: partnerSiret },
    { data: courierSiret },
  ] = await Promise.all([
    adminSupabase.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle(),
    adminSupabase.from("profiles").select("id").eq("phone_normalized", phone).limit(1).maybeSingle(),
    adminSupabase.from("partner_applications").select("id").eq("siret", siret).limit(1).maybeSingle(),
    adminSupabase.from("courier_applications").select("id").eq("siret", siret).limit(1).maybeSingle(),
  ]);
  if (existingEmail) return reply(409, { error: "Cette adresse possède déjà un compte Weello." });
  if (existingPhone) return reply(409, { error: "Ce numéro de téléphone est déjà associé à un compte Weello." });
  if (partnerSiret || courierSiret) return reply(409, { error: "Ce SIRET est déjà associé à un dossier Weello." });

  // A mapping provider is useful to prepare a service area, but it must never
  // prevent a legitimate professional from filing a dossier. Coordinates stay
  // empty until the team checks the address when the provider cannot resolve it.
  let coordinates: { latitude: number; longitude: number } | null = null;
  try {
    const geocoded = await geocodeAddress(`${address}, ${postalCode} ${city}, France`);
    coordinates = { latitude: geocoded.latitude, longitude: geocoded.longitude };
  } catch (error) {
    // Certaines adresses professionnelles (zones d'activité, lieux-dits,
    // nouvelles voies) ne sont pas encore connues du fournisseur. Un second
    // essai sur la commune permet de créer le dossier ; l'adresse complète
    // reste ensuite contrôlée par l'équipe avant toute activation.
    if (error instanceof RoutingProviderError && error.code === "address_not_found") {
      try {
        const geocodedCity = await geocodeAddress(`${postalCode} ${city}, France`);
        coordinates = { latitude: geocodedCity.latitude, longitude: geocodedCity.longitude };
      } catch (fallbackError) {
        console.error("Professional registration geocoding fallback failed", fallbackError);
      }
    } else {
      console.error("Professional registration geocoding failed", error);
    }
  }

  const fullName = `${firstName} ${lastName}`.trim();
  // Creating a professional account must not depend on a confirmation-link
  // provider. The account remains pending and cannot operate until an admin
  // reviews its documents, while the person can immediately sign in to follow
  // their dossier.
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      // The database bootstrap has a legacy failure in its professional
      // branch. Create through its stable client branch, then assign the
      // professional role and dossier below with the service role.
      role: "client",
      professional_role: authRole,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      address,
      postal_code: postalCode,
      city,
      business_name: role === "partenaire" ? establishmentName : undefined,
      siret,
      cgu_accepted: true,
      marketing_consent: marketingConsent,
    },
  });
  if (authError || !authData.user) {
    console.error("Professional auth user creation failed", authError);
    const duplicate = authError?.message.toLowerCase().includes("already");
    return reply(duplicate ? 409 : 500, {
      error: duplicate
        ? "Cette adresse possède déjà un compte Weello."
        : "Impossible de créer votre compte professionnel.",
    });
  }

  const userId = authData.user.id;
  const uploadToken = createLaunchToken();
  const uploadTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    let serviceAreaId: string | null = null;
    if (coordinates) {
      const { data, error: serviceAreaError } = await adminSupabase.rpc(
        "ensure_service_area_server",
        {
          target_city: city,
          target_postal_code: postalCode,
          target_latitude: coordinates.latitude,
          target_longitude: coordinates.longitude,
        },
      );
      if (serviceAreaError || !data) {
        throw serviceAreaError || new Error("Service area creation failed");
      }
      serviceAreaId = data;
    }

    const now = new Date().toISOString();
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({
        role: authRole,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        address,
        postal_code: postalCode,
        city,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
        cgu_accepted: true,
        status: "pending",
        updated_at: now,
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    if (role === "partenaire") {
      const [{ error: applicationError }, { error: restaurantError }] = await Promise.all([
        adminSupabase
          .from("partner_applications")
          .upsert({
            user_id: userId,
            business_name: establishmentName,
            siret,
            phone,
            email,
            address,
            postal_code: postalCode,
            city,
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            service_area_id: serviceAreaId,
            establishment_type: establishmentType,
            handles_animal_products: handlesAnimalProducts,
            sells_alcohol: sellsAlcohol,
            requires_hygiene_proof: requiresHygieneProof,
            compliance_status: "documents_required",
            status: "pending",
            document_upload_token_hash: uploadToken.hash,
            document_upload_token_expires_at: uploadTokenExpiresAt,
            updated_at: now,
          }, { onConflict: "user_id" }),
        adminSupabase
          .from("restaurants")
          .insert({
            owner_id: userId,
            name: establishmentName,
            siret,
            phone,
            address,
            postal_code: postalCode,
            city,
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            service_area_id: serviceAreaId,
            status: "pending",
            is_active: false,
            updated_at: now,
          }),
      ]);
      if (applicationError || restaurantError) throw applicationError || restaurantError;
    } else {
      const { error: applicationError } = await adminSupabase
        .from("courier_applications")
        .upsert({
          user_id: userId,
          legal_name: fullName,
          siret,
          address,
          postal_code: postalCode,
          city,
          vehicle_type: vehicleType,
          availability_slots: availabilitySlots,
          availability_days: availabilityDays,
          availability_flexible: availabilityFlexible,
          service_area_id: serviceAreaId,
          status: "pending",
          document_review_status: "documents_required",
          identity_name_confirmed: false,
          business_identity_confirmed: false,
          document_upload_token_hash: uploadToken.hash,
          document_upload_token_expires_at: uploadTokenExpiresAt,
          updated_at: now,
        }, { onConflict: "user_id" });
      if (applicationError) throw applicationError;
    }

    await sendPrelaunchEmail({
      to: email,
      subject: "Votre compte professionnel Weello est créé",
      headline: "Votre dossier Weello est créé",
      body: [
        `Bonjour ${firstName}, votre compte ${role === "partenaire" ? "partenaire" : "livreur"} est créé et vos justificatifs vont être transmis pour vérification.`,
        coordinates ? "" : "Votre adresse professionnelle sera vérifiée par notre équipe avant toute activation.",
        "Vous pouvez vous connecter dès maintenant pour suivre l’avancement de votre dossier depuis votre espace Weello.",
      ],
      recipientUserId: userId,
      emailType: "professional_signup_confirmation",
      required: false,
    });

    return reply(201, {
      registered: true,
      role,
      documentUploadToken: uploadToken.raw,
      emailConfirmationRequired: false,
    });
  } catch (error) {
    console.error("Professional registration failed", error);
    await adminSupabase.auth.admin.deleteUser(userId);
    return reply(500, {
      error: "Votre compte n’a pas pu être finalisé. Aucune inscription incomplète n’a été conservée.",
    });
  }
};

export { handler };
