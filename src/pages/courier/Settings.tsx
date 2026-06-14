import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, LockKeyhole, Save } from "lucide-react";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";

export default function CourierSettings() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bankDetails, setBankDetails] = useState({ iban: "", bic: "", holder_name: "" });

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("bank_accounts").select("iban,bic,holder_name").eq("user_id", user.id).maybeSingle();
      if (data) setBankDetails({ iban: data.iban || "", bic: data.bic || "", holder_name: data.holder_name || "" });
    })();
  }, []);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "Session expirée. Reconnectez-vous." });
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("bank_accounts").upsert({ user_id: user.id, ...bankDetails });
    setMessage(error
      ? { type: "error", text: "Impossible d'enregistrer ces coordonnées." }
      : { type: "success", text: "Coordonnées bancaires enregistrées." });
    setLoading(false);
  };

  return <CourierShell title="Coordonnées bancaires" back="/courier/profile">
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.17),rgba(12,12,12,0.98)_48%)] p-6">
      <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"><CreditCard size={25} /></div><div><h2 className="foodiz-title text-xl">Compte de versement</h2><p className="mt-1 text-xs text-foodiz-gray">Le compte associé à vos futurs virements.</p></div></div>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-foodiz-gray"><LockKeyhole size={17} className="mt-0.5 shrink-0 text-foodiz-green" />Vos coordonnées sont privées et accessibles uniquement à votre compte.</div>
    </section>
    <form onSubmit={handleSave} className="foodiz-card mt-4 space-y-4 p-5">
      {message && <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${message.type === "success" ? "border-foodiz-green/20 bg-foodiz-green/10 text-foodiz-green" : "border-foodiz-red/20 bg-foodiz-red/10 text-foodiz-red"}`}>{message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}{message.text}</div>}
      {[{ label: "Titulaire du compte", key: "holder_name", mono: false }, { label: "IBAN", key: "iban", mono: true }, { label: "BIC (optionnel)", key: "bic", mono: true }].map((field) => <label key={field.key} className="block"><span className="text-[10px] uppercase tracking-widest text-foodiz-gold">{field.label}</span><input required={field.key !== "bic"} value={bankDetails[field.key as keyof typeof bankDetails]} onChange={(event) => setBankDetails((current) => ({ ...current, [field.key]: event.target.value.toUpperCase() }))} className={`mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-foodiz-cream outline-none transition focus:border-foodiz-gold/50 ${field.mono ? "font-mono tracking-wider" : ""}`} /></label>)}
      <button type="submit" disabled={loading} className="foodiz-btn flex w-full items-center justify-center gap-2 py-4 disabled:opacity-50"><Save size={18} />{loading ? "Enregistrement..." : "Enregistrer"}</button>
    </form>
  </CourierShell>;
}
