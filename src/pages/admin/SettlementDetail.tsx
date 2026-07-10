import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Mail, Printer } from "lucide-react";
import toast from "react-hot-toast";
import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";
import { downloadFinancialDocument, emailFinancialDocument } from "../../lib/financialDocuments";

const euros = (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`;

export default function AdminSettlementDetail() {
  const { id } = useParams();
  const [statement, setStatement] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [document, setDocument] = useState<any>(null);
  useEffect(() => { if (!id) return; void (async () => { const [{ data: statementRow }, { data: itemRows }, { data: documentRow }] = await Promise.all([supabase.from("settlement_statements").select("*").eq("id", id).single(), supabase.from("settlement_statement_items").select("id,order_id,amount_cents,allocation_type,order:orders(created_at,delivered_at)").eq("statement_id", id).order("created_at"), supabase.from("financial_documents").select("*").eq("settlement_id", id).maybeSingle()]); setStatement(statementRow); setItems(itemRows || []); setDocument(documentRow); })(); }, [id]);
  if (!statement) return <AdminShell title="Bordereau"><div className="p-8 text-weello-gray animate-pulse">Chargement...</div></AdminShell>;
  return <AdminShell title={statement.document_number} subtitle="Bordereau de reversement Weello">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">{document && <><button onClick={() => void downloadFinancialDocument(document.id, document.document_number).catch((error) => toast.error(error.message))} className="weello-btn flex items-center gap-2 px-4 py-2"><Download size={16}/>Télécharger PDF</button><button onClick={() => void emailFinancialDocument(document.id).then(() => toast.success("Bordereau envoyé.")).catch((error) => toast.error(error.message))} className="weello-btn-outline flex items-center gap-2 px-4 py-2"><Mail size={16}/>Renvoyer par email</button></>}<button onClick={() => window.print()} className="weello-btn-outline flex items-center gap-2 px-4 py-2"><Printer size={16}/>Imprimer</button></div>
    <article className="weello-card space-y-6 p-6 print:border-0 print:bg-white print:text-black"><header className="flex items-start justify-between gap-5"><div><p className="text-[10px] uppercase tracking-widest text-weello-gold">Weello · Bordereau de reversement</p><h2 className="mt-2 font-mono text-xl">{statement.document_number}</h2><p className="mt-2 text-xs text-weello-gray">Généré le {new Date(statement.generated_at).toLocaleString("fr-FR")}</p></div><div className="text-right"><p className="text-xs uppercase text-weello-gray">Statut</p><p className="mt-1 font-semibold text-weello-gold">{statement.status}</p></div></header>
      <section className="grid gap-4 border-y border-weello-gold/10 py-5 md:grid-cols-2"><div><p className="text-[10px] uppercase text-weello-gray">Bénéficiaire indépendant</p><p className="mt-2 font-semibold">{statement.beneficiary_name}</p><p className="mt-1 text-xs text-weello-gray">Type : {statement.beneficiary_type}</p>{statement.legal_identifier && <p className="mt-1 text-xs text-weello-gray">SIRET : {statement.legal_identifier}</p>}</div><div><p className="text-[10px] uppercase text-weello-gray">Période</p><p className="mt-2">Du {new Date(statement.period_start).toLocaleDateString("fr-FR")} au {new Date(statement.period_end).toLocaleDateString("fr-FR")}</p>{statement.payment_reference && <p className="mt-2 text-xs">Référence bancaire : {statement.payment_reference}</p>}</div></section>
      <table className="w-full text-left text-xs"><thead><tr className="text-weello-gold"><th className="py-3">Commande</th><th>Date livrée</th><th className="text-right">Montant reversé</th></tr></thead><tbody className="divide-y divide-white/10">{items.map((item) => <tr key={item.id}><td className="py-3 font-mono">#{item.order_id.slice(0, 8)}</td><td>{item.order?.delivered_at ? new Date(item.order.delivered_at).toLocaleDateString("fr-FR") : "-"}</td><td className="text-right">{euros(item.amount_cents)}</td></tr>)}</tbody><tfoot><tr className="border-t border-weello-gold/20 text-base font-semibold"><td colSpan={2} className="pt-4">Total</td><td className="pt-4 text-right text-weello-gold">{euros(statement.amount_cents)}</td></tr></tfoot></table>
      <footer className="rounded-xl border border-weello-gold/10 bg-white/[0.02] p-4 text-[10px] leading-relaxed text-weello-gray">Ce bordereau documente les commandes et montants reversés par Weello. Il ne remplace ni le contrat conclu avec le bénéficiaire, ni ses factures et obligations fiscales ou sociales. La qualification d'indépendant dépend des conditions réelles d'exécution de l'activité, notamment de l'absence de lien de subordination.</footer>
    </article>
  </AdminShell>;
}
