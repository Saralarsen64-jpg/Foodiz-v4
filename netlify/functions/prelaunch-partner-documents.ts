import type { Handler } from "@netlify/functions";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { adminSupabase } from "./_lib/auth.js";
import { verifyStoredDocument } from "./_lib/courier-documents.js";
import { cleanText, sendPrelaunchEmail, sha256 } from "./_lib/prelaunch.js";

const allDocumentTypes = new Set([
  "registration_proof",
  "liability_insurance",
  "hygiene_training",
  "sanitary_declaration",
  "alcohol_license",
]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSize = 8 * 1024 * 1024;

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function validUploadToken(rawToken: string, expectedHash: string | null) {
  if (!rawToken || !expectedHash) return false;
  const supplied = Buffer.from(sha256(rawToken), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function fileExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "pdf";
}

function requiredDocumentTypes(details: {
  requires_hygiene_proof: boolean;
  handles_animal_products: boolean;
  sells_alcohol: boolean;
}) {
  const types = ["registration_proof", "liability_insurance"];
  if (details.requires_hygiene_proof) types.push("hygiene_training");
  if (details.handles_animal_products) types.push("sanitary_declaration");
  if (details.sells_alcohol) types.push("alcohol_license");
  return types;
}

async function resolvePartner(uploadToken: string) {
  const tokenHash = sha256(uploadToken);
  const { data: details } = await adminSupabase
    .from("prelaunch_partner_details")
    .select(`
      id,prelaunch_profile_id,document_review_status,document_review_comment,
      document_upload_token_hash,document_upload_token_expires_at,
      requires_hygiene_proof,handles_animal_products,sells_alcohol,
      profile:prelaunch_profiles!prelaunch_partner_details_prelaunch_profile_id_fkey(id,user_id,role,email,first_name)
    `)
    .eq("document_upload_token_hash", tokenHash)
    .maybeSingle();

  const profile = Array.isArray(details?.profile) ? details?.profile[0] : details?.profile;
  if (
    !details
    || !profile
    || profile.role !== "partenaire"
    || !validUploadToken(uploadToken, details.document_upload_token_hash)
    || !details.document_upload_token_expires_at
    || new Date(details.document_upload_token_expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  const { data: application } = await adminSupabase
    .from("partner_applications")
    .select("id")
    .eq("user_id", profile.user_id)
    .maybeSingle();
  if (!application) return null;

  return { details, profile, application };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const uploadToken = String(body.uploadToken || "");
  const resolved = await resolvePartner(uploadToken);
  if (!resolved) return reply(401, { error: "Lien de dépôt invalide ou expiré." });

  const { details, profile, application } = resolved;
  const requiredTypes = requiredDocumentTypes(details);

  if (body.action === "status") {
    const { data: documents } = await adminSupabase
      .from("partner_documents")
      .select("document_type,status,review_comment,original_name")
      .eq("user_id", profile.user_id)
      .order("created_at");
    return reply(200, {
      reviewStatus: details.document_review_status,
      reviewComment: details.document_review_comment || null,
      requiredDocumentTypes: requiredTypes,
      documents: documents || [],
    });
  }

  if (body.action === "prepare") {
    const documentType = cleanText(body.documentType, 40);
    const originalName = cleanText(body.fileName, 180);
    const mimeType = cleanText(body.mimeType, 80).toLowerCase();
    const sizeBytes = Number(body.sizeBytes);

    if (!allDocumentTypes.has(documentType) || !requiredTypes.includes(documentType)) {
      return reply(400, { error: "Type de document invalide pour cet établissement." });
    }
    if (!originalName || !allowedMimeTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxFileSize) {
      return reply(400, { error: "Document invalide. Formats JPG, PNG ou PDF, 8 Mo maximum." });
    }

    const path = `${profile.user_id}/${documentType}-${randomUUID()}.${fileExtension(mimeType)}`;
    const { data, error } = await adminSupabase.storage
      .from("partner-documents")
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Partner signed upload URL failed", error);
      return reply(500, { error: "Impossible de préparer le dépôt sécurisé." });
    }

    return reply(200, {
      path,
      token: data.token,
      documentType,
      originalName,
      mimeType,
      sizeBytes,
    });
  }

  if (body.action === "complete") {
    const documents = Array.isArray(body.documents) ? body.documents : [];
    const normalized = documents.map((document: any) => ({
      documentType: cleanText(document.documentType, 40),
      storagePath: cleanText(document.storagePath, 500),
      originalName: cleanText(document.originalName, 180),
      mimeType: cleanText(document.mimeType, 80).toLowerCase(),
      sizeBytes: Number(document.sizeBytes),
    }));

    if (
      normalized.length < 1
      || normalized.length > requiredTypes.length
      || new Set(normalized.map((document) => document.documentType)).size !== normalized.length
      || normalized.some((document) => !requiredTypes.includes(document.documentType))
      || normalized.some((document) => (
        !allDocumentTypes.has(document.documentType)
        || !document.storagePath.startsWith(`${profile.user_id}/${document.documentType}-`)
        || !allowedMimeTypes.has(document.mimeType)
        || !Number.isInteger(document.sizeBytes)
        || document.sizeBytes <= 0
        || document.sizeBytes > maxFileSize
      ))
    ) {
      return reply(400, { error: "Le dossier ne contient pas tous les justificatifs obligatoires." });
    }

    const verificationResults = await Promise.all(normalized.map((document) => verifyStoredDocument({
      bucket: "partner-documents",
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      claimedSize: document.sizeBytes,
    })));
    if (verificationResults.some((valid) => !valid)) {
      return reply(409, { error: "Un document est incomplet ou son format réel ne correspond pas au fichier annoncé." });
    }

    const { data: replacedDocuments } = await adminSupabase
      .from("partner_documents")
      .select("document_type,storage_path")
      .eq("user_id", profile.user_id)
      .in("document_type", normalized.map((document) => document.documentType));

    const rows = normalized.map((document) => ({
      user_id: profile.user_id,
      application_id: application.id,
      document_type: document.documentType,
      storage_path: document.storagePath,
      original_name: document.originalName,
      mime_type: document.mimeType,
      size_bytes: document.sizeBytes,
      status: "pending",
      review_comment: null,
      reviewed_by: null,
      reviewed_at: null,
    }));
    const { error: documentsError } = await adminSupabase
      .from("partner_documents")
      .upsert(rows, { onConflict: "user_id,document_type" });
    if (documentsError) {
      console.error("Partner document metadata failed", documentsError);
      return reply(500, { error: "Impossible d’enregistrer les justificatifs." });
    }

    const obsoletePaths = (replacedDocuments || [])
      .filter((existingDocument) => normalized.some((document) => (
        document.documentType === existingDocument.document_type
        && document.storagePath !== existingDocument.storage_path
      )))
      .map((document) => document.storage_path);
    if (obsoletePaths.length) {
      await adminSupabase.storage.from("partner-documents").remove(obsoletePaths);
    }

    const { count: completeDocumentCount } = await adminSupabase
      .from("partner_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id)
      .in("document_type", requiredTypes)
      .in("status", ["pending", "approved"]);
    if (completeDocumentCount !== requiredTypes.length) {
      return reply(409, { error: "Le dossier doit contenir tous les justificatifs obligatoires." });
    }

    const submittedAt = new Date().toISOString();
    const [{ error: detailsError }, { error: applicationError }] = await Promise.all([
      adminSupabase
        .from("prelaunch_partner_details")
        .update({
          document_review_status: "pending_review",
          document_review_comment: null,
          documents_submitted_at: submittedAt,
          document_upload_token_hash: null,
          document_upload_token_expires_at: null,
        })
        .eq("id", details.id),
      adminSupabase
        .from("partner_applications")
        .update({
          status: "pending",
          compliance_status: "pending_review",
          compliance_comment: null,
          documents_submitted_at: submittedAt,
          updated_at: submittedAt,
        })
        .eq("id", application.id),
    ]);
    if (detailsError || applicationError) throw detailsError || applicationError;

    try {
      await sendPrelaunchEmail({
        to: profile.email,
        subject: "Vos justificatifs partenaire Foodiz ont bien été reçus",
        headline: "Dossier établissement transmis",
        body: "Merci. Les justificatifs de votre établissement sont bien transmis. L’équipe Foodiz vérifie l’activité, les documents légaux, l’assurance et les éléments réglementaires avant toute activation commerciale.",
        recipientUserId: profile.user_id,
        emailType: "professional_documents_received",
        required: false,
      });
    } catch (emailError) {
      console.error("Partner documents received email failed", emailError);
    }

    return reply(200, {
      submitted: true,
      reviewStatus: "pending_review",
      message: "Vos justificatifs sont transmis à Foodiz pour vérification.",
    });
  }

  return reply(400, { error: "Action invalide." });
};

export { handler };
