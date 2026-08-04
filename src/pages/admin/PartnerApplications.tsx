import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

type DocumentType =
  | "registration_proof"
  | "liability_insurance"
  | "hygiene_training"
  | "sanitary_declaration"
  | "alcohol_license";

type PartnerDocument = {
  id: string;
  document_type: DocumentType;
  original_name: string;
  status: string;
  signed_url?: string | null;
  review_comment?: string | null;
};

type PartnerApplication = {
  id: string;
  user_id: string;
  business_name: string;
  siret?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  status: string;
  compliance_status: string;
  compliance_comment?: string | null;
  service_area_id?: string | null;
  establishment_type: string;
  handles_animal_products: boolean;
  sells_alcohol: boolean;
  requires_hygiene_proof: boolean;
  profiles?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  restaurant?: {
    id: string;
    status: string;
    is_active: boolean;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  service_area?: {
    id: string;
    city: string;
    department_code?: string | null;
    status: string;
  } | null;
  documents: PartnerDocument[];
};

const documentLabels: Record<DocumentType, string> = {
  registration_proof: "Immatriculation / RNE / Kbis",
  liability_insurance: "Responsabilité civile professionnelle",
  hygiene_training: "Formation hygiène alimentaire",
  sanitary_declaration: "Déclaration sanitaire",
  alcohol_license: "Licence alcool",
};

async function adminPartnerRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/admin/partner-applications", {
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

function requiredDocuments(item: PartnerApplication): DocumentType[] {
  const types: DocumentType[] = ["registration_proof", "liability_insurance"];
  if (item.requires_hygiene_proof) types.push("hygiene_training");
  if (item.handles_animal_products) types.push("sanitary_declaration");
  if (item.sells_alcohol) types.push("alcohol_license");
  return types;
}

export default function AdminPartnerApplicationsPage() {
  const [items, setItems] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [replacementDocuments, setReplacementDocuments] = useState<Record<string, DocumentType[]>>({});
  const [replacementLinks, setReplacementLinks] = useState<Record<string, string>>({});

  const loadItems = async () => {
    setLoading(true);
    try {
      const payload = await adminPartnerRequest();
      setItems(payload.applications || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const cities = useMemo(
    () => Array.from(new Set(items.map((item) => item.service_area?.city || item.city).filter(Boolean) as string[])).sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const itemCity = item.service_area?.city || item.city || "";
      const cityMatches = city === "all" || itemCity === city;
      const searchMatches = !query || [
        item.business_name,
        item.siret,
        itemCity,
        item.profiles?.email,
        item.profiles?.first_name,
        item.profiles?.last_name,
      ].some((value) => value?.toLowerCase().includes(query));
      return cityMatches && searchMatches;
    });
  }, [city, items, search]);

  const review = async (
    item: PartnerApplication,
    decision: "approve" | "request_replacement" | "reject",
  ) => {
    const selected = replacementDocuments[item.id] || [];
    if (decision === "request_replacement" && !selected.length) {
      toast.error("Sélectionnez au moins un document à remplacer.");
      return;
    }
    setBusy(item.id);
    try {
      const payload = await adminPartnerRequest("POST", {
        action: "review",
        applicationId: item.id,
        decision,
        comment: comments[item.id] || "",
        documentTypes: selected,
      });
      if (payload.replacementUploadUrl) {
        setReplacementLinks((current) => ({ ...current, [item.id]: payload.replacementUploadUrl }));
        await navigator.clipboard.writeText(payload.replacementUploadUrl).catch(() => undefined);
        toast.success("Lien privé copié. Aucun email n’a été envoyé automatiquement.");
      } else {
        toast.success(decision === "approve" ? "Dossier partenaire validé." : "Décision enregistrée.");
      }
      await loadItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const setOperationalStatus = async (item: PartnerApplication, status: "active" | "suspended") => {
    const reason = status === "suspended"
      ? window.prompt("Motif obligatoire de suspension :")?.trim() || ""
      : "";
    if (status === "suspended" && !reason) return;
    if (!item.restaurant) return toast.error("Établissement introuvable.");
    setBusy(item.id);
    try {
      await adminPartnerRequest("POST", {
        action: "set_operational_status",
        restaurantId: item.restaurant.id,
        status,
        reason,
      });
      toast.success(status === "active" ? "Établissement activé dans sa ville." : "Établissement suspendu.");
      await loadItems();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy("");
    }
  };

  const assignServiceArea = async (item: PartnerApplication) => {
    setBusy(item.id);
    try {
      await adminPartnerRequest("POST", { action: "assign_service_area", applicationId: item.id });
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

  const stats = useMemo(() => ({
    pending: items.filter((item) => ["documents_required", "pending_review", "replacement_requested"].includes(item.compliance_status)).length,
    approved: items.filter((item) => item.compliance_status === "approved").length,
    active: items.filter((item) => item.restaurant?.is_active).length,
    cities: new Set(items.map((item) => item.service_area_id || item.service_area?.id).filter(Boolean)).size,
  }), [items]);

  return (
    <AdminShell title="Partenaires" subtitle="Conformité documentaire, validation manuelle et activation par ville">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["À contrôler", stats.pending, AlertCircle, "text-weello-gold"],
          ["Dossiers validés", stats.approved, ShieldCheck, "text-weello-green"],
          ["Établissements actifs", stats.active, Store, "text-weello-green"],
          ["Villes représentées", stats.cities, MapPin, "text-weello-gold"],
        ].map(([label, value, Icon, color]: any[]) => (
          <article key={label} className="weello-card p-5">
            <Icon size={19} className={color} />
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
        <button onClick={() => void loadItems()} className="rounded-xl border border-weello-gold/20 px-4 py-3 text-weello-gold"><RefreshCw size={17} /></button>
      </div>

      {loading ? (
        <div className="weello-card animate-pulse p-8 text-center text-weello-gray">Chargement des dossiers privés…</div>
      ) : filtered.length === 0 ? (
        <div className="weello-card p-5 text-sm text-weello-gray">Aucun partenaire correspondant.</div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {filtered.map((item) => {
            const required = requiredDocuments(item);
            const dossierComplete = required.every((type) => item.documents.some((document) => document.document_type === type));
            const areaOperational = ["pilot", "open"].includes(item.service_area?.status || "");
            return (
              <article key={item.id} className="weello-card border-weello-gold/15 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-weello-cream">{item.business_name}</h2>
                    <p className="mt-1 text-xs text-weello-gray">
                      {item.service_area?.city || item.city || "Ville non classée"}
                      {item.service_area?.department_code ? ` (${item.service_area.department_code})` : ""}
                      {" · "}SIRET {item.siret || "manquant"}
                    </p>
                    <p className="mt-1 text-[10px] text-weello-gray">{item.profiles?.email} · {item.profiles?.phone}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] uppercase ${
                    item.compliance_status === "approved"
                      ? "border-weello-green/20 bg-weello-green/5 text-weello-green"
                      : item.compliance_status === "rejected"
                        ? "border-weello-red/20 bg-weello-red/5 text-weello-red"
                        : "border-weello-gold/20 bg-weello-gold/5 text-weello-gold"
                  }`}>{item.compliance_status}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/[0.02] p-3 text-[10px]">
                  <div><p className="text-weello-gray">Ville</p><p className={areaOperational ? "mt-1 text-weello-green" : "mt-1 text-weello-gold"}>{item.service_area?.status || "non classée"}</p></div>
                  <div><p className="text-weello-gray">Dossier</p><p className={item.compliance_status === "approved" ? "mt-1 text-weello-green" : "mt-1 text-weello-gold"}>{item.compliance_status === "approved" ? "Validé" : "À contrôler"}</p></div>
                  <div><p className="text-weello-gray">Vente</p><p className={item.restaurant?.is_active ? "mt-1 text-weello-green" : "mt-1 text-weello-gray"}>{item.restaurant?.is_active ? "Active" : "Inactive"}</p></div>
                </div>
                {!item.service_area_id && (
                  <button disabled={busy === item.id} onClick={() => void assignServiceArea(item)} className="mt-3 w-full rounded-xl border border-weello-gold/30 bg-weello-gold/10 px-3 py-3 text-xs font-semibold text-weello-gold disabled:opacity-40">Créer / attribuer la zone depuis l’adresse</button>
                )}

                <div className="mt-4 space-y-2">
                  {required.map((documentType) => {
                    const document = item.documents.find((candidate) => candidate.document_type === documentType);
                    const selected = (replacementDocuments[item.id] || []).includes(documentType);
                    return (
                      <div key={documentType} className={`flex items-center gap-3 rounded-2xl border p-3 ${document ? "border-weello-gold/15 bg-black/25" : "border-weello-red/20 bg-weello-red/5"}`}>
                        <button type="button" disabled={!document?.signed_url} onClick={() => document?.signed_url && window.open(document.signed_url, "_blank", "noopener,noreferrer")} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50">
                          {document ? <FileCheck2 size={17} className="shrink-0 text-weello-green" /> : <XCircle size={17} className="shrink-0 text-weello-red" />}
                          <span className="min-w-0">
                            <span className="block text-xs text-weello-cream">{documentLabels[documentType]}</span>
                            <span className="mt-1 block truncate text-[9px] text-weello-gray">{document?.original_name || "Document absent"}</span>
                          </span>
                          {document?.signed_url && <ExternalLink size={14} className="ml-auto shrink-0 text-weello-gold" />}
                        </button>
                        {document && (
                          <label className="flex items-center gap-2 text-[9px] text-weello-gray">
                            <input type="checkbox" checked={selected} onChange={() => toggleReplacement(item.id, documentType)} className="accent-[#D8A84F]" />
                            À remplacer
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>

                <textarea value={comments[item.id] ?? item.compliance_comment ?? ""} onChange={(event) => setComments((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Commentaire de contrôle ou motif précis…" className="mt-4 min-h-24 w-full rounded-2xl border border-weello-gold/15 bg-black/30 px-4 py-3 text-xs text-weello-cream outline-none focus:border-weello-gold" />

                {replacementLinks[item.id] && (
                  <button type="button" onClick={() => void navigator.clipboard.writeText(replacementLinks[item.id])} className="mt-3 w-full break-all rounded-xl border border-weello-gold/20 bg-weello-gold/5 p-3 text-left text-[10px] text-weello-gold">
                    Lien privé à transmettre manuellement : {replacementLinks[item.id]}
                  </button>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button disabled={busy === item.id || !dossierComplete || item.compliance_status === "approved"} onClick={() => void review(item, "approve")} className="weello-btn flex items-center justify-center gap-2 py-3 text-xs disabled:opacity-35"><CheckCircle2 size={15} />Valider dossier</button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "request_replacement")} className="rounded-xl border border-weello-gold/25 px-3 py-3 text-xs text-weello-gold disabled:opacity-35">Remplacement</button>
                  <button disabled={busy === item.id} onClick={() => void review(item, "reject")} className="rounded-xl border border-weello-red/25 px-3 py-3 text-xs text-weello-red disabled:opacity-35">Refuser</button>
                </div>

                {item.compliance_status === "approved" && (
                  <button
                    disabled={busy === item.id || !item.restaurant?.is_active}
                    onClick={() => void setOperationalStatus(item, "suspended")}
                    className="mt-3 w-full rounded-xl border border-weello-red/20 px-3 py-3 text-xs text-weello-red disabled:opacity-35"
                  >
                    {item.restaurant?.is_active ? "Suspendre la vente" : "Activation automatique en attente d’un livreur validé"}
                  </button>
                )}
                {!areaOperational && item.compliance_status === "approved" && (
                  <p className="mt-3 flex items-center gap-2 text-[10px] text-weello-gold"><FileText size={13} />La ville est préparée automatiquement. La livraison s’ouvrira dès qu’un livreur validé sera disponible.</p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </AdminShell>
  );
}
