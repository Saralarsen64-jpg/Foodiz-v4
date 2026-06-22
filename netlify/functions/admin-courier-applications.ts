import type { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { createLaunchToken } from "./_lib/prelaunch.js";

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
    const [{ data: applications, error: applicationsError }, { data: documents, error: documentsError }] = await Promise.all([
      adminSupabase
        .from("courier_applications")
        .select(`
          id,user_id,city,vehicle_type,legal_name,siret,address,postal_code,status,
          document_review_status,document_review_comment,identity_name_confirmed,
          business_identity_confirmed,dispatch_priority_score,reviewed_at,created_at,
          profiles:profiles!courier_applications_user_id_fkey(first_name,last_name,email,phone)
        `)
        .order("created_at", { ascending: false }),
      adminSupabase
        .from("courier_documents")
        .select("id,user_id,document_type,storage_path,original_name,mime_type,size_bytes,status,review_comment,reviewed_at,created_at")
        .order("created_at", { ascending: true }),
    ]);
    if (applicationsError || documentsError) {
      console.error("Admin courier applications load failed", applicationsError || documentsError);
      return reply(500, { error: "Impossible de charger les dossiers livreurs." });
    }

    const documentsWithUrls = await Promise.all((documents || []).map(async (document) => {
      const { data } = await adminSupabase.storage
        .from("courier-documents")
        .createSignedUrl(document.storage_path, 15 * 60);
      return { ...document, signed_url: data?.signedUrl || null };
    }));
    const byUser = documentsWithUrls.reduce<Record<string, typeof documentsWithUrls>>((result, document) => {
      (result[document.user_id] ||= []).push(document);
      return result;
    }, {});

    return reply(200, {
      applications: (applications || []).map((application) => ({
        ...application,
        documents: byUser[application.user_id] || [],
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

  const applicationId = String(body.applicationId || "");
  const decision = String(body.decision || "");
  const comment = String(body.comment || "").trim().slice(0, 1000);
  const documentTypes = Array.isArray(body.documentTypes)
    ? body.documentTypes.filter((value: unknown) => ["identity_front", "identity_back", "activity_proof"].includes(String(value)))
    : [];

  if (!applicationId || !["approve", "request_replacement", "reject"].includes(decision)) {
    return reply(400, { error: "Décision invalide." });
  }
  if (decision !== "approve" && comment.length < 5) {
    return reply(400, { error: "Expliquez précisément le refus ou le document à remplacer." });
  }

  const { data, error } = await adminSupabase.rpc("review_courier_application", {
    target_application_id: applicationId,
    target_reviewer_id: user.id,
    target_decision: decision,
    target_comment: comment,
    target_identity_name_confirmed: body.identityNameConfirmed === true,
    target_business_identity_confirmed: body.businessIdentityConfirmed === true,
    target_document_types: documentTypes,
  });
  if (error) {
    console.error("Admin courier review failed", error);
    return reply(409, { error: error.message || "La décision n’a pas pu être enregistrée." });
  }

  let replacementUploadUrl: string | null = null;
  if (decision === "request_replacement" && data?.userId) {
    const { data: prelaunchProfile } = await adminSupabase
      .from("prelaunch_profiles")
      .select("id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (prelaunchProfile) {
      const replacementToken = createLaunchToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await adminSupabase
        .from("prelaunch_driver_details")
        .update({
          document_upload_token_hash: replacementToken.hash,
          document_upload_token_expires_at: expiresAt,
        })
        .eq("prelaunch_profile_id", prelaunchProfile.id);
      const appUrl = (process.env.APP_URL || "https://www.foodiz.co").replace(/\/$/, "");
      replacementUploadUrl = `${appUrl}/courier-documents?token=${encodeURIComponent(replacementToken.raw)}`;
    }
  }

  return reply(200, { reviewed: true, result: data, replacementUploadUrl });
};

export { handler };
