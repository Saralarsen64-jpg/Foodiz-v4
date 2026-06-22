import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Role = "client" | "livreur" | "partenaire";

const ROLES = [
  { value: "client" as const, label: "Client", detail: "Commander local", icon: ShoppingBag },
  { value: "livreur" as const, label: "Livreur", detail: "Livrer avec Foodiz", icon: Bike },
  { value: "partenaire" as const, label: "Partenaire", detail: "Développer mon activité", icon: Store },
];

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  city: "",
  password: "",
  passwordConfirmation: "",
  establishmentName: "",
  establishmentType: "restaurant",
  siret: "",
  vehicleType: "velo",
  availability: "journee",
  address: "",
  postalCode: "",
  marketingConsent: false,
  companyWebsite: "",
};

type CourierDocumentType = "identity_front" | "identity_back" | "activity_proof";
type CourierFiles = Record<CourierDocumentType, File | null>;

const emptyCourierFiles: CourierFiles = {
  identity_front: null,
  identity_back: null,
  activity_proof: null,
};

async function validateCourierFile(file: File, allowPdf: boolean) {
  const validTypes = allowPdf
    ? ["image/jpeg", "image/png", "application/pdf"]
    : ["image/jpeg", "image/png"];
  if (!validTypes.includes(file.type)) throw new Error(allowPdf ? "Utilisez un fichier JPG, PNG ou PDF." : "Utilisez une photo JPG ou PNG.");
  if (file.size <= 0 || file.size > 8 * 1024 * 1024) throw new Error("Chaque document doit peser moins de 8 Mo.");
  if (!file.type.startsWith("image/")) return;

  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (Math.min(image.naturalWidth, image.naturalHeight) < 720) {
        reject(new Error("La photo est trop petite. Reprenez-la avec une meilleure résolution."));
        return;
      }
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cette image ne peut pas être lue."));
    };
    image.src = url;
  });
}

function InputShell({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-foodiz-gold/30 bg-foodiz-black px-4 py-3.5 transition-all hover:border-foodiz-gold/50 focus-within:border-foodiz-gold focus-within:shadow-[0_0_18px_rgba(216,168,79,.08)]">
      <span className="shrink-0 text-foodiz-gold [filter:drop-shadow(0_0_4px_rgba(216,168,79,.4))]">
        {icon}
      </span>
      {children}
    </div>
  );
}

function Field({
  icon,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
  trailing,
}: {
  icon: ReactNode;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  placeholder: string;
  required?: boolean;
  autoComplete?: string;
  trailing?: ReactNode;
}) {
  return (
    <InputShell icon={icon}>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="min-w-0 flex-1 bg-transparent text-sm text-foodiz-cream outline-none placeholder:text-foodiz-gray/60"
      />
      {trailing}
    </InputShell>
  );
}

