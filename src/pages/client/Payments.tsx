import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, ReceiptText } from "lucide-react";
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

  return <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up border-x-2 border-weello-gold/20 relative">
    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
    <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />

    <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/client/account")} className="text-weello-gold"><ChevronLeft size={24} /></button>
        <h1 className="weello-title text-lg">Paiements & reçus</h1>
        <div className="w-6" />
      </div>
    </header>

    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <section>
        <h2 className="weello-title mb-3 flex items-center gap-2 text-sm"><ReceiptText size={17} className="text-weello-gold"/>Mes reçus</h2>
        {loading ? <div className="weello-card p-5 text-center text-sm text-weello-gray animate-pulse">Chargement des reçus...</div> : receipts.length === 0 ? <div className="weello-card p-5 text-center text-sm text-weello-gray">Aucun reçu disponible pour le moment.</div> : <div className="space-y-3">
          {receipts.map((receipt) => <article key={receipt.id} className="weello-card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-mono text-sm text-weello-cream">{receipt.document_number}</p>
              <p className="mt-1 text-[10px] text-weello-gray">{receipt.payload_snapshot?.restaurant_name || "Commande Weello"} · {((receipt.payload_snapshot?.total_paid_cents || 0) / 100).toFixed(2)} €</p>
            </div>
            <button onClick={() => void downloadFinancialDocument(receipt.id, receipt.document_number).catch((error) => toast.error(error.message))} className="rounded-xl border border-weello-gold/20 p-3 text-weello-gold"><Download size={17}/></button>
          </article>)}
        </div>}
      </section>
    </main>
  </div>;
}
