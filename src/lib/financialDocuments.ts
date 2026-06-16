import { supabase } from "./supabase";

async function authorizedRequest(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée");
  const response = await fetch(url, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Opération impossible");
  }
  return response;
}

export async function downloadFinancialDocument(documentId: string, filename: string) {
  const response = await authorizedRequest(`/api/financial-document?id=${encodeURIComponent(documentId)}`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url; anchor.download = `${filename}.pdf`; anchor.click();
  URL.revokeObjectURL(url);
}

export async function emailFinancialDocument(documentId: string) {
  await authorizedRequest("/api/financial-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId }) });
}
