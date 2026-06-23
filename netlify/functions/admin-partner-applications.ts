import type { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { createLaunchToken } from "./_lib/prelaunch.js";

const partnerDocumentTypes = new Set([
  "registration_proof",
  "liability_insurance",
  "hygiene_training",
  "sanitary_declaration",
  "alcohol_license",
]);

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });
  if (await userRole(user.id) !== "admin") return reply(403, { error: "Admin required" });

  if (event.httpMethod === "GET") {
    const [
      { data: applications, error: applicationsError },
      { data: restaurants, error: restaurantsError },
      { data: documents, error: documentsError },
      { data: prelaunchProfiles, error: prelaunchError },
      { data: serviceAreas, error: areasError },
    ] = await Promise.all([
      adminSupabase
        .from("partner_applications")
        .select(`
          id,user_id,business_name,siret,phone,email,address,postal_code,city,
          latitude,longitude,status,rejection_reason,reviewed_at,created_at,
          service_area_id,establishment_type,handles_animal_products,sells_alcohol,
          requires_hygiene_proof,compliance_status,compliance_comment,documents_submitted_at,
          profiles:profiles!partner_applications_user_id_fkey(first_name,last_name,email,phone,status)
        `)
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("restaurants")
        .select("id,owner_id,name,status,is_active,service_area_id,latitude,longitude"),
      adminSupabase
        .from("partner_documents")
        .select("id,user_id,application_id,document_type,storage_path,original_name,mime_type,size_bytes,status,valid_until,review_comment,reviewed_at,created_at")
        .order("created_at", { ascending: true }),
      adminSupabase
        .from("prelaunch_profiles")
        .select("user_id,access_enabled,access_enabled_at,status")
        .eq("role", "partenaire"),
      adminSupabase
        .from("service_areas")
        .select("id,city,department_code,status,delivery_radius_km"),
    ]);
    const loadError = applicationsError || restaurantsError || documentsError || prelaunchError || areasError;
    if (loadError) {
      console.error("Admin partner applications load failed", loadError);
      return reply(500, { error: "Impossible de charger les dossiers partenaires." });
    }

    const documentsWithUrls = await Promise.all((documents || []).map(async (document) => {
      const { data } = await adminSupabase.storage
        .from("partner-documents")
        .createSignedUrl(document.storage_path, 15 * 60);
      return { ...document, signed_url: data?.signedUrl || null };
    }));
    const documentsByApplication = documentsWithUrls.reduce<Record<string, typeof documentsWithUrls>>((result, document) => {
      (result[document.application_id] ||= []).push(document);
      return result;
    }, {});
    const restaurantByOwner = new Map((restaurants || []).map((restaurant) => [restaurant.owner_id, restaurant]));
    const prelaunchByUser = new Map((prelaunchProfiles || []).map((profile) => [profile.user_id, profile]));
    const areaById = new Map((serviceAreas || []).map((area) => [area.id, area]));

    return reply(200, {
      applications: (applications || []).map((application) => ({
        ...application,
        restaurant: restaurantByOwner.get(application.user_id) || null,
        prelaunch: prelaunchByUser.get(application.user_id) || null,
        service_area: application.service_area_id ? areaById.get(application.service_area_id) || null : null,
        documents: documentsByApplication[application.id] || [],
      })),
    });
  }

  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const action = String(body.action || "");
  if (action === "review") {
    const applicationId = String(body.applicationId || "");
    const decision = String(body.decision || "");
    const comment = String(body.comment || "").trim().slice(0, 1000);
    const documentTypes = Array.isArray(body.documentTypes)
      ? body.documentTypes
        .map((value: unknown) => String(value))
        .filter((value: string) => partnerDocumentTypes.has(value))
      : [];
    if (!applicationId || !["approve", "request_replacement", "reject"].includes(decision)) {
      return reply(400, { error: "Décision invalide." });
    }
    if (decision !== "approve" && comment.length < 5) {
      return reply(400, { error: "Expliquez précisément le refus ou le document à remplacer." });
    }

    const { data: application } = await adminSupabase
      .from("partner_applications")
      .select("user_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (!application) return reply(404, { error: "Dossier partenaire introuvable." });

    const { error } = await adminSupabase.rpc("review_partner_application_server", {
      target_application_id: applicationId,
      target_reviewer_id: user.id,
      target_decision: decision,
      target_comment: comment,
      target_document_types: documentTypes,
    });
    if (error) {
      console.error("Admin partner review failed", error);
      return reply(409, { error: error.message || "La décision n’a pas pu être enregistrée." });
    }

    let replacementUploadUrl: string | null = null;
    if (decision === "request_replacement") {
      const { data: prelaunchProfile } = await adminSupabase
        .from("prelaunch_profiles")
        .select("id")
        .eq("user_id", application.user_id)
        .maybeSingle();
      if (prelaunchProfile) {
        const replacementToken = createLaunchToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await adminSupabase
          .from("prelaunch_partner_details")
          .update({
            document_upload_token_hash: replacementToken.hash,
            document_upload_token_expires_at: expiresAt,
          })
          .eq("prelaunch_profile_id", prelaunchProfile.id);
        const appUrl = (process.env.APP_URL || "https://www.foodiz.co").replace(/\/$/, "");
        replacementUploadUrl = `${appUrl}/partner-documents?token=${encodeURIComponent(replacementToken.raw)}`;
      }
    }
    return reply(200, { reviewed: true, replacementUploadUrl, emailSent: false });
  }

  if (action === "set_access") {
    const targetUserId = String(body.userId || "");
    if (!targetUserId) return reply(400, { error: "Utilisateur manquant." });
    const { error } = await adminSupabase.rpc("set_prelaunch_professional_access", {
      target_user_id: targetUserId,
      target_reviewer_id: user.id,
      target_enabled: body.enabled === true,
    });
    if (error) return reply(409, { error: error.message || "Impossible de modifier l’accès pilote." });
    return reply(200, { accessUpdated: true, enabled: body.enabled === true });
  }

  if (action === "set_operational_status") {
    const restaurantId = String(body.restaurantId || "");
    const status = String(body.status || "");
    const reason = String(body.reason || "").trim().slice(0, 1000);
    if (!restaurantId) return reply(400, { error: "Établissement manquant." });
    const { error } = await adminSupabase.rpc("set_partner_operational_status_server", {
      target_restaurant_id: restaurantId,
      target_reviewer_id: user.id,
      target_status: status,
      target_reason: reason || null,
    });
    if (error) return reply(409, { error: error.message || "Impossible de modifier l’état opérationnel." });
    return reply(200, { operationalStatusUpdated: true });
  }

  return reply(400, { error: "Action invalide." });
};

export { handler };
