import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  Check,
  ChevronDown,
  FileCheck2,
  FileText,
  Gift,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Star,
  Store,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Role = "client" | "livreur" | "partenaire";

const ROLES = [
  { value: "client" as const, label: "Client", detail: "Commandez, cumulez des avantages et découvrez Foodiz dès son ouverture.", icon: ShoppingBag },
  { value: "livreur" as const, label: "Livreur", detail: "Déposez votre dossier, faites valider vos justificatifs et rejoignez le pilote Foodiz.", icon: Bike },
  { value: "partenaire" as const, label: "Partenaire", detail: "Présentez votre établissement, transmettez vos documents et préparez vos futures ventes.", icon: Store },
];

const BENEFITS = [
  { title: "Compte prêt dès le lancement", icon: User },
  { title: "Avantages exclusifs réservés aux pré-inscrits", icon: Gift },
  { title: "Accès prioritaire à Foodiz", icon: Star },
];

const COURIER_AVAILABILITY_SLOTS = [
  { value: "matin", label: "Matin", detail: "7h – 11h" },
  { value: "midi", label: "Midi", detail: "11h – 14h" },
  { value: "apres_midi", label: "Après-midi", detail: "14h – 18h" },
  { value: "soiree", label: "Soirée", detail: "18h – 23h" },
  { value: "nuit", label: "Nuit", detail: "23h – 2h" },
  { value: "week_end", label: "Week-end", detail: "Sam. / Dim." },
];

const COURIER_AVAILABILITY_DAYS = [
  { value: "lundi", label: "Lun." },
  { value: "mardi", label: "Mar." },
  { value: "mercredi", label: "Mer." },
  { value: "jeudi", label: "Jeu." },
  { value: "vendredi", label: "Ven." },
  { value: "samedi", label: "Sam." },
  { value: "dimanche", label: "Dim." },
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
  availabilitySlots: [] as string[],
  availabilityDays: [] as string[],
  availabilityFlexible: false,
  address: "",
  postalCode: "",
  handlesAnimalProducts: false,
  sellsAlcohol: false,
  requiresHygieneProof: false,
  marketingConsent: false,
  companyWebsite: "",
};

type CourierDocumentType = "identity_front" | "identity_back" | "activity_proof";
type CourierFiles = Record<CourierDocumentType, File | null>;
type PartnerDocumentType =
  | "registration_proof"
  | "liability_insurance"
  | "hygiene_training"
  | "sanitary_declaration"
  | "alcohol_license";
type PartnerFiles = Record<PartnerDocumentType, File | null>;

const emptyCourierFiles: CourierFiles = {
  identity_front: null,
  identity_back: null,
  activity_proof: null,
};

