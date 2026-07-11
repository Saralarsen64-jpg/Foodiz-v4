import { useEffect, useState } from "react";
import { CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import CourierShell from "../../components/CourierShell";
import { supabase } from "../../lib/supabase";

type Referral = {
  id: string;
  status: string;
  phone: string;
  preferred_contact_time: string;
  created_at: string;
};

export default function CourierInsuranceReferral() {
  const [phone, setPhone] = useState("");
  const [preferredContactTime, setPreferredContactTime] = useState("indifferent");
  const [consent, setConsent] = useState(false);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const request = async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
        ...init?.headers,
      },
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Demande impossible.");
    return payload;
  };

  useEffect(() => {
    void Promise.all([
      supabase.auth.getUser(),
      request("courier-insurance-referral").catch(() => ({ referral: null })),
    ]).then(async ([auth, current]) => {
      const user = auth.data.user;
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("phone").eq("id", user.id).single();
        setPhone(current.referral?.phone || profile?.phone || "");
      }
      setPreferredContactTime(current.referral?.preferred_contact_time || "indifferent");
      setReferral(current.referral);
    });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) {
      toast.error("Votre accord est nécessaire pour transmettre cette demande.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = await request("courier-insurance-referral", {
        method: "POST",
        body: JSON.stringify({ phone, preferredContactTime, consentPartnerContact: consent }),
      });
      setReferral(payload.referral);
      toast.success("Votre demande de rappel est enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Demande impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CourierShell title="Assurance professionnelle" back="/courier">
      <section className="rounded-[2rem] border border-weello-gold/25 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(14,14,14,0.98)_48%)] p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-weello-gold/15 text-weello-gold">
          <ShieldCheck size={27} />
        </div>
        <h1 className="weello-title mt-5 text-2xl">Assurez votre activité avec un partenaire Weello</h1>
        <p className="mt-3 text-sm leading-6 text-weello-gray">
          Pour faciliter vos démarches, Weello peut vous mettre en relation avec un partenaire spécialisé proposant une assurance adaptée à l’activité de livraison.
        </p>
        <p className="mt-2 text-xs leading-5 text-weello-gray/75">
          Weello ne réalise ni devis, ni conseil en assurance. Vous restez libre de choisir votre assureur.
        </p>
      </section>

      {referral?.status === "pending" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-weello-green/25 bg-weello-green/[0.08] p-4">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-weello-green" />
          <div><p className="font-semibold text-weello-cream">Demande enregistrée</p><p className="mt-1 text-xs text-weello-gray">Elle sera transmise dès qu’un partenaire d’assurance Weello sera disponible.</p></div>
        </div>
      )}

      <form onSubmit={submit} className="weello-card mt-4 space-y-4 p-5">
        <div>
          <label htmlFor="insurance-phone" className="text-[10px] uppercase tracking-widest text-weello-gold">Téléphone de rappel</label>
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4">
            <Phone size={17} className="text-weello-gold" />
            <input id="insurance-phone" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full bg-transparent py-4 text-weello-cream outline-none" />
          </div>
        </div>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-weello-gold">Moment préféré</span>
          <select value={preferredContactTime} onChange={(event) => setPreferredContactTime(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-weello-card px-4 py-4 text-weello-cream outline-none">
            <option value="indifferent">Peu importe</option>
            <option value="morning">Le matin</option>
            <option value="afternoon">L’après-midi</option>
            <option value="evening">En soirée</option>
          </select>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-weello-gold/15 bg-weello-gold/[0.04] p-4">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-5 w-5 accent-[#D8A84F]" />
          <span className="text-xs leading-5 text-weello-gray">J’accepte que Weello transmette mon nom et mon numéro de téléphone à un partenaire d’assurance afin qu’il me rappelle au sujet d’une couverture professionnelle. Je peux retirer ma demande avant sa transmission.</span>
        </label>
        <button disabled={submitting} className="weello-btn w-full py-4 disabled:opacity-50">
          {submitting ? "Enregistrement…" : referral?.status === "pending" ? "Mettre à jour ma demande" : "Demander à être rappelé"}
        </button>
      </form>
    </CourierShell>
  );
}
