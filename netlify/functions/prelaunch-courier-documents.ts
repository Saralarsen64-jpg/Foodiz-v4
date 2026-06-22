import type { Handler } from "@netlify/functions";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { adminSupabase } from "./_lib/auth.js";
import { verifyStoredCourierDocument } from "./_lib/courier-documents.js";
import { cleanText, sha256 } from "./_lib/prelaunch.js";

const allowedDocumentTypes = new Set(["identity_front", "identity_back", "activity_proof"]);
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

async function resolveDriver(uploadToken: string) {
  const tokenHash = sha256(uploadToken);
  const { data: driver } = await adminSupabase
    .from("prelaunch_driver_details")
    .select(`
      id,prelaunch_profile_id,document_review_status,document_review_comment,
      document_upload_token_hash,document_upload_token_expires_at,
      profile:prelaunch_profiles!prelaunch_driver_details_prelaunch_profile_id_fkey(id,user_id,role)
    `)
    .eq("document_upload_token_hash", tokenHash)
    .maybeSingle();

  const profile = Array.isArray(driver?.profile) ? driver?.profile[0] : driver?.profile;
  if (
    !driver
    || !profile
    || profile.role !== "livreur"
    || !validUploadToken(uploadToken, driver.document_upload_token_hash)
    || !driver.document_upload_token_expires_at
    || new Date(driver.document_upload_token_expires_at).getTime() <= Date.now()
  ) {
    return null;
  }
  return { driver, profile };
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
  const resolved = await resolveDriver(uploadToken);
  if (!resolved) return reply(401, { error: "Lien de dépôt invalide ou expiré." });

  const { driver, profile } = resolved;
  if (body.action === "status") {
    const { data: documents } = await adminSupabase
      .from("courier_documents")
      .select("document_type,status,review_comment,original_name")
      .eq("user_id", profile.user_id)
      .order("created_at");
    return reply(200, {
      reviewStatus: driver.document_review_status,
      reviewComment: driver.document_review_comment || null,
      documents: documents || [],
    });
  }

  if (body.action === "prepare") {
    const documentType = cleanText(body.documentType, 30);
    const originalName = cleanText(body.fileName, 180);
    const mimeType = cleanText(body.mimeType, 80).toLowerCase();
    const sizeBytes = Number(body.sizeBytes);

    if (!allowedDocumentTypes.has(documentType)) {
      return reply(400, { error: "Type de document invalide." });
    }
    if (!originalName || !allowedMimeTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxFileSize) {
      return reply(400, { error: "Document invalide. Formats JPG, PNG ou PDF, 8 Mo maximum." });
    }
    if (documentType !== "activity_proof" && mimeType === "application/pdf") {
      return reply(400, { error: "La pièce d’identité doit être transmise en photo JPG ou PNG." });
    }

    const path = `${profile.user_id}/${documentType}-${randomUUID()}.${fileExtension(mimeType)}`;
    const { data, error } = await adminSupabase.storage
      .from("courier-documents")
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Courier signed upload URL failed", error);
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
      documentType: cleanText(document.documentType, 30),
      storagePath: cleanText(document.storagePath, 500),
      originalName: cleanText(document.originalName, 180),
      mimeType: cleanText(document.mimeType, 80).toLowerCase(),
      sizeBytes: Number(document.sizeBytes),
    }));

    if (
      normalized.length < 1
      || normalized.length > 3
      || new Set(normalized.map((document) => document.documentType)).size !== normalized.length
      || normalized.some((document) => (
        !allowedDocumentTypes.has(document.documentType)
        || !document.storagePath.startsWith(`${profile.user_id}/${document.documentType}-`)
        || !allowedMimeTypes.has(document.mimeType)
        || !Number.isInteger(document.sizeBytes)
        || document.sizeBytes <= 0
        || document.sizeBytes > maxFileSize
      ))
    ) {
      return reply(400, { error: "Les justificatifs transmis sont invalides." });
    }

    const verificationResults = await Promise.all(normalized.map((document) => verifyStoredCourierDocument({
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      claimedSize: document.sizeBytes,
    })));
    if (verificationResults.some((valid) => !valid)) {
      return reply(409, { error: "Un document est incomplet ou son format réel ne correspond pas au fichier annoncé." });
    }

    const { data: replacedDocuments } = await adminSupabase
      .from("courier_documents")
      .select("document_type,storage_path")
      .eq("user_id", profile.user_id)
      .in("document_type", normalized.map((document) => document.documentType));

    const rows = normalized.map((document) => ({
      user_id: profile.user_id,
      prelaunch_profile_id: profile.id,
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
      .from("courier_documents")
      .upsert(rows, { onConflict: "user_id,document_type" });
    if (documentsError) {
      console.error("Courier document metadata failed", documentsError);
      return reply(500, { error: "Impossible d’enregistrer les justificatifs." });
    }
    const obsoletePaths = (replacedDocuments || [])
      .filter((existingDocument) => normalized.some((document) => (
        document.documentType === existingDocument.document_type
        && document.storagePath !== existingDocument.storage_path
      )))
      .map((document) => document.storage_path);
    if (obsoletePaths.length) {
      await adminSupabase.storage.from("courier-documents").remove(obsoletePaths);
    }

    const { count: documentCount } = await adminSupabase
      .from("courier_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id);
    if (documentCount !== 3) {
      return reply(409, { error: "Le dossier doit contenir les trois justificatifs obligatoires." });
    }

    const submittedAt = new Date().toISOString();
    const { error: driverError } = await adminSupabase
      .from("prelaunch_driver_details")
      .update({
        document_review_status: "pending_review",
        document_review_comment: null,
        documents_submitted_at: submittedAt,
        document_upload_token_hash: null,
        document_upload_token_expires_at: null,
      })
      .eq("id", driver.id);
    if (driverError) throw driverError;

    const { data: details } = await adminSupabase
      .from("prelaunch_driver_details")
      .select("siret,legal_name,address,postal_code")
      .eq("id", driver.id)
      .single();

    const applicationValues = {
      user_id: profile.user_id,
      legal_name: details?.legal_name,
      siret: details?.siret,
      address: details?.address,
      postal_code: details?.postal_code,
      document_review_status: "pending_review",
      document_review_comment: null,
      status: "pending",
      identity_name_confirmed: false,
      business_identity_confirmed: false,
      updated_at: submittedAt,
    };
    const { data: existingApplication } = await adminSupabase
      .from("courier_applications")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();
    const applicationResult = existingApplication
      ? await adminSupabase.from("courier_applications").update(applicationValues).eq("id", existingApplication.id)
      : await adminSupabase.from("courier_applications").insert(applicationValues);
    if (applicationResult.error) throw applicationResult.error;

    await adminSupabase
      .from("profiles")
      .update({ status: "pending", updated_at: submittedAt })
      .eq("id", profile.user_id);

    return reply(200, {
      submitted: true,
      reviewStatus: "pending_review",
      message: "Vos justificatifs sont transmis à Foodiz pour vérification.",
    });
  }

  return reply(400, { error: "Action invalide." });
};

export { handler };
