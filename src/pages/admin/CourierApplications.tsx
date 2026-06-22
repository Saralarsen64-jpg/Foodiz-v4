import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type DocumentType = "identity_front" | "identity_back" | "activity_proof";

type CourierDocument = {
  id: string;
  document_type: DocumentType;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  review_comment?: string | null;
  signed_url?: string | null;
};

type CourierApplicationRow = {
  id: string;
  user_id: string;
  city: string | null;
  vehicle_type: string | null;
  legal_name?: string | null;
  siret?: string | null;
  address?: string | null;
  postal_code?: string | null;
  status: string | null;
  document_review_status?: string | null;
  document_review_comment?: string | null;
  identity_name_confirmed?: boolean;
  business_identity_confirmed?: boolean;
  dispatch_priority_score?: number;
  created_at: string | null;
  profiles?: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
  documents: CourierDocument[];
};

const documentLabels: Record<DocumentType, string> = {
  identity_front: "Pièce d’identité — recto",
  identity_back: "Pièce d’identité — verso",
  activity_proof: "Justificatif officiel d’activité",
};

async function adminCourierRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/admin/courier-applications", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Opération impossible.");
  return payload;
}

export default function AdminCourierApplicationsPage() {
  const [items, setItems] = useState<CourierApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [identityChecks, setIdentityChecks] = useState<Record<string, boolean>>({});
  const [businessChecks, setBusinessChecks] = useState<Record<string, boolean>>({});
  const [replacementDocuments, setReplacementDocuments] = useState<Record<string, DocumentType[]>>({});
  const [replacementLinks, setReplacementLinks] = useState<Record<string, string>>({});

  const loadItems = async () => {
    setLoading(true);
    try {
      const payload = await adminCourierRequest();
      setItems(payload.applications || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const review = async (item: CourierApplicationRow, decision: "approve" | "request_replacement" | "reject") => {
    if (decision === "approve" && (!identityChecks[item.id] || !businessChecks[item.id])) {
      toast.error("Confirmez les deux concordances d’identité avant validation.");
      return;
    }
    if (decision === "request_replacement" && !(replacementDocuments[item.id] || []).length) {
      toast.error("Sélectionnez au moins un document à remplacer.");
      return;
    }
    setBusy(item.id);
    try {
      const payload = await adminCourierRequest("POST", {
        applicationId: item.id,
        decision,
        comment: comments[item.id] || "",
        identityNameConfirmed: identityChecks[item.id] === true,
        businessIdentityConfirmed: businessChecks[item.id] === true,
        documentTypes: replacementDocuments[item.id] || [],
      });
      if (payload.replacementUploadUrl) {
        setReplacementLinks((current) => ({ ...current, [item.id]: payload.replacementUploadUrl }));
        await navigator.clipboard.writeText(payload.replacementUploadUrl).catch(() => undefined);
        toast.success("Lien privé de remplacement copié. Aucun email n’a été envoyé automatiquement.");
      }
      toast.success(decision === "approve" ? "Livreur validé." : decision === "reject" ? "Dossier refusé." : "Remplacement demandé.");
      await loadItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const toggleReplacement = (applicationId: string, documentType: DocumentType) => {
    setReplacementDocuments((current) => {
      const selected = current[applicationId] || [];
      return {
        ...current,
        [applicationId]: selected.includes(documentType)
          ? selected.filter((value) => value !== documentType)
          : [...selected, documentType],
      };
    });
  };

  const stats = useMemo(() => ({
    pending: items.filter((item) => ["pending", "missing_documents"].includes(item.status || "pending")).length,
    validated: items.filter((item) => item.status === "validated").length,
    incomplete: items.filter((item) => item.documents.length !== 3 || !item.siret || !item.legal_name || !item.address || !item.postal_code).length,
  }), [items]);

  return (
    <AdminShell title="Livreurs" subtitle="Contrôle privé de l’identité, de l’activité et de l’accès aux courses">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "À vérifier", value: stats.pending, Icon: AlertCircle, color: "text-foodiz-gold" },
          { label: "Validés", value: stats.validated, Icon: CheckCircle2, color: "text-foodiz-green" },
          { label: "Incomplets", value: stats.incomplete, Icon: FileText, color: "text-foodiz-red" },
        ].map(({ label, value, Icon, color }) => (
          <article key={label} className="foodiz-card border-foodiz-gold/15 p-5">
            <Icon size={20} className={color} />
            <p className="mt-4 text-[10px] uppercase tracking-widest text-foodiz-gray">{label}</p>
            <p className="mt-2 text-3xl font-serif italic text-foodiz-cream">{value}</p>
          </article>
        ))}
      </section>

      <div className="flex justify-end">
        <button onClick={() => void loadItems()} className="flex items-center gap-2 text-xs text-foodiz-gold">
          <RefreshCw size={15} />Actualiser
        </button>
      </div>

      {loading ? (
        <div className="foodiz-card animate-pulse p-8 text-center text-foodiz-gray">Chargement des dossiers privés…</div>
      ) : items.length === 0 ? (
        <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune demande livreur.</div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {items.map((item) => {
            const fullName = [item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(" ");
            const documentsComplete = item.documents.length === 3;
            const legalComplete = Boolean(item.legal_name && item.siret && item.address && item.postal_code);
            const canApprove = documentsComplete && legalComplete;
            return (
              <article key={item.id} className="foodiz-card border-foodiz-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.10),transparent_40%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bike size={18} className="text-foodiz-gold" />
                      <h2 className="font-semibold text-foodiz-cream">{fullName || item.profiles?.email || "Livreur"}</h2>
                    </div>
                    <p className="mt-1 text-xs text-foodiz-gray">{item.city || "Ville non précisée"} · {item.vehicle_type || "Véhicule non précisé"}</p>
                    <p className="mt-1 text-[10px] text-foodiz-gray">{item.profiles?.email} · {item.profiles?.phone}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
                    item.status === "validated"
                      ? "border-foodiz-green/20 bg-foodiz-green/5 text-foodiz-green"
                      : item.status === "rejected"
                        ? "border-foodiz-red/20 bg-foodiz-red/5 text-foodiz-red"
                        : "border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"
                  }`}>
                    {item.document_review_status || item.status || "pending"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-foodiz-gray">
                  <p className="flex items-center gap-2 text-foodiz-cream">
                    <ShieldCheck size={14} className={legalComplete ? "text-foodiz-green" : "text-foodiz-red"} />
                    {item.legal_name || "Identité légale manquante"}
                  </p>
                  <p className="mt-2">SIRET : {item.siret || "manquant"}</p>
                  <p className="mt-1">Adresse : {[item.address, item.postal_code, item.city].filter(Boolean).join(", ") || "manquante"}</p>
                  <p className="mt-1">Priorité dispatch : {item.dispatch_priority_score ?? 100}/100</p>
                </div>

                <div className="mt-4 space-y-2">
                  {(["identity_front", "identity_back", "activity_proof"] as DocumentType[]).map((documentType) => {
                    const document = item.documents.find((candidate) => candidate.document_type === documentType);
                    const replacementSelected = (replacementDocuments[item.id] || []).includes(documentType);
                    return (
                      <div key={documentType} className={`flex items-center gap-3 rounded-2xl border p-3 ${document ? "border-foodiz-gold/15 bg-black/25" : "border-foodiz-red/20 bg-foodiz-red/5"}`}>
                        <button
                          type="button"
                          disabled={!document?.signed_url}
                          onClick={() => document?.signed_url && window.open(document.signed_url, "_blank", "noopener,noreferrer")}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                        >
                          {document ? <FileCheck2 size={17} className="shrink-0 text-foodiz-green" /> : <XCircle size={17} className="shrink-0 text-foodiz-red" />}
                          <span className="min-w-0">
                            <span className="block text-xs text-foodiz-cream">{documentLabels[documentType]}</span>
                            <span className="mt-1 block truncate text-[9px] text-foodiz-gray">{document?.original_name || "Document absent"}</span>
                          </span>
                          {document?.signed_url && <ExternalLink size={14} className="ml-auto shrink-0 text-foodiz-gold" />}
                        </button>
                        {document && (
                          <label className="flex shrink-0 items-center gap-2 text-[9px] text-foodiz-gray">
                            <input type="checkbox" checked={replacementSelected} onChange={() => toggleReplacement(item.id, documentType)} className="accent-[#D8A84F]" />
                            À remplacer
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 text-xs">
                  <label className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-foodiz-gray">
                    <input type="checkbox" checked={identityChecks[item.id] || false} onChange={(event) => setIdentityChecks((current) => ({ ...current, [item.id]: event.target.checked }))} className="mt-0.5 accent-[#D8A84F]" />
                    Le nom de la pièce d’identité correspond au profil déclaré.
                  </label>
                  <label className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-foodiz-gray">
                    <input type="checkbox" checked={businessChecks[item.id] || false} onChange={(event) => setBusinessChecks((current) => ({ ...current, [item.id]: event.target.checked }))} className="mt-0.5 accent-[#D8A84F]" />
                    Le justificatif d’activité correspond au nom et au SIRET déclarés.
                  </label>
                </div>

                <textarea
                  value={comments[item.id] ?? item.document_review_comment ?? ""}
                  onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Commentaire de contrôle ou motif précis du refus…"
                  className="mt-4 min-h-24 w-full rounded-2xl border border-foodiz-gold/15 bg-black/30 px-4 py-3 text-xs text-foodiz-cream outline-none focus:border-foodiz-gold"
                />
                {replacementLinks[item.id] && (
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(replacementLinks[item.id]).then(() => toast.success("Lien copié.")).catch(() => toast.error("Copiez le lien manuellement."))}
                    className="mt-3 w-full break-all rounded-xl border border-foodiz-gold/20 bg-foodiz-gold/5 p-3 text-left text-[10px] text-foodiz-gold"
                  >
                    Lien privé à transmettre manuellement : {replacementLinks[item.id]}
                  </button>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button disabled={busy === item.id || !canApprove} onClick={() => void review(item, "approve")} className="foodiz-btn flex items-center justify-center gap-2 py-3 text-xs disabled:opacity-40">
                    <CheckCircle2 size={15} />Valider
                  </button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "request_replacement")} className="rounded-xl border border-foodiz-gold/25 px-3 py-3 text-xs text-foodiz-gold disabled:opacity-40">
                    Demander un remplacement
                  </button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "reject")} className="rounded-xl border border-foodiz-red/25 px-3 py-3 text-xs text-foodiz-red disabled:opacity-40">
                    Refuser
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
