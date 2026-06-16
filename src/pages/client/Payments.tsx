import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CreditCard, Download, ReceiptText, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { downloadFinancialDocument } from "../../lib/financialDocuments";

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("financial_documents")
        .select("id,document_number,status,generated_at,last_emailed_at,payload_snapshot")
        .eq("document_type", "client_payment_receipt")
        .order("generated_at", { ascending: false })
        .limit(50);
      setReceipts(data || []);
      setLoading(false);
    })();
  }, []);

  return <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
    <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

    <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
        <h1 className="foodiz-title text-lg">Paiements & reçus</h1>
        <div className="w-6" />
      </div>
    </header>

    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <section className="rounded-[2rem] border border-foodiz-gold/25 bg-[linear-gradient(145deg,rgba(216,168,79,0.18),rgba(17,17,17,0.98)_45%)] p-6 shadow-[0_0_45px_rgba(216,168,79,0.08)]">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-foodiz-gold/25 bg-foodiz-gold/10 p-3 text-foodiz-gold"><ShieldCheck size={24}/></div>
          <div>
            <h2 className="foodiz-title text-xl text-foodiz-cream">Paiement sécurisé par Stripe</h2>
            <p className="mt-2 text-sm leading-relaxed text-foodiz-gray">
              Foodiz ne collecte pas et ne stocke pas vos numéros de carte. Les paiements sont saisis uniquement dans l’espace sécurisé Stripe au moment de commander.
            </p>
          </div>
        </div>
      </section>

      <section className="foodiz-card p-5">
        <div className="flex items-center gap-3">
          <CreditCard size={20} className="text-foodiz-gold"/>
          <div>
            <p className="font-semibold text-foodiz-cream">Cartes enregistrées</p>
            <p className="mt-1 text-xs text-foodiz-gray">Aucune carte n’est enregistrée directement dans Foodiz.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="foodiz-title mb-3 flex items-center gap-2 text-sm"><ReceiptText size={17} className="text-foodiz-gold"/>Mes reçus</h2>
        {loading ? <div className="foodiz-card p-5 text-center text-sm text-foodiz-gray animate-pulse">Chargement des reçus...</div> : receipts.length === 0 ? <div className="foodiz-card p-5 text-center text-sm text-foodiz-gray">Aucun reçu disponible pour le moment.</div> : <div className="space-y-3">
          {receipts.map((receipt) => <article key={receipt.id} className="foodiz-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-mono text-sm text-foodiz-cream">{receipt.document_number}</p>
              <p className="mt-1 text-[10px] text-foodiz-gray">{receipt.payload_snapshot?.restaurant_name || "Commande Foodiz"} · {((receipt.payload_snapshot?.total_paid_cents || 0) / 100).toFixed(2)} €</p>
            </div>
            <button onClick={() => void downloadFinancialDocument(receipt.id, receipt.document_number).catch((error) => toast.error(error.message))} className="rounded-xl border border-foodiz-gold/20 p-3 text-foodiz-gold"><Download size={17}/></button>
          </article>)}
        </div>}
      </section>
    </main>
  </div>;
}
