import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronLeft, Download, Landmark, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { downloadFinancialDocument } from "../../lib/financialDocuments";

export default function PartnerPayouts() {
  const navigate = useNavigate();
  const [recordedRevenue, setRecordedRevenue] = useState(0);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  useEffect(() => { void (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: restaurant } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    const [ordersResult, payoutsResult, documentsResult] = await Promise.all([
      restaurant ? supabase.from("orders").select("partner_total_cents").eq("restaurant_id", restaurant.id).eq("status", "delivered") : Promise.resolve({ data: [] }),
      supabase.from("payouts").select("id,amount_cents,status,requested_at,paid_at,failure_reason,settlement_id").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("financial_documents").select("id,document_number,status,generated_at,last_emailed_at,payload_snapshot").eq("document_type", "settlement_statement").order("generated_at", { ascending: false }),
    ]);
    setRecordedRevenue((ordersResult.data || []).reduce((sum: number, order: any) => sum + (order.partner_total_cents || 0), 0) / 100);
    setPayouts(payoutsResult.data || []); setDocuments(documentsResult.data || []);
  })(); }, []);

  return <div className="min-h-screen bg-foodiz-black pb-24"><header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-foodiz-card px-4 py-3"><div className="mx-auto flex max-w-4xl items-center gap-3"><button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={24}/></button><h1 className="foodiz-title text-lg">Virements & paiements</h1></div></header><main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
    <section className="rounded-[2rem] border border-foodiz-gold/25 bg-[linear-gradient(145deg,rgba(216,168,79,0.18),rgba(17,17,17,0.98)_48%)] p-6"><Landmark size={24} className="text-foodiz-gold"/><p className="mt-5 text-[10px] uppercase tracking-widest text-foodiz-gray">Revenus livrés enregistrés</p><p className="mt-2 text-4xl font-serif italic text-foodiz-cream">{recordedRevenue.toFixed(2)} €</p><p className="mt-3 text-xs text-foodiz-gray">Ce montant représente les commandes livrées, pas un solde bancaire disponible.</p></section>
    <section className="foodiz-card flex gap-3 border-foodiz-gold/20 p-5"><AlertCircle className="shrink-0 text-foodiz-gold" size={20}/><div><p className="font-semibold text-foodiz-cream">Justificatifs de reversement</p><p className="mt-2 text-xs leading-relaxed text-foodiz-gray">Chaque virement enregistré produit un bordereau détaillé et téléchargeable pour la période concernée.</p></div></section>
    <section><h2 className="foodiz-title mb-3 flex items-center gap-2 text-sm"><ReceiptText size={17} className="text-foodiz-gold"/>Bordereaux</h2>{documents.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucun bordereau disponible.</div> : <div className="space-y-3">{documents.map((document) => <div key={document.id} className="foodiz-card flex items-center justify-between gap-4 p-4"><div><p className="font-mono text-sm text-foodiz-cream">{document.document_number}</p><p className="mt-1 text-[10px] text-foodiz-gray">Du {new Date(document.payload_snapshot.period_start).toLocaleDateString("fr-FR")} au {new Date(document.payload_snapshot.period_end).toLocaleDateString("fr-FR")} · {((document.payload_snapshot.amount_cents || 0) / 100).toFixed(2)} €</p></div><button onClick={() => void downloadFinancialDocument(document.id, document.document_number).catch((error) => toast.error(error.message))} className="rounded-xl border border-foodiz-gold/20 p-3 text-foodiz-gold"><Download size={17}/></button></div>)}</div>}</section>
    <section><h2 className="foodiz-title mb-3 text-sm">Historique des virements</h2>{payouts.length === 0 ? <div className="foodiz-card p-5 text-sm text-foodiz-gray">Aucun virement enregistré.</div> : <div className="space-y-3">{payouts.map((payout) => <div key={payout.id} className="foodiz-card flex items-center justify-between p-4"><div><p className="text-sm font-semibold text-foodiz-cream">{((payout.amount_cents || 0) / 100).toFixed(2)} €</p><p className="mt-1 text-[10px] text-foodiz-gray">{new Date(payout.paid_at || payout.requested_at).toLocaleString("fr-FR")}</p></div><span className="text-[10px] uppercase text-foodiz-gold">{payout.status}</span></div>)}</div>}</section>
  </main></div>;
}
