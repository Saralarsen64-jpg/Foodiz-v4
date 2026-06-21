import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../../components/Logo";

type Role = "client" | "livreur" | "partenaire";

const ROLES = [
  {
    value: "client" as const,
    label: "Je suis client",
    eyebrow: "Découvrir & commander",
    icon: ShoppingBag,
  },
  {
    value: "livreur" as const,
    label: "Je suis livreur",
    eyebrow: "Livrer localement",
    icon: Bike,
  },
  {
    value: "partenaire" as const,
    label: "Je suis partenaire",
    eyebrow: "Développer mon activité",
    icon: Store,
  },
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
  marketingConsent: false,
  companyWebsite: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
  autoComplete,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[.16em] font-bold text-black/55 mb-2">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-black/15 bg-white/55 px-4 py-3.5 text-[15px] text-black outline-none placeholder:text-black/30 focus:border-black/45 focus:bg-white/75 transition"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (name: string, value: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[.16em] font-bold text-black/55 mb-2">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full rounded-2xl border border-black/15 bg-white/55 px-4 py-3.5 text-[15px] text-black outline-none focus:border-black/45 transition"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("client");
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const buttonLabel = useMemo(() => {
    if (role === "livreur") return "Pré-inscrire mon profil livreur";
    if (role === "partenaire") return "Pré-inscrire mon établissement";
    return "Rejoindre la liste d’attente";
  }, [role]);

  const update = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/prelaunch/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Votre pré-inscription a échoué.");
      navigate("/prelaunch-confirmed", { replace: true });
    } catch (submitError: any) {
      setError(submitError.message || "Votre pré-inscription a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen kraft-paper-bg text-foodiz-black">
      <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,.3),transparent_26%),linear-gradient(135deg,rgba(216,185,143,.88),rgba(198,160,106,.92))]">
        <header className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex justify-between items-center">
          <Logo size="lg" />
          <a href="/admin-auth" className="text-[10px] uppercase tracking-[.2em] font-bold text-black/45 hover:text-black transition">
            Accès équipe
          </a>
        </header>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pb-16 grid lg:grid-cols-[.82fr_1.18fr] gap-10 lg:gap-16 items-start">
          <section className="lg:sticky lg:top-16 pt-8 lg:pt-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/20 px-4 py-2 text-[10px] uppercase tracking-[.22em] font-bold">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              Ouverture prochaine
            </div>
            <h1 className="font-serif text-[3.5rem] sm:text-[5rem] lg:text-[6.2rem] leading-[.9] tracking-[-.055em] mt-7">
              Foodiz<br />arrive bientôt
            </h1>
            <p className="text-xl sm:text-2xl font-medium leading-snug mt-7 max-w-lg">
              L’app qui régale clients,<br className="hidden sm:block" /> livreurs et partenaires.
            </p>
            <p className="text-black/58 leading-relaxed mt-6 max-w-md">
              Rejoignez les premiers membres de l’écosystème Foodiz et recevez votre accès personnel dès l’ouverture.
            </p>

            <div className="mt-10 grid gap-3 max-w-md">
              {["Un compte sécurisé déjà prêt", "Un accès envoyé personnellement", "Vos données protégées dès maintenant"].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="w-7 h-7 rounded-full bg-black text-foodiz-gold flex items-center justify-center"><Check size={14} /></span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] sm:rounded-[2.6rem] bg-[#f8ead2]/92 border border-black/10 shadow-[0_35px_120px_rgba(34,21,5,.25)] backdrop-blur p-5 sm:p-8 lg:p-10">
            <div>
              <p className="text-[10px] uppercase tracking-[.24em] font-bold text-black/45">Votre place chez Foodiz</p>
              <h2 className="font-serif text-3xl sm:text-4xl mt-2">Choisissez votre profil</h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-7">
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
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? "bg-black text-foodiz-cream border-black shadow-xl -translate-y-1"
                        : "bg-white/35 border-black/10 hover:border-black/30"
                    }`}
                  >
                    <option.icon size={23} className={selected ? "text-foodiz-gold" : "text-black/65"} />
                    <span className="block font-bold mt-5 text-sm">{option.label}</span>
                    <span className={`block text-[10px] mt-1 ${selected ? "text-white/50" : "text-black/45"}`}>{option.eyebrow}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.companyWebsite}
                onChange={(event) => update("companyWebsite", event.target.value)}
                className="hidden"
                aria-hidden="true"
              />

              {role === "partenaire" && (
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-black/[.04] border border-black/10 p-4">
                  <div className="sm:col-span-2">
                    <Field label="Nom de l’établissement" name="establishmentName" value={form.establishmentName} onChange={update} />
                  </div>
                  <SelectField
                    label="Type d’établissement"
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
                  <Field label="SIRET (facultatif)" name="siret" value={form.siret} onChange={update} required={false} />
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={role === "partenaire" ? "Prénom du contact" : "Prénom"} name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" />
                <Field label={role === "partenaire" ? "Nom du contact" : "Nom"} name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" />
                <Field label="Email" name="email" value={form.email} onChange={update} type="email" autoComplete="email" />
                <Field label="Téléphone" name="phone" value={form.phone} onChange={update} type="tel" autoComplete="tel" />
                <div className="sm:col-span-2">
                  <Field label="Ville" name="city" value={form.city} onChange={update} autoComplete="address-level2" />
                </div>
              </div>

              {role === "livreur" && (
                <div className="grid sm:grid-cols-2 gap-4 rounded-2xl bg-black/[.04] border border-black/10 p-4">
                  <SelectField
                    label="Véhicule"
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
                    label="Disponibilité"
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
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Field
                    label="Mot de passe"
                    name="password"
                    value={form.password}
                    onChange={update}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 bottom-3.5 text-black/45 hover:text-black"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <Field
                  label="Confirmation"
                  name="passwordConfirmation"
                  value={form.passwordConfirmation}
                  onChange={update}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-[11px] text-black/45 -mt-2">10 caractères minimum, avec une majuscule, une minuscule et un chiffre.</p>

              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/30 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.marketingConsent}
                  onChange={(event) => update("marketingConsent", event.target.checked)}
                  required
                  className="mt-1 accent-black"
                />
                <span className="text-xs text-black/60 leading-relaxed">
                  J’accepte que Foodiz utilise ces informations pour gérer ma pré-inscription et m’envoyer les informations liées au lancement. Je pourrai retirer mon consentement.
                </span>
              </label>

              {error && (
                <div className="rounded-2xl bg-red-950/10 border border-red-800/20 px-4 py-3 text-sm text-red-900">{error}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-black text-foodiz-cream px-5 py-4 font-bold flex items-center justify-center gap-3 hover:bg-[#171717] disabled:opacity-60 transition shadow-xl"
              >
                {submitting ? <LoaderCircle size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                {submitting ? "Pré-inscription en cours…" : buttonLabel}
              </button>

              <p className="text-center text-[10px] text-black/40 leading-relaxed">
                Votre mot de passe est géré exclusivement par Supabase Auth et n’est jamais stocké dans nos tables applicatives.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
