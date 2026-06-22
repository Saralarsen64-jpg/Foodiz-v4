import type { Handler } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { verifyStoredCourierDocument } from "./_lib/courier-documents.js";
import { cleanText } from "./_lib/prelaunch.js";

const documentTypes = new Set(["identity_front", "identity_back", "activity_proof"]);
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

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });
  if (await userRole(user.id) !== "courier") return reply(403, { error: "Courier required" });

  if (event.httpMethod === "GET") {
    const { data, error } = await adminSupabase
      .from("courier_documents")
      .select("id,document_type,original_name,mime_type,size_bytes,status,review_comment,reviewed_at,created_at")
      .eq("user_id", user.id)
      .order("created_at");
    if (error) return reply(500, { error: "Impossible de charger vos justificatifs." });
    return reply(200, { documents: data || [] });
  }
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  if (body.action === "prepare") {
    const documentType = cleanText(body.documentType, 30);
    const originalName = cleanText(body.fileName, 180);
    const mimeType = cleanText(body.mimeType, 80).toLowerCase();
    const sizeBytes = Number(body.sizeBytes);
    if (
      !documentTypes.has(documentType)
      || !originalName
      || !mimeTypes.has(mimeType)
      || !Number.isInteger(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes > maxFileSize
      || (documentType !== "activity_proof" && mimeType === "application/pdf")
    ) {
      return reply(400, { error: "Document invalide. JPG/PNG pour l’identité, JPG/PNG/PDF pour l’activité, 8 Mo maximum." });
    }

    const path = `${user.id}/${documentType}-${randomUUID()}.${extension(mimeType)}`;
    const { data, error } = await adminSupabase.storage
      .from("courier-documents")
      .createSignedUploadUrl(path);
    if (error || !data) return reply(500, { error: "Impossible de préparer le dépôt sécurisé." });
    return reply(200, { path, token: data.token });
  }

  if (body.action !== "complete" || !Array.isArray(body.documents) || body.documents.length < 1 || body.documents.length > 3) {
    return reply(400, { error: "Action invalide." });
  }

  const documents = body.documents.map((document: any) => ({
    documentType: cleanText(document.documentType, 30),
    storagePath: cleanText(document.storagePath, 500),
    originalName: cleanText(document.originalName, 180),
    mimeType: cleanText(document.mimeType, 80).toLowerCase(),
    sizeBytes: Number(document.sizeBytes),
  }));
  if (documents.some((document: any) => (
    !documentTypes.has(document.documentType)
    || !document.storagePath.startsWith(`${user.id}/${document.documentType}-`)
    || !mimeTypes.has(document.mimeType)
    || !Number.isInteger(document.sizeBytes)
    || document.sizeBytes <= 0
    || document.sizeBytes > maxFileSize
  ))) {
    return reply(400, { error: "Métadonnées de document invalides." });
  }

  const verificationResults = await Promise.all(documents.map((document: any) => verifyStoredCourierDocument({
    storagePath: document.storagePath,
    mimeType: document.mimeType,
    claimedSize: document.sizeBytes,
  })));
  if (verificationResults.some((valid) => !valid)) {
    return reply(409, { error: "Un document est incomplet ou son format réel est invalide." });
  }

  const { data: replacedDocuments } = await adminSupabase
    .from("courier_documents")
    .select("document_type,storage_path")
    .eq("user_id", user.id)
    .in("document_type", documents.map((document: any) => document.documentType));

  const { error: upsertError } = await adminSupabase
    .from("courier_documents")
    .upsert(documents.map((document: any) => ({
      user_id: user.id,
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
  const obsoletePaths = (replacedDocuments || [])
    .filter((existingDocument) => documents.some((document: any) => (
      document.documentType === existingDocument.document_type
      && document.storagePath !== existingDocument.storage_path
    )))
    .map((document) => document.storage_path);
  if (obsoletePaths.length) {
    await adminSupabase.storage.from("courier-documents").remove(obsoletePaths);
  }

  const { count } = await adminSupabase
    .from("courier_documents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const complete = count === 3;
  await Promise.all([
    adminSupabase
      .from("courier_applications")
      .update({
        status: "pending",
        document_review_status: complete ? "pending_review" : "documents_required",
        document_review_comment: null,
        identity_name_confirmed: false,
        business_identity_confirmed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id),
    adminSupabase
      .from("profiles")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", user.id),
  ]);

  return reply(200, {
    submitted: true,
    complete,
    message: complete ? "Votre dossier complet est en attente de contrôle." : "Document enregistré. Complétez les justificatifs manquants.",
  });
};

export { handler };
