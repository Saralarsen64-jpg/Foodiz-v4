import type { Handler } from "@netlify/functions";
import { randomUUID } from "node:crypto";

import { adminSupabase } from "./_lib/auth.js";
import { verifyStoredCourierDocument, verifyStoredDocument } from "./_lib/courier-documents.js";
import { cleanText, sendPrelaunchEmail, sha256 } from "./_lib/prelaunch.js";

type ProfessionalRole = "livreur" | "partenaire";

const courierTypes = ["identity_front", "identity_back", "activity_proof"];
const partnerTypes = [
  "registration_proof",
  "liability_insurance",
  "hygiene_training",
  "sanitary_declaration",
  "alcohol_license",
];
const mimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSize = 8 * 1024 * 1024;

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function extension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "pdf";
}

function requiredPartnerTypes(application: {
  requires_hygiene_proof: boolean;
  handles_animal_products: boolean;
  sells_alcohol: boolean;
}) {
  const required = ["registration_proof", "liability_insurance"];
  if (application.requires_hygiene_proof) required.push("hygiene_training");
  if (application.handles_animal_products) required.push("sanitary_declaration");
  if (application.sells_alcohol) required.push("alcohol_license");
  return required;
}

async function resolveApplication(role: ProfessionalRole, uploadToken: string) {
  if (!uploadToken) return null;
  const tokenHash = sha256(uploadToken);
  const now = Date.now();

  if (role === "partenaire") {
    const { data: application } = await adminSupabase
      .from("partner_applications")
      .select(`
        id,user_id,requires_hygiene_proof,handles_animal_products,sells_alcohol,
        document_upload_token_hash,document_upload_token_expires_at
      `)
      .eq("document_upload_token_hash", tokenHash)
      .maybeSingle();
    if (
      !application
      || !application.document_upload_token_expires_at
      || new Date(application.document_upload_token_expires_at).getTime() <= now
    ) return null;
    return { role, application, requiredTypes: requiredPartnerTypes(application) };
  }

  const { data: application } = await adminSupabase
    .from("courier_applications")
    .select("id,user_id,document_upload_token_hash,document_upload_token_expires_at")
    .eq("document_upload_token_hash", tokenHash)
    .maybeSingle();
  if (
    !application
    || !application.document_upload_token_expires_at
    || new Date(application.document_upload_token_expires_at).getTime() <= now
  ) return null;
  return { role, application, requiredTypes: courierTypes };
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const role = cleanText(body.role, 20) as ProfessionalRole;
  if (!["livreur", "partenaire"].includes(role)) {
    return reply(400, { error: "Rôle professionnel invalide." });
  }
  const resolved = await resolveApplication(role, String(body.uploadToken || ""));
  if (!resolved) return reply(401, { error: "Session de dépôt invalide ou expirée. Reconnectez-vous pour transmettre vos justificatifs." });

  const { application, requiredTypes } = resolved;
  const bucket = role === "partenaire" ? "partner-documents" : "courier-documents";
  const documentTable = role === "partenaire" ? "partner_documents" : "courier_documents";
  const { data: existingDocuments } = await adminSupabase
    .from(documentTable)
    .select("document_type,status,review_comment,original_name")
    .eq("user_id", application.user_id)
    .in("document_type", requiredTypes);
  const replacementTypes = (existingDocuments || [])
    .filter((document) => document.status === "replacement_requested")
    .map((document) => document.document_type);
  const uploadTypes = replacementTypes.length ? replacementTypes : requiredTypes;

  if (body.action === "status") {
    return reply(200, {
      requiredDocumentTypes: uploadTypes,
      reviewComment: (existingDocuments || []).find((document) => document.review_comment)?.review_comment || null,
      documents: existingDocuments || [],
    });
  }

  if (body.action === "prepare") {
    const documentType = cleanText(body.documentType, 40);
    const originalName = cleanText(body.fileName, 180);
    const mimeType = cleanText(body.mimeType, 80).toLowerCase();
    const sizeBytes = Number(body.sizeBytes);
    if (
      !uploadTypes.includes(documentType)
      || !originalName
      || !mimeTypes.has(mimeType)
      || !Number.isInteger(sizeBytes)
      || sizeBytes <= 0
      || sizeBytes > maxFileSize
      || (role === "livreur" && documentType !== "activity_proof" && mimeType === "application/pdf")
    ) {
      return reply(400, { error: "Document invalide. Vérifiez le format, le type et la taille du fichier." });
    }

    const path = `${application.user_id}/${documentType}-${randomUUID()}.${extension(mimeType)}`;
    const { data, error } = await adminSupabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("Professional signed upload failed", error);
      return reply(500, { error: "Impossible de préparer le dépôt sécurisé." });
    }
    return reply(200, { path, token: data.token });
  }

  if (body.action !== "complete" || !Array.isArray(body.documents)) {
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
    documents.length !== uploadTypes.length
    || new Set(documents.map((document: any) => document.documentType)).size !== uploadTypes.length
    || uploadTypes.some((type) => !documents.some((document: any) => document.documentType === type))
    || documents.some((document: any) => (
      !uploadTypes.includes(document.documentType)
      || !document.storagePath.startsWith(`${application.user_id}/${document.documentType}-`)
      || !mimeTypes.has(document.mimeType)
      || !Number.isInteger(document.sizeBytes)
      || document.sizeBytes <= 0
      || document.sizeBytes > maxFileSize
    ))
  ) {
    return reply(400, { error: "Le dossier ne contient pas tous les justificatifs obligatoires." });
  }

  const verification = role === "partenaire"
    ? await Promise.all(documents.map((document: any) => verifyStoredDocument({
        bucket,
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        claimedSize: document.sizeBytes,
      })))
    : await Promise.all(documents.map((document: any) => verifyStoredCourierDocument({
        storagePath: document.storagePath,
        mimeType: document.mimeType,
        claimedSize: document.sizeBytes,
      })));
  if (verification.some((valid) => !valid)) {
    return reply(409, { error: "Un document est incomplet ou son format réel ne correspond pas au fichier annoncé." });
  }

  const { data: replaced } = await adminSupabase
    .from(documentTable)
    .select("document_type,storage_path")
    .eq("user_id", application.user_id)
    .in("document_type", uploadTypes);

  const rows = documents.map((document: any) => ({
    user_id: application.user_id,
    ...(role === "partenaire" ? { application_id: application.id } : {}),
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
  const { error: upsertError } = await adminSupabase
    .from(documentTable)
    .upsert(rows, { onConflict: "user_id,document_type" });
  if (upsertError) {
    console.error("Professional document metadata failed", upsertError);
    return reply(500, { error: "Impossible d’enregistrer les justificatifs." });
  }

  const obsoletePaths = (replaced || [])
    .filter((existing) => documents.some((document: any) => (
      document.documentType === existing.document_type
      && document.storagePath !== existing.storage_path
    )))
    .map((document) => document.storage_path);
  if (obsoletePaths.length) await adminSupabase.storage.from(bucket).remove(obsoletePaths);

  const { data: completeDocuments } = await adminSupabase
    .from(documentTable)
    .select("document_type,status")
    .eq("user_id", application.user_id)
    .in("document_type", requiredTypes);
  const dossierComplete = requiredTypes.every((type) => completeDocuments?.some((document) => (
    document.document_type === type && ["pending", "approved"].includes(document.status)
  )));
  if (!dossierComplete) {
    return reply(409, { error: "Le dossier ne contient pas encore tous les justificatifs obligatoires." });
  }

  const submittedAt = new Date().toISOString();
  if (role === "partenaire") {
    const { error } = await adminSupabase
      .from("partner_applications")
      .update({
        status: "pending",
        compliance_status: "pending_review",
        compliance_comment: null,
        documents_submitted_at: submittedAt,
        document_upload_token_hash: null,
        document_upload_token_expires_at: null,
        updated_at: submittedAt,
      })
      .eq("id", application.id);
    if (error) throw error;
  } else {
    const { error } = await adminSupabase
      .from("courier_applications")
      .update({
        status: "pending",
        document_review_status: "pending_review",
        document_review_comment: null,
        identity_name_confirmed: false,
        business_identity_confirmed: false,
        documents_submitted_at: submittedAt,
        document_upload_token_hash: null,
        document_upload_token_expires_at: null,
        updated_at: submittedAt,
      })
      .eq("id", application.id);
    if (error) throw error;
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("email,first_name")
    .eq("id", application.user_id)
    .single();
  if (profile?.email) {
    await sendPrelaunchEmail({
      to: profile.email,
      subject: "Vos justificatifs Weello ont bien été reçus",
      headline: "Votre dossier est entre de bonnes mains",
      body: `Merci ${profile.first_name || ""}. Vos justificatifs ${role === "partenaire" ? "partenaire" : "livreur"} sont transmis à Weello. Vous recevrez un email après leur vérification par l’administration.`,
      recipientUserId: application.user_id,
      emailType: "professional_documents_received",
      required: false,
    });
  }

  return reply(200, {
    submitted: true,
    reviewStatus: "pending_review",
    message: "Votre dossier complet est en attente de vérification par Weello.",
  });
};

export { handler };
