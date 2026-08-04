import type { Handler } from "@netlify/functions";
import { adminSupabase, appIsLaunched } from "./_lib/auth.js";
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

type PublicRole = "client" | "livreur" | "partenaire";

const roleToAuthRole: Record<PublicRole, "client" | "courier" | "partner"> = {
  client: "client",
  livreur: "courier",
  partenaire: "partner",
};

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validCourierAvailabilitySlots = ["matin", "midi", "apres_midi", "soiree", "nuit", "week_end"];
const validCourierAvailabilityDays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function cleanStringArray(value: unknown, allowedValues: string[], maxItems: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((entry) => cleanText(entry, 30))
      .filter((entry) => allowedValues.includes(entry)),
  )).slice(0, maxItems);
}

function legacyAvailabilityFromSlots(slots: string[], flexible: boolean, submittedAvailability: string) {
  if (["journee", "soiree", "nuit", "week_end"].includes(submittedAvailability)) return submittedAvailability;
  if (slots.includes("week_end")) return "week_end";
  if (slots.includes("nuit")) return "nuit";
  if (slots.includes("soiree")) return "soiree";
  return flexible || slots.length > 0 ? "journee" : "";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (await appIsLaunched()) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: "Weello est lancé. Utilisez désormais l’inscription classique." }),
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
  const phone = normalizeWeelloPhone(submittedPhone);
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
  const availabilitySlots = cleanStringArray(input.availabilitySlots, validCourierAvailabilitySlots, 6);
  const availabilityDays = cleanStringArray(input.availabilityDays, validCourierAvailabilityDays, 7);
  const availabilityFlexible = input.availabilityFlexible === true;
  const availability = legacyAvailabilityFromSlots(
    availabilitySlots,
    availabilityFlexible,
    cleanText(input.availability, 30),
  );
  const address = cleanText(input.address, 180);
  const postalCode = cleanText(input.postalCode, 10);
  const handlesAnimalProducts = input.handlesAnimalProducts === true;
  const sellsAlcohol = input.sellsAlcohol === true;
  const requiresHygieneProof = input.requiresHygieneProof === true;

  if (role === "partenaire" && (
    !establishmentName
    || ![
      "restaurant", "fast_food", "bakery", "pastry", "butcher", "caterer",
      "grocery", "greengrocer", "supermarket", "local_shop", "franchise",
      "national_brand", "other",
    ].includes(establishmentType)
    || !/^[0-9]{14}$/.test(siret)
    || !address
    || !/^[0-9]{5}$/.test(postalCode)
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Complétez l’établissement, le SIRET et son adresse professionnelle." }) };
  }
  if (role === "livreur" && (
    !/^[0-9]{14}$/.test(siret)
    || !address
    || !/^[0-9]{5}$/.test(postalCode)
    || !["velo", "scooter", "voiture", "autre"].includes(vehicleType)
    || !["journee", "soiree", "nuit", "week_end"].includes(availability)
    || (!availabilityFlexible && (availabilitySlots.length === 0 || availabilityDays.length === 0))
  )) {
    return { statusCode: 400, body: JSON.stringify({ error: "Renseignez un SIRET valide, votre adresse professionnelle, votre véhicule, vos créneaux et vos jours de disponibilité." }) };
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
        body: JSON.stringify({ error: "Ce numéro de téléphone est déjà associé à un compte Weello." }),
      };
    }
    if (!authRole) {
      return { statusCode: 400, body: JSON.stringify({ error: "Rôle invalide." }) };
    }
  }

  let professionalCoordinates: { latitude: number; longitude: number } | null = null;
  if (role === "partenaire" || role === "livreur") {
    try {
      const geocoded = await geocodeAddress(`${address}, ${postalCode} ${city}, France`);
      professionalCoordinates = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
      };
    } catch (error) {
      console.error("Prelaunch professional geocoding failed", error);
      // The legacy prelaunch flow follows the same rule as current signup:
      // geocoding can assist review but must never reject a professional dossier.
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
          ? "Ce numéro de téléphone est déjà associé à un compte Weello."
          : duplicate
            ? "Cette adresse possède déjà un compte Weello."
            : "Impossible de créer votre pré-inscription.",
      }),
    };
  }

  const userId = authData.user.id;
  const courierUploadToken = role === "livreur" ? createLaunchToken() : null;
  const partnerUploadToken = role === "partenaire" ? createLaunchToken() : null;
  const courierUploadTokenExpiresAt = role === "livreur"
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;
  const partnerUploadTokenExpiresAt = role === "partenaire"
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
      let serviceAreaId: string | null = null;
      if (professionalCoordinates) {
        const { data, error: serviceAreaError } = await adminSupabase.rpc(
          "ensure_service_area_server",
          {
            target_city: city,
            target_postal_code: postalCode,
            target_latitude: professionalCoordinates.latitude,
            target_longitude: professionalCoordinates.longitude,
          },
        );
        if (serviceAreaError || !data) throw serviceAreaError || new Error("Service area creation failed");
        serviceAreaId = data;
      }

      const { error } = await adminSupabase.from("prelaunch_partner_details").insert({
        prelaunch_profile_id: profile.id,
        establishment_name: establishmentName,
        establishment_type: establishmentType,
        siret,
        address,
        postal_code: postalCode,
        handles_animal_products: handlesAnimalProducts,
        sells_alcohol: sellsAlcohol,
        requires_hygiene_proof: requiresHygieneProof,
        document_review_status: "documents_required",
        document_upload_token_hash: partnerUploadToken?.hash,
        document_upload_token_expires_at: partnerUploadTokenExpiresAt,
      });
      if (error) throw error;

      const [{ error: applicationError }, { error: restaurantError }] = await Promise.all([
        adminSupabase
          .from("partner_applications")
          .update({
            business_name: establishmentName,
            siret,
            address,
            postal_code: postalCode,
            city,
            latitude: professionalCoordinates?.latitude ?? null,
            longitude: professionalCoordinates?.longitude ?? null,
            service_area_id: serviceAreaId,
            establishment_type: establishmentType,
            handles_animal_products: handlesAnimalProducts,
            sells_alcohol: sellsAlcohol,
            requires_hygiene_proof: requiresHygieneProof,
            compliance_status: "documents_required",
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId),
        adminSupabase
          .from("restaurants")
          .update({
            name: establishmentName,
            siret,
            address,
            postal_code: postalCode,
            city,
            latitude: professionalCoordinates?.latitude ?? null,
            longitude: professionalCoordinates?.longitude ?? null,
            service_area_id: serviceAreaId,
            status: "pending",
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("owner_id", userId),
      ]);
      if (applicationError || restaurantError) throw applicationError || restaurantError;
    }

    if (role === "livreur") {
      let serviceAreaId: string | null = null;
      if (professionalCoordinates) {
        const { data, error: serviceAreaError } = await adminSupabase.rpc(
          "ensure_service_area_server",
          {
            target_city: city,
            target_postal_code: postalCode,
            target_latitude: professionalCoordinates.latitude,
            target_longitude: professionalCoordinates.longitude,
          },
        );
        if (serviceAreaError || !data) throw serviceAreaError || new Error("Service area creation failed");
        serviceAreaId = data;
      }

      const { error } = await adminSupabase.from("prelaunch_driver_details").insert({
        prelaunch_profile_id: profile.id,
        siret,
        legal_name: `${firstName} ${lastName}`.trim(),
        address,
        postal_code: postalCode,
        vehicle_type: vehicleType,
        availability,
        availability_slots: availabilitySlots,
        availability_days: availabilityDays,
        availability_flexible: availabilityFlexible,
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
          availability_slots: availabilitySlots,
          availability_days: availabilityDays,
          availability_flexible: availabilityFlexible,
          service_area_id: serviceAreaId,
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

  const appUrl = (process.env.APP_URL || "https://weello.app").replace(/\/$/, "");
  const documentUrl = role === "livreur" && courierUploadToken?.raw
    ? `${appUrl}/courier-documents?token=${encodeURIComponent(courierUploadToken.raw)}`
    : role === "partenaire" && partnerUploadToken?.raw
      ? `${appUrl}/partner-documents?token=${encodeURIComponent(partnerUploadToken.raw)}`
      : null;
  let emailSent = false;
  try {
    const emailResult = await sendPrelaunchEmail({
      to: email,
      subject: role === "client" ? "Votre pré-inscription Weello est confirmée" : "Votre dossier Weello est créé",
      headline: role === "client"
        ? `Bienvenue chez Weello, ${firstName}`
        : role === "livreur"
          ? "Votre dossier livreur Weello est prêt"
          : "Votre établissement Weello est prêt à être vérifié",
      body: role === "client"
        ? "Votre pré-inscription est bien enregistrée. Vous serez informé par email dès que Weello ouvrira dans votre ville."
        : role === "livreur"
          ? "Votre compte est créé. La prochaine étape consiste à transmettre votre pièce d’identité et votre justificatif officiel d’activité. Sans validation Weello, aucune course ni aucun revenu ne seront accessibles."
          : "Votre établissement est pré-inscrit. Transmettez vos justificatifs professionnels afin que Weello puisse vérifier votre activité avant toute activation commerciale.",
      actionLabel: documentUrl ? "Transmettre mes justificatifs" : undefined,
      actionUrl: documentUrl || undefined,
      recipientUserId: userId,
      emailType: "prelaunch_confirmation",
      required: false,
    });
    emailSent = emailResult.sent === true;
  } catch (emailError) {
    console.error("Prelaunch confirmation email failed", emailError);
  }

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registered: true,
      courierDocumentUploadToken: courierUploadToken?.raw,
      courierDocumentUploadExpiresAt: courierUploadTokenExpiresAt,
      partnerDocumentUploadToken: partnerUploadToken?.raw,
      partnerDocumentUploadExpiresAt: partnerUploadTokenExpiresAt,
      emailSent,
      message: role === "livreur"
        ? "Votre compte est créé. Transmettez maintenant vos trois justificatifs obligatoires."
        : role === "partenaire"
          ? "Votre établissement est pré-inscrit. Transmettez maintenant les justificatifs obligatoires."
          : "Votre pré-inscription est bien enregistrée. Weello vous informera lors du lancement dans votre ville.",
    }),
  };
};

export { handler };
