import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ExternalLink,
  Download,
  FileCheck2,
  FileText,
  MapPin,
  RefreshCw,
  Search,
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
  service_area_id?: string | null;
  availability_slots?: string[] | null;
  availability_days?: string[] | null;
  availability_flexible?: boolean | null;
  service_area?: { id: string; city: string; department_code?: string | null; status: string } | null;
  profiles?: { first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null } | null;
  documents: CourierDocument[];
};

const documentLabels: Record<DocumentType, string> = {
  identity_front: "Pièce d’identité — recto",
  identity_back: "Pièce d’identité — verso",
  activity_proof: "Justificatif officiel d’activité",
};

const slotLabels: Record<string, string> = {
  matin: "matin",
  midi: "midi",
  apres_midi: "après-midi",
  soiree: "soirée",
  nuit: "nuit",
  week_end: "week-end",
};

const dayLabels: Record<string, string> = {
  lundi: "lun.",
  mardi: "mar.",
  mercredi: "mer.",
  jeudi: "jeu.",
  vendredi: "ven.",
  samedi: "sam.",
  dimanche: "dim.",
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
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");

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

  const openDocument = async (document: CourierDocument, download = false) => {
    const popup = window.open("", "_blank");
    try {
      const payload = await adminCourierRequest("POST", {
        action: "get_document_url",
        documentId: document.id,
        download,
      });
      if (!payload.signedUrl) throw new Error("Lien du justificatif indisponible.");
      if (popup) {
        popup.opener = null;
        popup.location.href = payload.signedUrl;
      } else {
        window.location.assign(payload.signedUrl);
      }
    } catch (error: any) {
      popup?.close();
      toast.error(error.message || "Impossible d’ouvrir ce justificatif.");
    }
  };

  const assignServiceArea = async (item: CourierApplicationRow) => {
    setBusy(item.id);
    try {
      await adminCourierRequest("POST", { action: "assign_service_area", applicationId: item.id });
      toast.success("Zone de service créée et attribuée.");
      await loadItems();
    } catch (error: any) { toast.error(error.message); } finally { setBusy(""); }
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

  const cities = useMemo(
    () => Array.from(new Set(items.map((item) => item.service_area?.city || item.city).filter(Boolean) as string[])).sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const itemCity = item.service_area?.city || item.city || "";
      return (city === "all" || itemCity === city) && (
        !query
        || [item.legal_name, item.siret, itemCity, item.profiles?.email]
          .some((value) => value?.toLowerCase().includes(query))
      );
    });
  }, [city, items, search]);

  const stats = useMemo(() => ({
    pending: items.filter((item) => ["pending", "missing_documents"].includes(item.status || "pending")).length,
    validated: items.filter((item) => item.status === "validated").length,
    incomplete: items.filter((item) => item.documents.length !== 3 || !item.siret || !item.legal_name || !item.address || !item.postal_code).length,
  }), [items]);

  return (
    <AdminShell title="Livreurs" subtitle="Contrôle privé de l’identité, de l’activité et de l’accès aux courses">
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "À vérifier", value: stats.pending, Icon: AlertCircle, color: "text-weello-gold" },
          { label: "Validés", value: stats.validated, Icon: CheckCircle2, color: "text-weello-green" },
          { label: "Incomplets", value: stats.incomplete, Icon: FileText, color: "text-weello-red" },
        ].map(({ label, value, Icon, color }) => (
          <article key={label} className="weello-card border-weello-gold/15 p-5">
            <Icon size={20} className={color} />
            <p className="mt-4 text-[10px] uppercase tracking-widest text-weello-gray">{label}</p>
            <p className="mt-2 text-3xl font-serif italic text-weello-cream">{value}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <label className="weello-card flex items-center gap-3 px-4 py-3">
          <Search size={17} className="text-weello-gold" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, ville, email ou SIRET" className="w-full bg-transparent text-sm outline-none placeholder:text-weello-gray" />
        </label>
        <select value={city} onChange={(event) => setCity(event.target.value)} className="weello-card bg-weello-card px-4 py-3 text-sm text-weello-cream outline-none">
          <option value="all">Toutes les villes</option>
          {cities.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button onClick={() => void loadItems()} className="flex items-center gap-2 text-xs text-weello-gold">
          <RefreshCw size={15} />Actualiser
        </button>
      </div>

      {loading ? (
        <div className="weello-card animate-pulse p-8 text-center text-weello-gray">Chargement des dossiers privés…</div>
      ) : filtered.length === 0 ? (
        <div className="weello-card p-5 text-sm text-weello-gray">Aucune demande livreur.</div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {filtered.map((item) => {
            const fullName = [item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(" ");
            const documentsComplete = item.documents.length === 3;
            const legalComplete = Boolean(item.legal_name && item.siret && item.address && item.postal_code);
            const canApprove = documentsComplete && legalComplete;
            return (
              <article key={item.id} className="weello-card border-weello-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,0.10),transparent_40%)] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Bike size={18} className="text-weello-gold" />
                      <h2 className="font-semibold text-weello-cream">{fullName || item.profiles?.email || "Livreur"}</h2>
                    </div>
                    <p className="mt-1 text-xs text-weello-gray">{item.service_area?.city || item.city || "Ville non précisée"} · {item.vehicle_type || "Véhicule non précisé"}</p>
                    <p className="mt-1 text-[10px] text-weello-gray">{item.profiles?.email} · {item.profiles?.phone}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
                    item.status === "validated"
                      ? "border-weello-green/20 bg-weello-green/5 text-weello-green"
                      : item.status === "rejected"
                        ? "border-weello-red/20 bg-weello-red/5 text-weello-red"
                        : "border-weello-gold/20 bg-weello-gold/10 text-weello-gold"
                  }`}>
                    {item.document_review_status || item.status || "pending"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs">
                  <div>
                    <p className="flex items-center gap-2 text-weello-gray"><MapPin size={13} />Ville opérationnelle</p>
                    <p className="mt-1 text-weello-cream">{item.service_area?.status || "non classée"}</p>
                  </div>
                  <div>
                    <p className="text-weello-gray">Dossier</p>
                    <p className={item.status === "validated" ? "mt-1 text-weello-green" : "mt-1 text-weello-gold"}>{item.status === "validated" ? "Validé" : "À contrôler"}</p>
                  </div>
                </div>
                {!item.service_area_id && (
                  <button disabled={busy === item.id} onClick={() => void assignServiceArea(item)} className="mt-3 w-full rounded-xl border border-weello-gold/30 bg-weello-gold/10 px-3 py-3 text-xs font-semibold text-weello-gold disabled:opacity-40">Créer / attribuer la zone depuis l’adresse</button>
                )}

                <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs">
                  <p className="font-semibold text-weello-cream">Disponibilités souhaitées</p>
                  <p className="mt-2 text-weello-gray">
                    Créneaux : {(item.availability_slots || []).map((slot) => slotLabels[slot] || slot).join(", ") || "non précisés"}
                  </p>
                  <p className="mt-1 text-weello-gray">
                    Jours : {(item.availability_days || []).map((day) => dayLabels[day] || day).join(", ") || "non précisés"}
                  </p>
                  {item.availability_flexible && <p className="mt-2 text-weello-gold">Profil flexible : peut accepter d’autres créneaux.</p>}
                </div>

                <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs text-weello-gray">
                  <p className="flex items-center gap-2 text-weello-cream">
                    <ShieldCheck size={14} className={legalComplete ? "text-weello-green" : "text-weello-red"} />
                    {item.legal_name || "Identité légale manquante"}
                  </p>
                  <p className="mt-2">SIRET : {item.siret || "manquant"}</p>
                  <p className="mt-1">Adresse : {[item.address, item.postal_code, item.city].filter(Boolean).join(", ") || "manquante"}</p>
                  <p className="mt-1">Priorité dispatch : {item.dispatch_priority_score ?? 100}/100</p>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="px-1 text-[10px] text-weello-gray">
                    Justificatifs conservés dans l’espace privé Weello et accessibles à tout moment.
                  </p>
                  {(["identity_front", "identity_back", "activity_proof"] as DocumentType[]).map((documentType) => {
                    const document = item.documents.find((candidate) => candidate.document_type === documentType);
                    const replacementSelected = (replacementDocuments[item.id] || []).includes(documentType);
                    return (
                      <div key={documentType} className={`flex items-center gap-3 rounded-2xl border p-3 ${document ? "border-weello-gold/15 bg-black/25" : "border-weello-red/20 bg-weello-red/5"}`}>
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {document ? <FileCheck2 size={17} className="shrink-0 text-weello-green" /> : <XCircle size={17} className="shrink-0 text-weello-red" />}
                          <span className="min-w-0">
                            <span className="block text-xs text-weello-cream">{documentLabels[documentType]}</span>
                            <span className="mt-1 block truncate text-[9px] text-weello-gray">{document?.original_name || "Document absent"}</span>
                          </span>
                        </div>
                        {document && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => void openDocument(document)} aria-label={`Voir ${documentLabels[documentType]}`} className="rounded-lg border border-weello-gold/20 p-2 text-weello-gold" title="Voir">
                              <ExternalLink size={14} />
                            </button>
                            <button type="button" onClick={() => void openDocument(document, true)} aria-label={`Télécharger ${documentLabels[documentType]}`} className="rounded-lg border border-weello-gold/20 p-2 text-weello-gold" title="Télécharger">
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                        {document && (
                          <label className="flex shrink-0 items-center gap-2 text-[9px] text-weello-gray">
                            <input type="checkbox" checked={replacementSelected} onChange={() => toggleReplacement(item.id, documentType)} className="accent-[#D8A84F]" />
                            À remplacer
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 text-xs">
                  <label className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-weello-gray">
                    <input type="checkbox" checked={identityChecks[item.id] || false} onChange={(event) => setIdentityChecks((current) => ({ ...current, [item.id]: event.target.checked }))} className="mt-0.5 accent-[#D8A84F]" />
                    Le nom de la pièce d’identité correspond au profil déclaré.
                  </label>
                  <label className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-weello-gray">
                    <input type="checkbox" checked={businessChecks[item.id] || false} onChange={(event) => setBusinessChecks((current) => ({ ...current, [item.id]: event.target.checked }))} className="mt-0.5 accent-[#D8A84F]" />
                    Le justificatif d’activité correspond au nom et au SIRET déclarés.
                  </label>
                </div>

                <textarea
                  value={comments[item.id] ?? item.document_review_comment ?? ""}
                  onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))}
                  placeholder="Commentaire de contrôle ou motif précis du refus…"
                  className="mt-4 min-h-24 w-full rounded-2xl border border-weello-gold/15 bg-black/30 px-4 py-3 text-xs text-weello-cream outline-none focus:border-weello-gold"
                />
                {replacementLinks[item.id] && (
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(replacementLinks[item.id]).then(() => toast.success("Lien copié.")).catch(() => toast.error("Copiez le lien manuellement."))}
                    className="mt-3 w-full break-all rounded-xl border border-weello-gold/20 bg-weello-gold/5 p-3 text-left text-[10px] text-weello-gold"
                  >
                    Lien privé à transmettre manuellement : {replacementLinks[item.id]}
                  </button>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button disabled={busy === item.id || !canApprove} onClick={() => void review(item, "approve")} className="weello-btn flex items-center justify-center gap-2 py-3 text-xs disabled:opacity-40">
                    <CheckCircle2 size={15} />Valider
                  </button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "request_replacement")} className="rounded-xl border border-weello-gold/25 px-3 py-3 text-xs text-weello-gold disabled:opacity-40">
                    Demander un remplacement
                  </button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "reject")} className="rounded-xl border border-weello-red/25 px-3 py-3 text-xs text-weello-red disabled:opacity-40">
                    Refuser
                  </button>
                </div>
                {item.status === "validated" && item.document_review_status === "approved" && (
                  <p className="mt-3 rounded-xl border border-weello-green/20 bg-weello-green/5 px-3 py-3 text-xs text-weello-green">
                    Livreur validé. Les courses seront proposées dès que sa ville sera opérationnelle.
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
