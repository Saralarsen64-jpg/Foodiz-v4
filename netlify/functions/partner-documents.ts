import type { Handler } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { verifyStoredDocument } from "./_lib/courier-documents.js";
import { cleanText } from "./_lib/prelaunch.js";

const allTypes = new Set([
  "registration_proof",
  "liability_insurance",
  "hygiene_training",
  "sanitary_declaration",
  "alcohol_license",
]);
const mimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSize = 8 * 1024 * 1024;

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function extension(mimeType: string) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "pdf";
}

function requiredTypes(application: {
  requires_hygiene_proof: boolean;
  handles_animal_products: boolean;
  sells_alcohol: boolean;
}) {
  const result = ["registration_proof", "liability_insurance"];
  if (application.requires_hygiene_proof) result.push("hygiene_training");
  if (application.handles_animal_products) result.push("sanitary_declaration");
  if (application.sells_alcohol) result.push("alcohol_license");
  return result;
}

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });
  if (await userRole(user.id) !== "partner") return reply(403, { error: "Partner required" });

  const { data: application } = await adminSupabase
    .from("partner_applications")
    .select("id,requires_hygiene_proof,handles_animal_products,sells_alcohol")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!application) return reply(409, { error: "Complétez d’abord les informations de votre établissement." });
  const required = requiredTypes(application);

  if (event.httpMethod === "GET") {
    const { data, error } = await adminSupabase
      .from("partner_documents")
      .select("id,document_type,original_name,mime_type,size_bytes,status,review_comment,reviewed_at,created_at")
      .eq("user_id", user.id)
      .order("created_at");
    if (error) return reply(500, { error: "Impossible de charger vos justificatifs." });
    return reply(200, { documents: data || [], requiredDocumentTypes: required });
  }
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  if (body.action === "prepare") {
    const documentType = cleanText(body.documentType, 40);
    const mimeType = cleanText(body.mimeType, 80).toLowerCase();
    const sizeBytes = Number(body.sizeBytes);
    if (
      !allTypes.has(documentType)
      || !required.includes(documentType)
      || !mimeTypes.has(mimeType)
      || !Number.isInteger(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes > maxFileSize
    ) {
      return reply(400, { error: "Document invalide. JPG, PNG ou PDF, 8 Mo maximum." });
    }
    const path = `${user.id}/${documentType}-${randomUUID()}.${extension(mimeType)}`;
    const { data, error } = await adminSupabase.storage
      .from("partner-documents")
      .createSignedUploadUrl(path);
    if (error || !data) return reply(500, { error: "Impossible de préparer le dépôt sécurisé." });
    return reply(200, { path, token: data.token });
  }

  if (body.action !== "complete" || !Array.isArray(body.documents) || body.documents.length < 1) {
    return reply(400, { error: "Action invalide." });
  }
  const documents = body.documents.map((document: any) => ({
    documentType: cleanText(document.documentType, 40),
    storagePath: cleanText(document.storagePath, 500),
    originalName: cleanText(document.originalName, 180),
    mimeType: cleanText(document.mimeType, 80).toLowerCase(),
    sizeBytes: Number(document.sizeBytes),
  }));
  if (
    documents.length > required.length
    || documents.some((document: any) => (
      !required.includes(document.documentType)
      || !document.storagePath.startsWith(`${user.id}/${document.documentType}-`)
      || !mimeTypes.has(document.mimeType)
      || !Number.isInteger(document.sizeBytes)
      || document.sizeBytes <= 0
      || document.sizeBytes > maxFileSize
    ))
  ) {
    return reply(400, { error: "Métadonnées de document invalides." });
  }

  const verification = await Promise.all(documents.map((document: any) => verifyStoredDocument({
    bucket: "partner-documents",
    storagePath: document.storagePath,
    mimeType: document.mimeType,
    claimedSize: document.sizeBytes,
  })));
  if (verification.some((valid) => !valid)) {
    return reply(409, { error: "Un document est incomplet ou son format réel est invalide." });
  }

  const { data: replaced } = await adminSupabase
    .from("partner_documents")
    .select("document_type,storage_path")
    .eq("user_id", user.id)
    .in("document_type", documents.map((document: any) => document.documentType));
  const { error: upsertError } = await adminSupabase
    .from("partner_documents")
    .upsert(documents.map((document: any) => ({
      user_id: user.id,
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
    })), { onConflict: "user_id,document_type" });
  if (upsertError) return reply(500, { error: "Impossible d’enregistrer les justificatifs." });

  const obsoletePaths = (replaced || [])
    .filter((existing) => documents.some((document: any) => (
      document.documentType === existing.document_type
      && document.storagePath !== existing.storage_path
    )))
    .map((document) => document.storage_path);
  if (obsoletePaths.length) await adminSupabase.storage.from("partner-documents").remove(obsoletePaths);

  const { data: storedDocuments } = await adminSupabase
    .from("partner_documents")
    .select("document_type,status")
    .eq("user_id", user.id)
    .in("document_type", required);
  const complete = required.every((type) => storedDocuments?.some((document) => (
    document.document_type === type && ["pending", "approved"].includes(document.status)
  )));
  const now = new Date().toISOString();
  await adminSupabase
    .from("partner_applications")
    .update({
      status: "pending",
      compliance_status: complete ? "pending_review" : "documents_required",
      compliance_comment: null,
      documents_submitted_at: complete ? now : null,
      updated_at: now,
    })
    .eq("id", application.id);

  return reply(200, {
    submitted: true,
    complete,
    message: complete ? "Votre dossier complet est en attente de contrôle." : "Document enregistré. Complétez les justificatifs manquants.",
  });
};

export { handler };
