import { useEffect, useState } from "react";
import { Download, Landmark, ReceiptText, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import CourierShell from "../../components/CourierShell";
import { downloadFinancialDocument } from "../../lib/financialDocuments";

export default function CourierPayouts() {
  const [total, setTotal] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);
  useEffect(() => { void (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const [{ data: orders }, { data: documentRows }] = await Promise.all([
      supabase.from("orders").select("delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents").eq("courier_id", user.id).eq("status", "delivered"),
      supabase.from("financial_documents").select("id,document_number,status,generated_at,payload_snapshot").eq("document_type", "settlement_statement").order("generated_at", { ascending: false }),
    ]);
    setTotal((orders || []).reduce((sum, order) => sum + (order.delivery_fee_cents || 0) + (order.courier_earnings_cents || 0) + (order.courier_prime_fund_cents || 0), 0) / 100);
    setDocuments(documentRows || []);
  })(); }, []);
  return <CourierShell title="Paiements" back="/courier"><section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.18),rgba(17,17,17,0.96)_42%)] p-6"><Landmark size={24} className="text-foodiz-gold"/><p className="mt-5 text-[10px] uppercase tracking-widest text-foodiz-gray">Gains cumulés</p><p className="mt-2 text-4xl font-serif italic text-foodiz-cream">{total.toFixed(2)} €</p></section><div className="foodiz-card mt-4 flex gap-4 border-foodiz-gold/20 p-5"><ShieldAlert size={22} className="shrink-0 text-foodiz-gold"/><div><p className="font-semibold text-foodiz-cream">Justificatifs de règlement</p><p className="mt-2 text-xs text-foodiz-gray">Chaque paiement enregistré produit un bordereau détaillé téléchargeable.</p></div></div><section className="mt-5"><h2 className="foodiz-title mb-3 flex items-center gap-2 text-sm"><ReceiptText size={17} className="text-foodiz-gold"/>Mes bordereaux</h2>{documents.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucun bordereau disponible.</div> : <div className="space-y-3">{documents.map((document) => <article key={document.id} className="foodiz-card flex items-center justify-between gap-3 p-4"><div><p className="font-mono text-sm text-foodiz-cream">{document.document_number}</p><p className="mt-1 text-[10px] text-foodiz-gray">Du {new Date(document.payload_snapshot.period_start).toLocaleDateString("fr-FR")} au {new Date(document.payload_snapshot.period_end).toLocaleDateString("fr-FR")} · {((document.payload_snapshot.amount_cents || 0) / 100).toFixed(2)} €</p></div><button onClick={() => void downloadFinancialDocument(document.id, document.document_number).catch((error) => toast.error(error.message))} className="rounded-xl border border-foodiz-gold/20 p-3 text-foodiz-gold"><Download size={17}/></button></article>)}</div>}</section></CourierShell>;
}
