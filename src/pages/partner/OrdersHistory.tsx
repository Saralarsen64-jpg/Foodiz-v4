import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Search, Clock, ChevronRight } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const HISTORICAL = [
  { id: "h1", client: "Alexandre", items: "Burger x2, Frites", total: 28.60, partnerTotal: 19.00, date: "24 mai 2025", status: "Livrée" },
  { id: "h2", client: "Marie", items: "Salade Caesar, Tiramisu", total: 18.20, partnerTotal: 12.00, date: "24 mai 2025", status: "Livrée" },
  { id: "h3", client: "Julien", items: "Poulet Rôti, Légumes", total: 24.00, partnerTotal: 16.00, date: "23 mai 2025", status: "Livrée" },
  { id: "h4", client: "Sophie", items: "Bowl Buddha, Limonade", total: 19.50, partnerTotal: 13.00, date: "23 mai 2025", status: "Annulée" },
];

export default function PartnerOrdersHistory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Historique des commandes</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="relative mb-6">
          <GoldIcon icon={Search} size={16} className="absolute left-4 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une commande..."
            className="w-full bg-foodiz-card border border-foodiz-gold/15 rounded-2xl py-3 pl-10 pr-4 text-foodiz-cream placeholder-foodiz-gray/50 text-sm outline-none focus:border-foodiz-gold/40"
          />
        </div>

        <div className="space-y-2">
          {HISTORICAL.map((h) => (
            <button key={h.id} onClick={() => navigate(`/partner/orders/${h.id}`)}
              className="w-full foodiz-card p-4 flex items-center gap-4 text-left hover:border-foodiz-gold/30 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
                <Clock size={18} className="text-foodiz-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foodiz-cream">{h.client}</h3>
                  <span className={`text-[10px] font-medium ${h.status === "Livrée" ? "text-foodiz-green" : "text-foodiz-red"}`}>
                    {h.status}
                  </span>
                </div>
                <p className="text-[11px] text-foodiz-gray mt-0.5">{h.items}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-foodiz-gold text-xs font-semibold">{h.total.toFixed(2).replace(".", ",")} €</span>
                  <span className="text-[10px] text-foodiz-gray">Client</span>
                  <span className="text-[10px] text-foodiz-gray">•</span>
                  <span className="text-foodiz-green text-xs font-semibold">{h.partnerTotal.toFixed(2).replace(".", ",")} €</span>
                  <span className="text-[10px] text-foodiz-gray">Reçu</span>
                </div>
                <p className="text-[10px] text-foodiz-gray/50 mt-1">{h.date}</p>
              </div>
              <ChevronRight size={16} className="text-foodiz-gold/30 shrink-0" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
