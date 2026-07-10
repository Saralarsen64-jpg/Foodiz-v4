import { FormEvent, useEffect, useState } from "react";
import { FileCheck2, FileText, LoaderCircle, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type DocumentType =
  | "registration_proof"
  | "liability_insurance"
  | "hygiene_training"
  | "sanitary_declaration"
  | "alcohol_license";

const labels: Record<DocumentType, string> = {
  registration_proof: "Justificatif d’immatriculation",
  liability_insurance: "Responsabilité civile professionnelle",
  hygiene_training: "Formation à l’hygiène alimentaire",
  sanitary_declaration: "Déclaration sanitaire applicable",
  alcohol_license: "Licence de vente d’alcool",
};

export default function PrelaunchPartnerDocuments() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const professionalMode = params.get("mode") === "professional";
  const endpoint = professionalMode
    ? "/api/professional/documents"
    : "/api/prelaunch/partner-documents";
  const uploadToken = params.get("token")
    || window.sessionStorage.getItem("weello-partner-upload-token")
    || "";
  const [requested, setRequested] = useState<DocumentType[]>([]);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", role: "partenaire", uploadToken }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Lien invalide.");
        const replacementTypes = (payload.documents || [])
          .filter((document: any) => document.status === "replacement_requested")
          .map((document: any) => document.document_type as DocumentType);
        setRequested(
          replacementTypes.length
            ? replacementTypes
            : (payload.requiredDocumentTypes || []) as DocumentType[],
        );
        setComment(payload.reviewComment || "");
      } catch (statusError: any) {
        setError(statusError.message || "Ce lien n’est plus valable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [endpoint, uploadToken]);

  const selectFile = (documentType: DocumentType, file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
      || file.size <= 0
      || file.size > 8 * 1024 * 1024
    ) {
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
        const prepareResponse = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "prepare",
            role: "partenaire",
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
          .from("partner-documents")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type,
            upsert: false,
          });
        if (uploadError) throw uploadError;
        uploaded.push({
          documentType,
          storagePath: prepared.path,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      }

      const completeResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", role: "partenaire", uploadToken, documents: uploaded }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completed.error || "Dossier non finalisé.");
      window.sessionStorage.removeItem("weello-partner-upload-token");
      navigate(
        professionalMode
          ? "/auth/professional-confirmed?role=partenaire"
          : "/prelaunch-confirmed?role=partenaire",
        { replace: true },
      );
    } catch (submitError: any) {
      setError(submitError.message || "Le transfert a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-weello-black px-5 py-10 text-weello-cream">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-weello-gold/25 bg-weello-card p-6 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-9">
        <img src="/images/weello-wordmark.png" alt="Weello" className="mx-auto w-64 max-w-full rounded-2xl" />
        <div className="mt-7 flex items-center gap-3">
          <ShieldCheck className="text-weello-gold" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-weello-gold">Lien privé et temporaire</p>
            <h1 className="weello-title mt-1 text-2xl">Dossier professionnel</h1>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 animate-pulse text-sm text-weello-gray">Vérification du lien…</p>
        ) : error && !requested.length ? (
          <div className="mt-7 rounded-2xl border border-weello-red/25 bg-weello-red/10 p-4 text-sm text-weello-red">{error}</div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            {comment && (
              <div className="rounded-2xl border border-weello-gold/20 bg-weello-gold/5 p-4">
                <p className="text-[10px] uppercase tracking-widest text-weello-gold">Commentaire Weello</p>
                <p className="mt-2 text-sm text-weello-cream">{comment}</p>
              </div>
            )}
            {requested.map((documentType) => (
              <label key={documentType} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-weello-gold/20 bg-black/30 p-4">
                <input type="file" required accept="image/jpeg,image/png,application/pdf" className="sr-only" onChange={(event) => selectFile(documentType, event.target.files?.[0])} />
                {files[documentType] ? <FileCheck2 className="text-weello-green" /> : <FileText className="text-weello-gold" />}
                <span>
                  <span className="block text-sm font-semibold">{labels[documentType]}</span>
                  <span className="mt-1 block text-[10px] text-weello-gray">{files[documentType]?.name || "Prendre une photo ou choisir un fichier"}</span>
                </span>
              </label>
            ))}
            {error && <div className="rounded-2xl border border-weello-red/25 bg-weello-red/10 p-3 text-sm text-weello-red">{error}</div>}
            <button disabled={submitting} className="weello-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50">
              {submitting && <LoaderCircle size={18} className="animate-spin" />}
              {submitting ? "Transfert sécurisé…" : "Transmettre les documents"}
            </button>
          </form>
        )}
        <Link to="/auth" className="mt-7 block text-center text-xs text-weello-gold">Retour à Weello</Link>
      </section>
    </main>
  );
}