function SelectField({
  icon,
  name,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (name: string, value: string) => void;
}) {
  return (
    <InputShell icon={icon}>
      <div className="relative min-w-0 flex-1">
        <select
          name={name}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          className="w-full appearance-none bg-transparent pr-6 text-sm text-foodiz-cream outline-none"
        >
          {options.map((option) => <option key={option.value} value={option.value} className="bg-foodiz-card">{option.label}</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-foodiz-gold/70" />
      </div>
    </InputShell>
  );
}

function DocumentField({
  label,
  description,
  file,
  allowPdf = false,
  onFile,
}: {
  label: string;
  description: string;
  file: File | null;
  allowPdf?: boolean;
  onFile: (file: File) => Promise<void>;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-foodiz-gold/25 bg-foodiz-black p-4 transition hover:border-foodiz-gold/60">
      <input
        type="file"
        accept={allowPdf ? "image/jpeg,image/png,application/pdf" : "image/jpeg,image/png"}
        capture={allowPdf ? undefined : "environment"}
        required
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) void onFile(selected);
        }}
      />
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          file ? "border-foodiz-green/30 bg-foodiz-green/10 text-foodiz-green" : "border-foodiz-gold/25 bg-foodiz-gold/5 text-foodiz-gold"
        }`}>
          {file ? <FileCheck2 size={19} /> : <FileText size={19} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foodiz-cream">{label}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-foodiz-gray">{file ? file.name : description}</span>
        </span>
      </div>
    </label>
  );
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(() => window.sessionStorage.getItem("foodiz-courier-upload-token") ? "livreur" : "client");
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [courierFiles, setCourierFiles] = useState<CourierFiles>(emptyCourierFiles);
  const [pendingCourierUploadToken, setPendingCourierUploadToken] = useState(
    () => window.sessionStorage.getItem("foodiz-courier-upload-token") || "",
  );
  const [submissionStep, setSubmissionStep] = useState("");

  const buttonLabel = useMemo(() => {
    if (role === "livreur") return "Pré-inscrire mon profil livreur";
    if (role === "partenaire") return "Pré-inscrire mon établissement";
    return "Rejoindre la liste d’attente";
  }, [role]);

  const update = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const selectCourierFile = async (documentType: CourierDocumentType, file: File) => {
    try {
      await validateCourierFile(file, documentType === "activity_proof");
      setCourierFiles((current) => ({ ...current, [documentType]: file }));
      setError("");
    } catch (fileError: any) {
      setError(fileError.message || "Document invalide.");
    }
  };

  const uploadCourierDocuments = async (uploadToken: string) => {
    const entries = Object.entries(courierFiles) as [CourierDocumentType, File | null][];
    if (entries.some(([, file]) => !file)) {
      throw new Error("Ajoutez le recto, le verso de votre pièce d’identité et votre justificatif d’activité.");
    }

    const uploaded: Array<{
      documentType: CourierDocumentType;
      storagePath: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    for (const [documentType, file] of entries) {
      if (!file) continue;
      setSubmissionStep(`Transfert sécurisé : ${uploaded.length + 1}/3`);
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
      if (!prepareResponse.ok) throw new Error(prepared.error || "Le dépôt sécurisé a échoué.");

      const { error: uploadError } = await supabase.storage
        .from("courier-documents")
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

    setSubmissionStep("Enregistrement du dossier…");
    const completeResponse = await fetch("/api/prelaunch/courier-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", uploadToken, documents: uploaded }),
    });
    const completed = await completeResponse.json();
    if (!completeResponse.ok) throw new Error(completed.error || "Le dossier n’a pas pu être finalisé.");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      let uploadToken = role === "livreur" ? pendingCourierUploadToken : "";
      if (!uploadToken) {
        setSubmissionStep("Création du compte sécurisé…");
        const response = await fetch("/api/prelaunch/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, role }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Votre pré-inscription a échoué.");
        uploadToken = String(payload.courierDocumentUploadToken || "");
        if (role === "livreur") {
          if (!uploadToken) throw new Error("Le dépôt des justificatifs n’a pas pu être préparé.");
          setPendingCourierUploadToken(uploadToken);
          window.sessionStorage.setItem("foodiz-courier-upload-token", uploadToken);
        }
      }

      if (role === "livreur") {
        await uploadCourierDocuments(uploadToken);
        window.sessionStorage.removeItem("foodiz-courier-upload-token");
        setPendingCourierUploadToken("");
      }
      navigate(`/prelaunch-confirmed${role === "livreur" ? "?role=livreur" : ""}`, { replace: true });
    } catch (submitError: any) {
      setError(submitError.message || "Votre pré-inscription a échoué.");
    } finally {
      setSubmitting(false);
      setSubmissionStep("");
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black text-foodiz-cream">
      <div className="relative w-full overflow-hidden pb-10">
        <img
          src="/images/Logo-Foodiz.PNG"
          alt="Foodiz"
          className="block h-auto w-full align-top"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-foodiz-black/35 to-foodiz-black" />
      </div>

      <section
        className="relative z-10 mx-4 -mt-16 max-w-[560px] overflow-hidden rounded-[34px] border border-foodiz-gold/35 md:mx-auto"
        style={{
          background: "radial-gradient(circle at top, rgba(216,168,79,.1), transparent 34%), #050505",
          boxShadow: "0 -1px 0 rgba(224,180,92,.35), 0 28px 90px rgba(0,0,0,.7), 0 0 48px rgba(216,168,79,.13)",
        }}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/70 to-transparent" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-foodiz-gold/10 blur-3xl" />

        <main className="relative z-10 mx-auto max-w-lg px-5 pb-8 pt-8 sm:px-7">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-foodiz-gold/25 bg-foodiz-gold/[.06] px-4 py-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-foodiz-gold shadow-[0_0_9px_#D8A84F]" />
              <span className="text-[9px] font-bold uppercase tracking-[.24em] text-foodiz-gold">Ouverture prochaine</span>
            </div>
            <h1 className="mt-5 text-3xl sm:text-4xl" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
              <span className="text-foodiz-cream">Foodiz arrive </span>
              <span className="italic text-foodiz-gold">bientôt</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-foodiz-gray">
              L’app qui régale clients, livreurs et partenaires.
              <br />
              Préparez votre compte avant l’ouverture officielle.
            </p>
          </div>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-foodiz-gold/20" />
            <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-foodiz-gold">Je suis</span>
            <div className="h-px flex-1 bg-foodiz-gold/20" />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {ROLES.map((option) => {
              const selected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value);
                    setError("");
                  }}
                  className={`relative flex min-h-[118px] flex-col items-center justify-center rounded-2xl border px-2 py-4 text-center transition-all ${
                    selected
                      ? "border-foodiz-gold bg-foodiz-gold/[.1] shadow-[0_0_20px_rgba(216,168,79,.13)]"
                      : "border-foodiz-gold/25 bg-foodiz-card hover:border-foodiz-gold/50"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foodiz-gold text-foodiz-black">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full border ${
                    selected ? "border-foodiz-gold bg-foodiz-gold/10" : "border-foodiz-gold/45"
                  }`}>
                    <option.icon size={20} className="text-foodiz-gold [filter:drop-shadow(0_0_4px_rgba(216,168,79,.45))]" strokeWidth={1.6} />
                  </span>
                  <span className="mt-3 text-xs font-bold text-foodiz-cream sm:text-sm">{option.label}</span>
                  <span className="mt-1 hidden text-[9px] leading-tight text-foodiz-gray/60 sm:block">{option.detail}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-7 space-y-3.5">
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.companyWebsite}
              onChange={(event) => update("companyWebsite", event.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            {role === "partenaire" && (
              <div className="space-y-3 rounded-2xl border border-foodiz-gold/15 bg-foodiz-gold/[.025] p-3">
                <Field icon={<Building2 size={18} />} name="establishmentName" value={form.establishmentName} onChange={update} placeholder="Nom de l’établissement" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    icon={<Store size={17} />}
                    name="establishmentType"
                    value={form.establishmentType}
                    onChange={update}
                    options={[
                      { value: "restaurant", label: "Restaurant" },
                      { value: "market", label: "Market" },
                      { value: "epicerie", label: "Épicerie" },
                      { value: "autre", label: "Autre" },
                    ]}
                  />
                  <Field icon={<Building2 size={17} />} name="siret" value={form.siret} onChange={update} placeholder="SIRET (facultatif)" required={false} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field icon={<User size={17} />} name="firstName" value={form.firstName} onChange={update} placeholder={role === "partenaire" ? "Prénom du contact" : "Prénom"} autoComplete="given-name" />
              <Field icon={<User size={17} />} name="lastName" value={form.lastName} onChange={update} placeholder={role === "partenaire" ? "Nom du contact" : "Nom"} autoComplete="family-name" />
            </div>

            <Field icon={<Mail size={18} />} name="email" value={form.email} onChange={update} type="email" placeholder="Adresse email" autoComplete="email" />
            <Field icon={<Phone size={18} />} name="phone" value={form.phone} onChange={update} type="tel" placeholder="Téléphone" autoComplete="tel" />
            <Field icon={<MapPin size={18} />} name="city" value={form.city} onChange={update} placeholder="Ville" autoComplete="address-level2" />

            {role === "livreur" && (
              <div className="space-y-3 rounded-2xl border border-foodiz-gold/15 bg-foodiz-gold/[.025] p-3">
                <Field
                  icon={<Building2 size={17} />}
                  name="siret"
                  value={form.siret}
                  onChange={update}
                  placeholder="Numéro SIRET — 14 chiffres"
                  autoComplete="off"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    icon={<MapPin size={17} />}
                    name="address"
                    value={form.address}
                    onChange={update}
                    placeholder="Adresse professionnelle"
                    autoComplete="street-address"
                  />
                  <Field
                    icon={<MapPin size={17} />}
                    name="postalCode"
                    value={form.postalCode}
                    onChange={update}
                    placeholder="Code postal"
                    autoComplete="postal-code"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField
                    icon={<Bike size={17} />}
                    name="vehicleType"
                    value={form.vehicleType}
                    onChange={update}
                    options={[
                      { value: "velo", label: "Vélo" },
                      { value: "scooter", label: "Scooter" },
                      { value: "voiture", label: "Voiture" },
                      { value: "autre", label: "Autre" },
                    ]}
                  />
                  <SelectField
                    icon={<ArrowRight size={17} />}
                    name="availability"
                    value={form.availability}
                    onChange={update}
                    options={[
                      { value: "journee", label: "Journée" },
                      { value: "soiree", label: "Soirée" },
                      { value: "nuit", label: "Nuit" },
                      { value: "week_end", label: "Week-end" },
                    ]}
                  />
                </div>
                <div className="rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/[.04] p-4">
                  <p className="text-xs font-semibold text-foodiz-cream">Justificatifs obligatoires</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-foodiz-gray">
                    Prenez des photos nettes, sans reflet et avec les quatre bords visibles. Les fichiers sont conservés dans un espace privé et examinés uniquement par Foodiz.
                  </p>
                </div>
                <DocumentField
                  label="Pièce d’identité — recto"
                  description="Photographier le recto depuis votre téléphone"
                  file={courierFiles.identity_front}
                  onFile={(file) => selectCourierFile("identity_front", file)}
                />
                <DocumentField
                  label="Pièce d’identité — verso"
                  description="Photographier le verso depuis votre téléphone"
                  file={courierFiles.identity_back}
                  onFile={(file) => selectCourierFile("identity_back", file)}
                />
                <DocumentField
                  label="Justificatif officiel d’activité"
                  description="Avis SIRENE/RNE, attestation INSEE, extrait K/Kbis ou document équivalent"
                  file={courierFiles.activity_proof}
                  allowPdf
                  onFile={(file) => selectCourierFile("activity_proof", file)}
                />
              </div>
            )}

            <Field
              icon={<Lock size={18} />}
              name="password"
              value={form.password}
              onChange={update}
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              autoComplete="new-password"
              trailing={(
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="shrink-0 text-foodiz-gold/60 hover:text-foodiz-gold"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              )}
            />
            <Field
              icon={<Lock size={18} />}
              name="passwordConfirmation"
              value={form.passwordConfirmation}
              onChange={update}
              type={showPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              autoComplete="new-password"
            />
            <p className="px-1 text-[10px] leading-relaxed text-foodiz-gray/55">
              10 caractères minimum, avec une majuscule, une minuscule et un chiffre.
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-foodiz-gold/20 bg-foodiz-card px-4 py-3.5">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) => update("marketingConsent", event.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#D8A84F]"
              />
              <span className="text-[10px] leading-relaxed text-foodiz-gray">
                J’accepte que Foodiz utilise ces informations pour gérer ma pré-inscription et m’envoyer les informations liées au lancement.
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-foodiz-red/25 bg-foodiz-red/[.06] px-4 py-3 text-sm text-foodiz-red">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-foodiz-black transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-foodiz-gold/30 disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg, #E0B45C 0%, #D8A84F 50%, #C9A45C 100%)",
                boxShadow: "0 4px 20px rgba(216,168,79,.25), inset 0 1px 0 rgba(255,255,255,.25)",
              }}
            >
              {submitting ? <LoaderCircle size={19} className="animate-spin" /> : <ArrowRight size={19} />}
              {submitting ? submissionStep || "Pré-inscription en cours…" : pendingCourierUploadToken && role === "livreur" ? "Reprendre l’envoi des justificatifs" : buttonLabel}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 text-center">
            <Lock size={13} className="text-foodiz-gold/70" />
            <p className="text-[9px] uppercase tracking-[.12em] text-foodiz-gray/45">Mot de passe sécurisé par Supabase Auth</p>
          </div>
        </main>

        <footer className="border-t border-foodiz-gold/10 px-6 py-5 text-center">
          <p className="text-[9px] tracking-[.16em] text-foodiz-gray/25">© {new Date().getFullYear()} · FOODIZ</p>
        </footer>
      </section>

      <div className="h-14" />
    </div>
  );
}
