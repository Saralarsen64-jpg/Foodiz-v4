import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { loadFinancialDocument, renderFinancialDocumentPdf, sendFinancialDocumentEmail } from "./_lib/financial-documents.js";

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  const documentId = event.queryStringParameters?.id || (event.body ? JSON.parse(event.body).documentId : null);
  if (!documentId) return { statusCode: 400, body: JSON.stringify({ error: "Document id required" }) };

  try {
    const document = await loadFinancialDocument(documentId);
    const { data: profile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";
    if (!isAdmin && document.recipient_id !== user.id) return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };

    if (event.httpMethod === "GET") {
      const pdf = await renderFinancialDocumentPdf(document);
      return { statusCode: 200, isBase64Encoded: true, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${document.document_number}.pdf"`, "Cache-Control": "private, no-store" }, body: Buffer.from(pdf).toString("base64") };
    }
    if (event.httpMethod === "POST") {
      if (!isAdmin && document.status === "sent") return { statusCode: 403, body: JSON.stringify({ error: "Only an administrator can resend this document" }) };
      const messageId = await sendFinancialDocumentEmail(document);
      return { statusCode: 200, body: JSON.stringify({ sent: true, messageId }) };
    }
    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (error) {
    console.error("Financial document operation failed", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Le document financier n'a pas pu être traité.",
      }),
    };
  }
};

export { handler };
