import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, FileText, Landmark, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";
import { emailFinancialDocument } from "../../lib/financialDocuments";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [payables, setPayables] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: payableRows }, { data: statementRows }] = await Promise.all([
      supabase.from("admin_weekly_payables").select("*").order("amount_cents", { ascending: false }),
      supabase.from("settlement_statements").select("*").order("generated_at", { ascending: false }).limit(100),
    ]);
    setPayables(payableRows || []);
    setStatements(statementRows || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const createStatement = async (row: any) => {
    setBusy(`${row.beneficiary_type}:${row.beneficiary_id}`);
    const { data, error } = await supabase.rpc("create_weekly_settlement", {
      target_beneficiary_id: row.beneficiary_id,
      target_beneficiary_type: row.beneficiary_type,
      target_period_start: row.first_delivery_date,
      target_period_end: row.last_delivery_date,
    });
    if (error) toast.error(error.message); else { toast.success("Bordereau créé."); navigate(`/admin/payouts/${data}`); }
    setBusy("");
  };

  const markPaid = async (statement: any) => {
    const reference = window.prompt("Référence du virement bancaire effectué :");
    if (!reference) return;
    setBusy(statement.id);
    const { error } = await supabase.rpc("mark_settlement_paid", { target_statement_id: statement.id, target_payment_reference: reference });
    if (error) toast.error(error.message); else {
      const { data: document } = await supabase.from("financial_documents").select("id").eq("settlement_id", statement.id).maybeSingle();
      if (document) {
        try { await emailFinancialDocument(document.id); toast.success("Paiement enregistré et bordereau envoyé."); }
        catch (emailError: any) { toast.error(`Paiement enregistré, mais email non envoyé : ${emailError.message}`); }
      } else toast.success("Paiement enregistré.");
      await load();
    }
    setBusy("");
  };

  return <AdminShell title="Règlements hebdomadaires" subtitle="Préparation des bordereaux et traçabilité des virements manuels">
    <section className="rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/5 p-4 text-xs leading-relaxed text-foodiz-gray">Foodiz ne déclenche pas encore le virement bancaire. Le bouton « Marquer payé » doit être utilisé uniquement après avoir réellement effectué le virement, avec sa référence bancaire.</section>
    {loading ? <div className="foodiz-card p-8 text-center text-foodiz-gray animate-pulse">Calcul des montants à payer...</div> : <>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="foodiz-title text-lg">À payer</h2><button onClick={() => void load()} className="text-foodiz-gold"><RefreshCw size={17}/></button></div>{payables.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucune commande livrée non réglée.</div> : <div className="grid gap-3 lg:grid-cols-2">{payables.map((row) => { const key = `${row.beneficiary_type}:${row.beneficiary_id}`; return <article key={key} className="foodiz-card p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-foodiz-cream">{row.beneficiary_name}</p><p className="mt-1 text-[10px] uppercase text-foodiz-gray">{row.beneficiary_type === "partner" ? "Partenaire" : "Livreur"} · {row.order_count} commande(s)</p>{row.legal_identifier && <p className="mt-1 text-[10px] text-foodiz-gray">SIRET {row.legal_identifier}</p>}</div><p className="text-2xl font-serif italic text-foodiz-gold">{euros(row.amount_cents)}</p></div><p className="mt-4 text-[10px] text-foodiz-gray">Livraisons du {new Date(row.first_delivery_date).toLocaleDateString("fr-FR")} au {new Date(row.last_delivery_date).toLocaleDateString("fr-FR")}</p><button disabled={busy === key} onClick={() => void createStatement(row)} className="foodiz-btn mt-4 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"><FileText size={16}/>Créer le bordereau</button></article>; })}</div>}</section>

      <section><h2 className="foodiz-title mb-3 text-lg">Bordereaux</h2><div className="space-y-3">{statements.map((statement) => <article key={statement.id} className="foodiz-card flex flex-col gap-4 p-4 md:flex-row md:items-center"><div className="flex flex-1 items-center gap-3"><Landmark size={19} className="text-foodiz-gold"/><div><button onClick={() => navigate(`/admin/payouts/${statement.id}`)} className="font-mono text-sm text-foodiz-cream hover:text-foodiz-gold">{statement.document_number}</button><p className="mt-1 text-[10px] text-foodiz-gray">{statement.beneficiary_name} · {new Date(statement.period_start).toLocaleDateString("fr-FR")} au {new Date(statement.period_end).toLocaleDateString("fr-FR")}</p></div></div><p className="font-semibold text-foodiz-gold">{euros(statement.amount_cents)}</p><span className={`text-[10px] uppercase ${statement.status === "paid" ? "text-foodiz-green" : "text-foodiz-gold"}`}>{statement.status}</span>{statement.status === "draft" && <button disabled={busy === statement.id} onClick={() => void markPaid(statement)} className="rounded-xl border border-foodiz-green/30 bg-foodiz-green/10 px-4 py-2 text-xs text-foodiz-green disabled:opacity-50"><CheckCircle2 size={14} className="mr-1 inline"/>Marquer payé</button>}</article>)}</div></section>
    </>}
  </AdminShell>;
}
