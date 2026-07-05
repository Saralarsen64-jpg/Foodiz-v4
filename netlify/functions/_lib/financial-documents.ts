import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { adminSupabase } from "./auth.js";

type FinancialDocument = {
  id: string;
  document_number: string;
  document_type: "client_payment_receipt" | "settlement_statement";
  recipient_id: string;
  recipient_email: string | null;
  payload_snapshot: any;
  status: "generated" | "sent" | "email_failed";
  generated_at: string;
};

const cents = (value: unknown) => `${(Number(value || 0) / 100).toFixed(2)} EUR`;
const displayDate = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("fr-FR") : "-";

function legalIdentity() {
  const name = process.env.WEELLO_LEGAL_NAME?.trim() || process.env.FOODIZ_LEGAL_NAME?.trim();
  const address = process.env.WEELLO_LEGAL_ADDRESS?.trim() || process.env.FOODIZ_LEGAL_ADDRESS?.trim();
  const siret = process.env.WEELLO_SIRET?.trim() || process.env.FOODIZ_SIRET?.trim();
  if (!name || !address || !siret) throw new Error("Missing Weello legal identity environment variables");
  return {
    name,
    address,
    siret,
    vat: process.env.WEELLO_VAT_NUMBER?.trim() || process.env.FOODIZ_VAT_NUMBER?.trim() || null,
  };
}

export async function loadFinancialDocument(documentId: string) {
  const { data, error } = await adminSupabase.from("financial_documents").select("*").eq("id", documentId).single();
  if (error || !data) throw new Error("Financial document not found");
  return data as FinancialDocument;
}

export async function renderFinancialDocumentPdf(document: FinancialDocument) {
  const legal = legalIdentity();
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.75, 0.55, 0.22);
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const addPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const line = (text: string, options: { size?: number; strong?: boolean; color?: ReturnType<typeof rgb>; x?: number } = {}) => {
    if (y < 55) addPage();
    page.drawText(text.replace(/[\u2013\u2014]/g, "-"), { x: options.x || 45, y, size: options.size || 10, font: options.strong ? bold : regular, color: options.color || rgb(0.12, 0.12, 0.12) });
    y -= (options.size || 10) + 7;
  };
  const gap = (height = 10) => { y -= height; };

  line(legal.name, { size: 18, strong: true, color: gold });
  line(legal.address, { size: 9 });
  line(`SIRET : ${legal.siret}${legal.vat ? ` - TVA : ${legal.vat}` : ""}`, { size: 9 });
  gap(16);
  const receipt = document.document_type === "client_payment_receipt";
  line(receipt ? "RECU DE PAIEMENT" : "BORDEREAU DE REVERSEMENT", { size: 17, strong: true });
  line(`Document : ${document.document_number}`, { strong: true });
  line(`Date d'emission : ${displayDate(document.generated_at)}`);
  gap(12);

  const payload = document.payload_snapshot || {};
  if (receipt) {
    line(`Commande : #${String(payload.order_id || "").slice(0, 8)}`, { strong: true });
    line(`Etablissement : ${payload.restaurant_name || "-"}`);
    line(`Paiement confirme le : ${displayDate(payload.payment_confirmed_at)}`);
    line(`Reference de paiement : ${payload.payment_reference || "-"}`);
    gap(12);
    line("DETAIL", { size: 12, strong: true, color: gold });
    for (const item of payload.items || []) line(`${item.quantity} x ${item.product_name || "Produit"}  ${cents(item.total_price_cents)}`);
    gap(8);
    line(`Sous-total produits : ${cents(payload.partner_total_cents)}`);
    line(`Frais de service : ${cents(payload.service_fee_cents)}`);
    line(`Frais de livraison : ${cents(payload.delivery_fee_cents)}`);
    if (Number(payload.advantage_discount_cents || 0) > 0) line(`Avantage Weello : -${cents(payload.advantage_discount_cents)}`);
    gap(8);
    line(`TOTAL PAYE : ${cents(payload.total_paid_cents)}`, { size: 14, strong: true, color: gold });
  } else {
    line(`Beneficiaire : ${payload.beneficiary_name || "-"}`, { strong: true });
    line(`Qualite : ${payload.beneficiary_type === "partner" ? "Partenaire independant" : "Livreur independant"}`);
    if (payload.beneficiary_address) line(`Adresse : ${payload.beneficiary_address}`);
    if (payload.legal_identifier) line(`SIRET : ${payload.legal_identifier}`);
    line(`Periode : du ${displayDate(payload.period_start)} au ${displayDate(payload.period_end)}`);
    line(`Date du paiement : ${displayDate(payload.paid_at)}`);
    line(`Reference bancaire : ${payload.payment_reference || "-"}`);
    gap(12);
    line("COMMANDES INCLUSES", { size: 12, strong: true, color: gold });
    for (const item of payload.items || []) line(`#${String(item.order_id || "").slice(0, 8)} - ${displayDate(item.delivered_at)} - ${cents(item.amount_cents)}`);
    gap(8);
    line(`TOTAL VERSE : ${cents(payload.amount_cents)}`, { size: 14, strong: true, color: gold });
    gap(18);
    line("Ce document atteste du reversement enregistre par Weello pour la periode indiquee.", { size: 8 });
    line("Il ne constitue ni une fiche de paie ni une qualification juridique de la relation.", { size: 8 });
  }
  return pdf.save();
}

export async function sendFinancialDocumentEmail(document: FinancialDocument) {
  const email = document.recipient_email?.trim();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WEELLO_EMAIL_FROM || process.env.FOODIZ_EMAIL_FROM;
  if (!email) throw new Error("Recipient email is missing");
  if (!apiKey || !from) throw new Error("Missing Resend environment variables");

  try {
    const pdf = await renderFinancialDocumentPdf(document);
    const receipt = document.document_type === "client_payment_receipt";
    const result = await new Resend(apiKey).emails.send({
      from,
      to: email,
      subject: receipt ? `Votre reçu Weello ${document.document_number}` : `Votre bordereau Weello ${document.document_number}`,
      html: `<div style="font-family:Arial,sans-serif;color:#171717"><h2 style="color:#b58a3a">${receipt ? "Paiement confirmé" : "Reversement confirmé"}</h2><p>Bonjour,</p><p>${receipt ? "Votre paiement Weello a bien été enregistré." : "Votre règlement Weello a bien été enregistré pour la période indiquée."}</p><p>Le justificatif détaillé <strong>${document.document_number}</strong> est joint à cet email.</p><p>Weello</p></div>`,
      attachments: [{ filename: `${document.document_number}.pdf`, content: Buffer.from(pdf) }],
    });
    if (result.error) throw new Error(result.error.message);
    await adminSupabase.from("financial_document_email_events").insert({ document_id: document.id, recipient_email: email, status: "sent", provider_message_id: result.data?.id || null });
    await adminSupabase.from("financial_documents").update({ status: "sent", last_emailed_at: new Date().toISOString() }).eq("id", document.id);
    return result.data?.id;
  } catch (error: any) {
    await adminSupabase.from("financial_document_email_events").insert({ document_id: document.id, recipient_email: email, status: "failed", error_message: error?.message || "Email delivery failed" });
    await adminSupabase.from("financial_documents").update({ status: "email_failed", last_emailed_at: new Date().toISOString() }).eq("id", document.id);
    throw error;
  }
}
