import { useEffect, useState } from "react";
import { CreditCard, ShieldAlert } from "lucide-react";
import CourierShell from "../../components/CourierShell";
import { supabase } from "../../lib/supabase";

export default function CourierSettings() {
  const [legacyBankAccount, setLegacyBankAccount] = useState<{ iban: string; holder_name: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("bank_accounts").select("iban,holder_name").eq("user_id", user.id).maybeSingle();
      if (data?.iban) setLegacyBankAccount(data);
    })();
  }, []);

  const maskedIban = legacyBankAccount?.iban ? `${legacyBankAccount.iban.slice(0, 4)} •••• •••• •••• ${legacyBankAccount.iban.slice(-4)}` : "";

  return <CourierShell title="Compte de versement" back="/courier/profile">
    <section className="rounded-[2rem] border border-weello-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.17),rgba(12,12,12,0.98)_48%)] p-6">
      <div className="flex items-center gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-weello-gold/20 bg-weello-gold/10 text-weello-gold"><CreditCard size={25}/></div><div><h2 className="weello-title text-xl">Versements sécurisés</h2><p className="mt-1 text-xs text-weello-gray">Aucune nouvelle coordonnée bancaire n'est collectée dans Weello.</p></div></div>
    </section>
    <section className="weello-card mt-4 p-5">
      <div className="flex items-start gap-3"><ShieldAlert size={21} className="mt-0.5 shrink-0 text-weello-gold"/><div>{legacyBankAccount ? <p className="text-sm text-weello-cream">Ancien compte enregistré pour {legacyBankAccount.holder_name || "le titulaire"}: <span className="font-mono text-weello-gold">{maskedIban}</span></p> : <p className="text-sm text-weello-cream">Aucun compte bancaire connecté.</p>}<p className="mt-3 text-xs leading-relaxed text-weello-gray">Les virements seront configurés plus tard via Stripe Connect. Ne transmettez jamais votre IBAN au support Weello.</p></div></div>
    </section>
  </CourierShell>;
}
