import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  ArrowRight,
  Bike,
  Building2,
  Check,
  ChevronDown,
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
  marketingConsent: false,
  companyWebsite: "",
};

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
              {submitting ? "Pré-inscription en cours…" : buttonLabel}
            </button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 text-center">
            <Lock size={13} className="text-foodiz-gold/70" />
            <p className="text-[9px] uppercase tracking-[.12em] text-foodiz-gray/45">Mot de passe sécurisé par Supabase Auth</p>
          </div>
        </main>

        <footer className="border-t border-foodiz-gold/10 px-6 py-5 text-center">
          <button onClick={() => navigate("/admin-auth")} className="text-[9px] uppercase tracking-[.2em] text-foodiz-gray/35 hover:text-foodiz-gold">
            Accès équipe Foodiz
          </button>
          <p className="mt-3 text-[9px] tracking-[.16em] text-foodiz-gray/25">© {new Date().getFullYear()} · FOODIZ</p>
        </footer>
      </section>

      <div className="h-14" />
    </div>
  );
}
