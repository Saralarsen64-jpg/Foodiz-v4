import { FormEvent, useEffect, useState } from "react";
import { FileCheck2, FileText, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type DocumentType = "identity_front" | "identity_back" | "activity_proof";

const labels: Record<DocumentType, string> = {
  identity_front: "Pièce d’identité — recto",
  identity_back: "Pièce d’identité — verso",
  activity_proof: "Justificatif officiel d’activité",
};

export default function PrelaunchCourierDocuments() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const uploadToken = params.get("token") || "";
  const [requested, setRequested] = useState<DocumentType[]>([]);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/prelaunch/courier-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", uploadToken }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Lien invalide.");
        const replacementTypes = (payload.documents || [])
          .filter((document: any) => document.status === "replacement_requested")
          .map((document: any) => document.document_type as DocumentType);
        setRequested(replacementTypes);
        setComment(payload.reviewComment || "");
      } catch (statusError: any) {
        setError(statusError.message || "Ce lien n’est plus valable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uploadToken]);

  const selectFile = (documentType: DocumentType, file?: File) => {
    if (!file) return;
    const allowed = documentType === "activity_proof"
      ? ["image/jpeg", "image/png", "application/pdf"]
      : ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type) || file.size <= 0 || file.size > 8 * 1024 * 1024) {
      setError("Format invalide ou fichier supérieur à 8 Mo.");
      return;
    }
    setFiles((current) => ({ ...current, [documentType]: file }));
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!requested.length || requested.some((documentType) => !files[documentType])) {
      setError("Ajoutez chaque document demandé par Weello.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const uploaded = [];
      for (const documentType of requested) {
        const file = files[documentType]!;
        const prepareResponse = await fetch("/api/prelaunch/courier-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prepare",
            uploadToken,
            documentType,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
        const prepared = await prepareResponse.json();
        if (!prepareResponse.ok) throw new Error(prepared.error || "Dépôt impossible.");
        const { error: uploadError } = await supabase.storage
          .from("courier-documents")
          .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        uploaded.push({
          documentType,
          storagePath: prepared.path,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      }

      const completeResponse = await fetch("/api/prelaunch/courier-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", uploadToken, documents: uploaded }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Dossier non finalisé.");
      navigate("/prelaunch-confirmed?role=livreur", { replace: true });
    } catch (submitError: any) {
      setError(submitError.message || "Le transfert a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-foodiz-black px-5 py-10 text-foodiz-cream">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-foodiz-gold/25 bg-foodiz-card p-6 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-9">
        <img src="/images/weello-wordmark.png" alt="Weello" className="mx-auto w-64 max-w-full rounded-2xl" />
        <div className="mt-7 flex items-center gap-3"><ShieldCheck className="text-foodiz-gold" /><div><p className="text-[10px] uppercase tracking-widest text-foodiz-gold">Lien privé et temporaire</p><h1 className="foodiz-title mt-1 text-2xl">Remplacer mes justificatifs</h1></div></div>

        {loading ? <p className="mt-8 animate-pulse text-sm text-foodiz-gray">Vérification du lien…</p> : error && !requested.length ? (
          <div className="mt-7 rounded-2xl border border-foodiz-red/25 bg-foodiz-red/10 p-4 text-sm text-foodiz-red">{error}</div>
        ) : requested.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-foodiz-green/25 bg-foodiz-green/10 p-4 text-sm text-foodiz-green">Aucun remplacement n’est demandé.</div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            {comment && <div className="rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/5 p-4"><p className="text-[10px] uppercase tracking-widest text-foodiz-gold">Commentaire Weello</p><p className="mt-2 text-sm text-foodiz-cream">{comment}</p></div>}
            {requested.map((documentType) => (
              <label key={documentType} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-foodiz-gold/20 bg-black/30 p-4">
                <input type="file" required accept={documentType === "activity_proof" ? "image/jpeg,image/png,application/pdf" : "image/jpeg,image/png"} capture={documentType === "activity_proof" ? undefined : "environment"} className="sr-only" onChange={(event) => selectFile(documentType, event.target.files?.[0])} />
                {files[documentType] ? <FileCheck2 className="text-foodiz-green" /> : <FileText className="text-foodiz-gold" />}
                <span><span className="block text-sm font-semibold">{labels[documentType]}</span><span className="mt-1 block text-[10px] text-foodiz-gray">{files[documentType]?.name || "Prendre une photo ou choisir un fichier"}</span></span>
              </label>
            ))}
            {error && <div className="rounded-2xl border border-foodiz-red/25 bg-foodiz-red/10 p-3 text-sm text-foodiz-red">{error}</div>}
            <button disabled={submitting} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50">{submitting && <LoaderCircle size={18} className="animate-spin" />}{submitting ? "Transfert sécurisé…" : "Renvoyer les documents"}</button>
          </form>
        )}
        <Link to="/waitlist" className="mt-7 block text-center text-xs text-foodiz-gold">Retour à Weello</Link>
      </section>
    </main>
  );
}
