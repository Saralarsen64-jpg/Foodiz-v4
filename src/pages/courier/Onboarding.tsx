import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, Building2, CheckCircle2, FileCheck2, FileText, MapPin, Phone, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import CourierShell from "../../components/CourierShell";
import { supabase } from "../../lib/supabase";

type DocumentType = "identity_front" | "identity_back" | "activity_proof";

const documentLabels: Record<DocumentType, string> = {
  identity_front: "Pièce d’identité — recto",
  identity_back: "Pièce d’identité — verso",
  activity_proof: "Justificatif officiel d’activité",
};

async function courierDocumentRequest(method = "GET", body?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/api/courier-documents", {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || ""}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Dépôt impossible.");
  return payload;
}

export default function CourierOnboarding() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", city: "", vehicle: "bike", legalName: "", siret: "", address: "", postalCode: "" });
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [documentStatuses, setDocumentStatuses] = useState<Partial<Record<DocumentType, string>>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: profile }, { data: application }, documentsPayload] = await Promise.all([
        supabase.from("profiles").select("full_name,phone,city,address,postal_code").eq("id", user.id).maybeSingle(),
        supabase.from("courier_applications").select("city,vehicle_type,legal_name,siret,address,postal_code").eq("user_id", user.id).maybeSingle(),
        courierDocumentRequest().catch(() => ({ documents: [] })),
      ]);
      setForm({ name: profile?.full_name || "", phone: profile?.phone || "", city: application?.city || profile?.city || "", vehicle: application?.vehicle_type || "bike", legalName: application?.legal_name || profile?.full_name || "", siret: application?.siret || "", address: application?.address || profile?.address || "", postalCode: application?.postal_code || profile?.postal_code || "" });
      setDocumentStatuses(Object.fromEntries((documentsPayload.documents || []).map((document: any) => [document.document_type, document.status])));
    })();
  }, []);

  const selectFile = (documentType: DocumentType, file?: File) => {
    if (!file) return;
    const allowed = documentType === "activity_proof"
      ? ["image/jpeg", "image/png", "application/pdf"]
      : ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) return toast.error("Format invalide pour ce justificatif.");
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) return toast.error("Chaque document doit peser moins de 8 Mo.");
    setFiles((current) => ({ ...current, [documentType]: file }));
  };

  const uploadFiles = async () => {
    const entries = Object.entries(files) as [DocumentType, File][];
    if (!entries.length) return;
    const uploaded = [];
    for (const [documentType, file] of entries) {
      const prepared = await courierDocumentRequest("POST", {
        action: "prepare",
        documentType,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      const { error } = await supabase.storage
        .from("courier-documents")
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      uploaded.push({
        documentType,
        storagePath: prepared.path,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }
    await courierDocumentRequest("POST", { action: "complete", documents: uploaded });
  };

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.legalName.trim() || !form.address.trim()) return toast.error("Complétez toutes les informations professionnelles.");
    if (!/^\d{14}$/.test(form.siret)) return toast.error("Le SIRET doit contenir exactement 14 chiffres.");
    if (!/^\d{5}$/.test(form.postalCode)) return toast.error("Le code postal doit contenir 5 chiffres.");
    const missingDocuments = (Object.keys(documentLabels) as DocumentType[]).filter((documentType) => !documentStatuses[documentType] && !files[documentType]);
    if (missingDocuments.length) return toast.error("Ajoutez les trois justificatifs obligatoires.");

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non connecté.");
      const results = await Promise.all([
        supabase.from("profiles").update({ full_name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim(), address: form.address.trim(), postal_code: form.postalCode }).eq("id", user.id),
        supabase.from("courier_applications").update({ city: form.city.trim(), vehicle_type: form.vehicle, legal_name: form.legalName.trim(), siret: form.siret, address: form.address.trim(), postal_code: form.postalCode, updated_at: new Date().toISOString() }).eq("user_id", user.id),
      ]);
      const error = results.find((result) => result.error)?.error;
      if (error) throw error;
      await uploadFiles();
      toast.success("Dossier livreur envoyé pour contrôle.");
      window.setTimeout(() => navigate("/courier/validation-status"), 700);
    } catch (error: any) {
      toast.error(error.message || "Impossible d'envoyer le dossier.");
      setSending(false);
    }
  };

  const field = (key: "name" | "phone" | "city" | "legalName" | "siret" | "address" | "postalCode", placeholder: string, Icon: typeof UserRound) => <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4"><Icon size={17} className="text-foodiz-gold"/><input value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} inputMode={key === "siret" || key === "postalCode" ? "numeric" : undefined} maxLength={key === "siret" ? 14 : key === "postalCode" ? 5 : undefined} className="w-full bg-transparent py-4 text-foodiz-cream outline-none"/></div>;

  return <CourierShell title="Rejoindre la flotte" back="/courier">
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-foodiz-gold/[0.06] p-6"><FileText size={25} className="text-foodiz-gold"/><h2 className="foodiz-title mt-4 text-2xl">Votre dossier livreur</h2><p className="mt-2 text-sm text-foodiz-gray">Votre accès aux courses reste bloqué tant que Foodiz n’a pas validé votre identité et votre activité.</p></section>
    <section className="foodiz-card mt-4 space-y-4 p-5">
      {field("name", "Nom complet", UserRound)}
      {field("phone", "Téléphone", Phone)}
      {field("legalName", "Nom légal / raison sociale", Building2)}
      {field("siret", "SIRET (14 chiffres)", FileText)}
      {field("address", "Adresse professionnelle", MapPin)}
      {field("postalCode", "Code postal", MapPin)}
      {field("city", "Ville", MapPin)}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4"><Bike size={17} className="text-foodiz-gold"/><select value={form.vehicle} onChange={(event) => setForm((current) => ({ ...current, vehicle: event.target.value }))} className="w-full bg-transparent py-4 text-foodiz-cream outline-none"><option className="bg-foodiz-card" value="bike">Vélo</option><option className="bg-foodiz-card" value="scooter">Scooter</option><option className="bg-foodiz-card" value="motorcycle">Moto</option><option className="bg-foodiz-card" value="car">Voiture</option></select></div>

      <div className="rounded-xl border border-foodiz-gold/15 bg-foodiz-gold/5 p-3 text-xs text-foodiz-gray">Photos nettes, sans reflet, avec les quatre bords visibles. Le justificatif d’activité peut être un avis SIRENE/RNE, une attestation INSEE, un extrait K/Kbis ou un document officiel équivalent.</div>
      {(Object.keys(documentLabels) as DocumentType[]).map((documentType) => {
        const selected = files[documentType];
        const status = documentStatuses[documentType];
        return <label key={documentType} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <input type="file" accept={documentType === "activity_proof" ? "image/jpeg,image/png,application/pdf" : "image/jpeg,image/png"} capture={documentType === "activity_proof" ? undefined : "environment"} className="sr-only" onChange={(event) => selectFile(documentType, event.target.files?.[0])}/>
          {selected || status ? <FileCheck2 size={18} className="text-foodiz-green"/> : <FileText size={18} className="text-foodiz-gold"/>}
          <span className="min-w-0"><span className="block text-sm text-foodiz-cream">{documentLabels[documentType]}</span><span className="mt-1 block truncate text-[10px] text-foodiz-gray">{selected?.name || (status ? `Statut : ${status}` : "Ajouter le document")}</span></span>
        </label>;
      })}

      <button onClick={submit} disabled={sending} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50">{sending ? <CheckCircle2 size={18}/> : <FileText size={18}/>} {sending ? "Envoi..." : "Envoyer mon dossier"}</button>
    </section>
  </CourierShell>;
}