const emptyPartnerFiles: PartnerFiles = {
  registration_proof: null,
  liability_insurance: null,
  hygiene_training: null,
  sanitary_declaration: null,
  alcohol_license: null,
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
    <div className="flex items-center gap-3 rounded-[1.15rem] border border-[#9d742d]/45 bg-[linear-gradient(180deg,rgba(12,12,10,.94),rgba(4,4,4,.92))] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(245,205,122,.06)] transition-all hover:border-[#d8a84f]/65 focus-within:border-[#efc368] focus-within:shadow-[0_0_22px_rgba(216,168,79,.13),inset_0_1px_0_rgba(245,205,122,.1)]">
      <span className="shrink-0 text-[#d8a84f] [filter:drop-shadow(0_0_5px_rgba(216,168,79,.35))]">
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
        className="min-w-0 flex-1 bg-transparent text-[15px] text-foodiz-cream outline-none placeholder:text-[#b8b0a2]/60"
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
    <label className="block cursor-pointer rounded-[1.35rem] border border-[#9d742d]/40 bg-[linear-gradient(180deg,rgba(12,12,10,.95),rgba(5,5,5,.92))] p-4 shadow-[inset_0_1px_0_rgba(245,205,122,.06)] transition hover:border-[#d8a84f]/70">
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
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
          file ? "border-foodiz-green/30 bg-foodiz-green/10 text-foodiz-green" : "border-[#d8a84f]/35 bg-[#d8a84f]/10 text-[#d8a84f]"
        }`}>
          {file ? <FileCheck2 size={19} /> : <FileText size={19} />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foodiz-cream">{label}</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-[#b8b0a2]/70">{file ? file.name : description}</span>
        </span>
      </div>
    </label>
  );
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const [resumePartnerUpload] = useState(
    () => Boolean(window.sessionStorage.getItem("foodiz-partner-upload-token")),
  );
  const [role, setRole] = useState<Role>(() => {
    if (window.sessionStorage.getItem("foodiz-courier-upload-token")) return "livreur";
    if (window.sessionStorage.getItem("foodiz-partner-upload-token")) return "partenaire";
    return "client";
  });
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [courierFiles, setCourierFiles] = useState<CourierFiles>(emptyCourierFiles);
  const [partnerFiles, setPartnerFiles] = useState<PartnerFiles>(emptyPartnerFiles);
  const [pendingCourierUploadToken, setPendingCourierUploadToken] = useState(
    () => window.sessionStorage.getItem("foodiz-courier-upload-token") || "",
  );
  const [pendingPartnerUploadToken, setPendingPartnerUploadToken] = useState(
    () => window.sessionStorage.getItem("foodiz-partner-upload-token") || "",
  );
  const [submissionStep, setSubmissionStep] = useState("");

  useEffect(() => {
    if (resumePartnerUpload) {
      navigate("/partner-documents", { replace: true });
    }
  }, [navigate, resumePartnerUpload]);

  const requiredPartnerDocumentTypes = useMemo<PartnerDocumentType[]>(() => {
    const types: PartnerDocumentType[] = ["registration_proof", "liability_insurance"];
    if (form.requiresHygieneProof) types.push("hygiene_training");
    if (form.handlesAnimalProducts) types.push("sanitary_declaration");
    if (form.sellsAlcohol) types.push("alcohol_license");
    return types;
  }, [form.handlesAnimalProducts, form.requiresHygieneProof, form.sellsAlcohol]);

  const buttonLabel = useMemo(() => {
    if (role === "livreur") return "Pré-inscrire mon profil livreur";
    if (role === "partenaire") return "Pré-inscrire mon établissement";
    return "Je réserve ma place sur Foodiz";
  }, [role]);

  const update = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const toggleArrayValue = (name: "availabilitySlots" | "availabilityDays", value: string) => {
    setForm((current) => {
      const values = current[name];
      return {
        ...current,
        [name]: values.includes(value)
          ? values.filter((candidate) => candidate !== value)
          : [...values, value],
      };
    });
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

  const selectPartnerFile = async (documentType: PartnerDocumentType, file: File) => {
    try {
      await validateCourierFile(file, true);
      setPartnerFiles((current) => ({ ...current, [documentType]: file }));
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

  const uploadPartnerDocuments = async (uploadToken: string) => {
    const entries = requiredPartnerDocumentTypes.map(
      (documentType) => [documentType, partnerFiles[documentType]] as const,
    );
    if (entries.some(([, file]) => !file)) {
      throw new Error("Ajoutez tous les justificatifs obligatoires de votre établissement.");
    }

    const uploaded: Array<{
      documentType: PartnerDocumentType;
      storagePath: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    }> = [];

    for (const [documentType, file] of entries) {
      if (!file) continue;
      setSubmissionStep(`Transfert sécurisé : ${uploaded.length + 1}/${entries.length}`);
      const prepareResponse = await fetch("/api/prelaunch/partner-documents", {
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

    setSubmissionStep("Enregistrement du dossier…");
    const completeResponse = await fetch("/api/prelaunch/partner-documents", {
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
      let uploadToken = role === "livreur"
        ? pendingCourierUploadToken
        : role === "partenaire"
          ? pendingPartnerUploadToken
          : "";
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
        if (role === "partenaire") {
          uploadToken = String(payload.partnerDocumentUploadToken || "");
          if (!uploadToken) throw new Error("Le dépôt des justificatifs n’a pas pu être préparé.");
          setPendingPartnerUploadToken(uploadToken);
          window.sessionStorage.setItem("foodiz-partner-upload-token", uploadToken);
        }
      }

      if (role === "livreur") {
        await uploadCourierDocuments(uploadToken);
        window.sessionStorage.removeItem("foodiz-courier-upload-token");
        setPendingCourierUploadToken("");
      }
      if (role === "partenaire") {
        await uploadPartnerDocuments(uploadToken);
        window.sessionStorage.removeItem("foodiz-partner-upload-token");
        setPendingPartnerUploadToken("");
      }
      navigate(`/prelaunch-confirmed${role !== "client" ? `?role=${role}` : ""}`, { replace: true });
    } catch (submitError: any) {
      setError(submitError.message || "Votre pré-inscription a échoué.");
    } finally {
      setSubmitting(false);
      setSubmissionStep("");
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050504] text-foodiz-cream">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,168,79,.16),transparent_28%),radial-gradient(circle_at_20%_45%,rgba(170,115,38,.12),transparent_24%),linear-gradient(180deg,#11100d_0%,#050505_31%,#060604_100%)]" />
      <div className="fixed inset-0 -z-10 opacity-[.18] [background-image:radial-gradient(rgba(216,168,79,.7)_0.65px,transparent_0.65px)] [background-size:18px_18px]" />

      <header className="relative mx-auto max-w-[980px] overflow-visible">
        <div className="mx-auto overflow-hidden rounded-b-[2.6rem] border-x border-b border-[#d8a84f]/35 bg-[#050504] shadow-[0_24px_58px_rgba(0,0,0,.78),0_0_0_1px_rgba(245,205,122,.08)_inset]">
          <img
            src="/images/Logo-Foodiz.PNG"
            alt="Foodiz"
            className="mx-auto block h-auto max-h-[330px] w-full object-contain object-center sm:max-h-[405px]"
          />
        </div>
      </header>

      <main className="relative z-10 mx-auto mt-5 max-w-[780px] px-5 pb-12 sm:mt-7 sm:px-8">
        <div className="text-center">
          <h1 className="mx-auto max-w-[720px] text-[44px] leading-[.98] tracking-[-.045em] text-white drop-shadow-[0_8px_22px_rgba(0,0,0,.85)] sm:text-[64px]" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            Rejoignez les premiers
            <span className="mt-1 block bg-[linear-gradient(180deg,#f0d08a_0%,#b98735_72%,#8d6228_100%)] bg-clip-text italic text-transparent">
              Foodizers.
            </span>
          </h1>

          <div className="mx-auto mt-7 flex max-w-[260px] items-center justify-center gap-4 text-[#c19443]">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c19443]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#c19443]" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c19443]" />
          </div>

          <p className="mx-auto mt-5 max-w-[650px] text-[21px] leading-relaxed text-[#d7d0c6]/78 sm:text-[25px]">
            Parce que tout le monde mérite sa part du gâteau.
          </p>
        </div>

        <section className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="rounded-[1.2rem] border border-[#d8a84f]/35 bg-[linear-gradient(180deg,rgba(216,168,79,.18),rgba(17,17,15,.96)_48%,rgba(6,6,5,.98)_100%)] p-5 text-center text-foodiz-cream shadow-[0_18px_35px_rgba(0,0,0,.36),inset_0_1px_0_rgba(255,238,190,.08)]">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#d8a84f]/40 bg-[#d8a84f]/10 text-[#d8a84f] shadow-[0_8px_24px_rgba(0,0,0,.32)]">
                <benefit.icon size={26} strokeWidth={1.8} />
              </span>
              <h2 className="mx-auto mt-4 max-w-[175px] text-[17px] font-black leading-tight">{benefit.title}</h2>
              <span className="mx-auto mt-4 block h-px w-16 bg-[#d8a84f]/45" />
            </article>
          ))}
        </section>

        <div className="my-7 flex items-center gap-5">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c19443]/75 to-[#c19443]/75" />
          <span className="text-[16px] font-black uppercase tracking-[.34em] text-[#c19443]">Je suis</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#c19443]/75 to-[#c19443]/75" />
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6">
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
                  className={`relative flex min-h-[150px] flex-col items-center justify-center rounded-[1.05rem] border px-2 py-5 text-center transition-all ${
                    selected
                      ? "border-[#ffd36b] bg-[radial-gradient(circle_at_35%_10%,rgba(216,168,79,.34),rgba(15,12,8,.96)_48%,rgba(5,5,5,.98)_100%)] shadow-[0_0_34px_rgba(216,168,79,.25),inset_0_1px_0_rgba(255,230,170,.16)]"
                      : "border-[#8e6424]/60 bg-[linear-gradient(180deg,rgba(17,17,15,.96),rgba(5,5,5,.96))] shadow-[inset_0_1px_0_rgba(245,205,122,.05)] hover:border-[#d8a84f]/70"
                  }`}
                >
                  {selected && (
                    <span className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full border border-[#ffe09a]/65 bg-[linear-gradient(180deg,#e7c66f,#c69335)] text-[#070705] shadow-[0_10px_20px_rgba(0,0,0,.35)]">
                      <Check size={23} strokeWidth={3.5} />
                    </span>
                  )}
                  <span className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${
                    selected ? "border-[#ffd36b] bg-[#d8a84f]/10" : "border-[#9f742d]/75 bg-[#d8a84f]/[.03]"
                  }`}>
                    <option.icon size={34} className="text-[#d8a84f] [filter:drop-shadow(0_0_6px_rgba(216,168,79,.45))]" strokeWidth={1.55} />
                  </span>
                  <span className="mt-4 text-[18px] font-black text-white sm:text-[22px]">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-[1.05rem] border border-[#8e6424]/55 bg-[linear-gradient(180deg,rgba(14,14,12,.9),rgba(5,5,5,.9))] px-5 py-4 shadow-[inset_0_1px_0_rgba(245,205,122,.05)]">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8a84f]/55 bg-[#d8a84f]/10 text-[#d8a84f]">
              {role === "client" ? <User size={25} /> : role === "livreur" ? <Bike size={25} /> : <Store size={25} />}
            </span>
            <p className="text-[15px] leading-relaxed text-[#d7d0c6]/78">
              {ROLES.find((option) => option.value === role)?.detail}
            </p>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
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
                      { value: "fast_food", label: "Restauration rapide" },
                      { value: "bakery", label: "Boulangerie" },
                      { value: "pastry", label: "Pâtisserie" },
                      { value: "butcher", label: "Boucherie" },
                      { value: "caterer", label: "Traiteur" },
                      { value: "grocery", label: "Épicerie" },
                      { value: "greengrocer", label: "Primeur" },
                      { value: "supermarket", label: "Supermarché" },
                      { value: "local_shop", label: "Commerce local" },
                      { value: "franchise", label: "Franchise" },
                      { value: "national_brand", label: "Grande enseigne" },
                      { value: "other", label: "Autre" },
                    ]}
                  />
                  <Field icon={<Building2 size={17} />} name="siret" value={form.siret} onChange={update} placeholder="SIRET — 14 chiffres" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field icon={<MapPin size={17} />} name="address" value={form.address} onChange={update} placeholder="Adresse de l’établissement" autoComplete="street-address" />
                  <Field icon={<MapPin size={17} />} name="postalCode" value={form.postalCode} onChange={update} placeholder="Code postal" autoComplete="postal-code" />
                </div>
                <div className="space-y-2 rounded-2xl border border-white/5 bg-black/25 p-4 text-xs text-foodiz-gray">
                  <p className="font-semibold text-foodiz-cream">Activités réglementées de l’établissement</p>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={form.requiresHygieneProof} onChange={(event) => update("requiresHygieneProof", event.target.checked)} className="mt-0.5 accent-[#D8A84F]" />
                    Activité de restauration nécessitant un justificatif de formation à l’hygiène alimentaire.
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={form.handlesAnimalProducts} onChange={(event) => update("handlesAnimalProducts", event.target.checked)} className="mt-0.5 accent-[#D8A84F]" />
                    Manipulation ou vente de denrées d’origine animale nécessitant une déclaration sanitaire.
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={form.sellsAlcohol} onChange={(event) => update("sellsAlcohol", event.target.checked)} className="mt-0.5 accent-[#D8A84F]" />
                    Vente de boissons alcoolisées.
                  </label>
                </div>
                <div className="rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/[.04] p-4">
                  <p className="text-xs font-semibold text-foodiz-cream">Justificatifs professionnels</p>
                  <p className="mt-2 text-[10px] leading-relaxed text-foodiz-gray">
                    Les pièces sont stockées dans un espace privé. Elles seront examinées par Foodiz avant toute activation commerciale.
                  </p>
                </div>
                <DocumentField
                  label="Justificatif d’immatriculation"
                  description="Avis SIRENE/RNE, extrait K/Kbis ou document équivalent"
                  file={partnerFiles.registration_proof}
                  allowPdf
                  onFile={(file) => selectPartnerFile("registration_proof", file)}
                />
                <DocumentField
                  label="Assurance responsabilité civile professionnelle"
                  description="Attestation en cours de validité"
                  file={partnerFiles.liability_insurance}
                  allowPdf
                  onFile={(file) => selectPartnerFile("liability_insurance", file)}
                />
                {form.requiresHygieneProof && (
                  <DocumentField
                    label="Justificatif de formation hygiène alimentaire"
                    description="Attestation adaptée à l’activité de restauration"
                    file={partnerFiles.hygiene_training}
                    allowPdf
                    onFile={(file) => selectPartnerFile("hygiene_training", file)}
                  />
                )}
                {form.handlesAnimalProducts && (
                  <DocumentField
                    label="Déclaration sanitaire"
                    description="Déclaration ou justificatif DDPP applicable à l’activité"
                    file={partnerFiles.sanitary_declaration}
                    allowPdf
                    onFile={(file) => selectPartnerFile("sanitary_declaration", file)}
                  />
                )}
                {form.sellsAlcohol && (
                  <DocumentField
                    label="Licence de vente d’alcool"
                    description="Licence correspondant à l’activité déclarée"
                    file={partnerFiles.alcohol_license}
                    allowPdf
                    onFile={(file) => selectPartnerFile("alcohol_license", file)}
                  />
                )}
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
                  <label className="flex items-center gap-3 rounded-[1.15rem] border border-[#9d742d]/45 bg-[linear-gradient(180deg,rgba(12,12,10,.94),rgba(4,4,4,.92))] px-4 py-3.5 text-sm text-foodiz-cream">
                    <input
                      type="checkbox"
                      checked={form.availabilityFlexible}
                      onChange={(event) => update("availabilityFlexible", event.target.checked)}
                      className="h-5 w-5 accent-[#D8A84F]"
                    />
                    <span>
                      <span className="block font-semibold text-foodiz-cream">Je suis flexible</span>
                      <span className="mt-0.5 block text-[10px] text-[#b8b0a2]/70">Foodiz pourra me proposer plusieurs créneaux.</span>
                    </span>
                  </label>
                </div>
                <div className="rounded-2xl border border-foodiz-gold/15 bg-black/25 p-4">
                  <div className="flex items-start gap-3">
                    <ArrowRight size={17} className="mt-0.5 shrink-0 text-foodiz-gold" />
                    <div>
                      <p className="text-xs font-semibold text-foodiz-cream">Mes créneaux préférés</p>
                      <p className="mt-1 text-[10px] leading-relaxed text-foodiz-gray">Sélectionnez plusieurs tranches si vous êtes disponible sur plusieurs moments.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {COURIER_AVAILABILITY_SLOTS.map((slot) => {
                      const selected = form.availabilitySlots.includes(slot.value);
                      return (
                        <button
                          key={slot.value}
                          type="button"
                          onClick={() => toggleArrayValue("availabilitySlots", slot.value)}
                          className={`rounded-xl border px-3 py-3 text-left transition ${
                            selected
                              ? "border-foodiz-gold bg-foodiz-gold/15 text-foodiz-cream"
                              : "border-foodiz-gold/15 bg-white/[0.02] text-foodiz-gray hover:border-foodiz-gold/45"
                          }`}
                        >
                          <span className="block text-xs font-semibold">{slot.label}</span>
                          <span className="mt-1 block text-[9px] opacity-70">{slot.detail}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-foodiz-gold/15 bg-black/25 p-4">
                  <p className="text-xs font-semibold text-foodiz-cream">Jours souhaités</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                    {COURIER_AVAILABILITY_DAYS.map((day) => {
                      const selected = form.availabilityDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleArrayValue("availabilityDays", day.value)}
                          className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-foodiz-gold bg-foodiz-gold/15 text-foodiz-cream"
                              : "border-foodiz-gold/15 bg-white/[0.02] text-foodiz-gray hover:border-foodiz-gold/45"
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
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

            <label className="flex cursor-pointer items-start gap-4 rounded-[1.05rem] border border-[#8e6424]/35 bg-[linear-gradient(180deg,rgba(14,14,12,.84),rgba(5,5,5,.88))] px-5 py-4 shadow-[inset_0_1px_0_rgba(245,205,122,.05)]">
              <input
                type="checkbox"
                checked={form.marketingConsent}
                onChange={(event) => update("marketingConsent", event.target.checked)}
                required
                className="mt-0.5 h-7 w-7 shrink-0 rounded-md accent-[#D8A84F]"
              />
              <span className="text-[12px] leading-relaxed text-[#d7d0c6]/72">
                J’accepte que Foodiz utilise ces informations pour gérer ma pré-inscription et m’envoyer les informations liées au lancement.
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-foodiz-red/25 bg-foodiz-red/[.06] px-4 py-3 text-sm text-foodiz-red">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded-[1.05rem] border border-[#f0cf84]/45 py-5 text-[18px] font-black text-[#070705] transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-foodiz-gold/30 disabled:opacity-50 sm:text-[20px]"
              style={{
                background: "linear-gradient(180deg, #e7c778 0%, #c8943b 62%, #a86f25 100%)",
                boxShadow: "0 14px 28px rgba(0,0,0,.46), 0 0 28px rgba(216,168,79,.20), inset 0 1px 0 rgba(255,241,198,.48)",
              }}
            >
              {submitting ? <LoaderCircle size={19} className="animate-spin" /> : <ArrowRight size={19} />}
              {submitting
                ? submissionStep || "Pré-inscription en cours…"
                : (pendingCourierUploadToken && role === "livreur") || (pendingPartnerUploadToken && role === "partenaire")
                  ? "Reprendre l’envoi des justificatifs"
                  : buttonLabel}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-2 text-center">
            <Lock size={15} className="text-[#d8a84f]/80" />
            <p className="text-[12px] text-[#d8a84f]">Vos informations sont sécurisées et confidentielles.</p>
          </div>
        </main>
    </div>
  );
}
