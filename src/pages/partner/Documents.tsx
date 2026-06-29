import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  FileCheck2,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const labels: Record<DocumentType, string> = {
  registration_proof: "Justificatif officiel d’immatriculation",
  liability_insurance: "Responsabilité civile professionnelle",
  hygiene_training: "Formation hygiène alimentaire / HACCP",
  sanitary_declaration: "Déclaration sanitaire applicable",
  alcohol_license: "Licence de vente d’alcool",
};

const statusLabels: Record<string, string> = {
  pending: "En cours de contrôle",
  approved: "Validé",
  rejected: "Refusé",
  replacement_requested: "Document à remplacer",
  expired: "Document expiré",
};

async function partnerDocumentApi<T>(init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Votre session a expiré.");

  const response = await fetch("/api/partner-documents", {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Le dossier documentaire est indisponible.");
  }
  return payload as T;
}

export default function PartnerDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [requiredTypes, setRequiredTypes] = useState<DocumentType[]>([]);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await partnerDocumentApi<{
        documents: PartnerDocument[];
        requiredDocumentTypes: DocumentType[];
      }>();
      setDocuments(payload.documents || []);
      setRequiredTypes(payload.requiredDocumentTypes || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const complete = useMemo(
    () =>
      requiredTypes.length > 0
      && requiredTypes.every((type) =>
        documents.some(
          (document) =>
            document.document_type === type
            && ["pending", "approved"].includes(document.status),
        ),
      ),
    [documents, requiredTypes],
  );

  const selectFile = (documentType: DocumentType, file?: File) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "application/pdf"].includes(file.type)
      || file.size <= 0
      || file.size > 8 * 1024 * 1024
    ) {
      setError("Document invalide. Utilisez un JPG, PNG ou PDF de 8 Mo maximum.");
      return;
    }
    setFiles((current) => ({ ...current, [documentType]: file }));
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = Object.entries(files) as [DocumentType, File][];
    if (!selected.length) {
      setError("Sélectionnez au moins un document à transmettre.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const uploaded = [];
      for (const [documentType, file] of selected) {
        const prepared = await partnerDocumentApi<{ path: string; token: string }>({
          method: "POST",
          body: JSON.stringify({
            action: "prepare",
            documentType,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }),
        });
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

      const completed = await partnerDocumentApi<{
        complete: boolean;
        message: string;
      }>({
        method: "POST",
        body: JSON.stringify({ action: "complete", documents: uploaded }),
      });
      setFiles({});
      toast.success(completed.message);
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Le transfert sécurisé a échoué.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-foodiz-black px-4 py-8 text-foodiz-cream">
      <section className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/partner/validation-status")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-foodiz-gold"
        >
          <ChevronLeft size={18} />
          État de validation
        </button>

        <div className="foodiz-card border border-foodiz-gold/20 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-foodiz-gold/25 bg-foodiz-gold/10 p-3 text-foodiz-gold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-foodiz-gold">
                Espace privé partenaire
              </p>
              <h1 className="foodiz-title mt-2 text-3xl">
                Justificatifs professionnels
              </h1>
              <p className="mt-3 text-sm leading-6 text-foodiz-gray">
                Les fichiers sont déposés dans un espace privé. Seuls vous et
                l’administration Foodiz pouvez accéder à leur statut.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-foodiz-gray">
              <LoaderCircle className="animate-spin text-foodiz-gold" size={18} />
              Chargement du dossier…
            </div>
          ) : error && !requiredTypes.length ? (
            <div className="mt-7 rounded-2xl border border-foodiz-red/25 bg-foodiz-red/10 p-4 text-sm text-foodiz-red">
              {error}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              {complete && (
                <div className="flex items-start gap-3 rounded-2xl border border-foodiz-green/25 bg-foodiz-green/10 p-4">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-foodiz-green" size={19} />
                  <p className="text-sm text-foodiz-cream">
                    Tous les justificatifs obligatoires ont été transmis. Vous
                    pouvez encore remplacer un fichier avant validation.
                  </p>
                </div>
              )}

              {requiredTypes.map((documentType) => {
                const document = documents.find(
                  (candidate) => candidate.document_type === documentType,
                );
                const selectedFile = files[documentType];
                const needsReplacement =
                  !document
                  || ["rejected", "replacement_requested", "expired"].includes(
                    document.status,
                  );

                return (
                  <article
                    key={documentType}
                    className="rounded-2xl border border-foodiz-gold/15 bg-black/25 p-4"
                  >
                    <div className="flex items-start gap-3">
                      {document && !needsReplacement ? (
                        <FileCheck2 className="mt-0.5 shrink-0 text-foodiz-green" />
                      ) : (
                        <FileText className="mt-0.5 shrink-0 text-foodiz-gold" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-foodiz-cream">
                          {labels[documentType]}
                        </h2>
                        {document && (
                          <>
                            <p className="mt-1 truncate text-xs text-foodiz-gray">
                              {document.original_name}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-foodiz-gold">
                              {statusLabels[document.status] || document.status}
                            </p>
                            {document.review_comment && (
                              <p className="mt-2 rounded-xl bg-foodiz-gold/5 p-3 text-xs text-foodiz-gray">
                                Commentaire Foodiz : {document.review_comment}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-foodiz-gold/25 px-4 py-3 text-xs font-semibold text-foodiz-gold transition hover:bg-foodiz-gold/10">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="sr-only"
                        onChange={(event) =>
                          selectFile(documentType, event.target.files?.[0])
                        }
                      />
                      {selectedFile
                        ? selectedFile.name
                        : needsReplacement
                          ? "Ajouter ce justificatif"
                          : "Remplacer ce justificatif"}
                    </label>
                  </article>
                );
              })}

              {error && (
                <div className="rounded-2xl border border-foodiz-red/25 bg-foodiz-red/10 p-3 text-sm text-foodiz-red">
                  {error}
                </div>
              )}

              <button
                disabled={submitting || !Object.keys(files).length}
                className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-40"
              >
                {submitting && <LoaderCircle size={18} className="animate-spin" />}
                {submitting ? "Transfert sécurisé…" : "Transmettre les documents sélectionnés"}
              </button>
              <p className="text-center text-[10px] text-foodiz-gray">
                JPG, PNG ou PDF · 8 Mo maximum par document
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
