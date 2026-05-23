import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Package
} from "lucide-react";

const MOCK_HISTORY = [
  { id: "ORD-9842", client: "Alexandre M.", items: "Burger x2, Frites x1", total: 38.40, status: "delivered", date: "15 Janv. 2024", time: "19:30" },
  { id: "ORD-9841", client: "Sarah B.", items: "Salade Caesar x1", total: 14.50, status: "delivered", date: "15 Janv. 2024", time: "18:15" },
  { id: "ORD-9840", client: "Marc D.", items: "Poulet Rôti x1", total: 18.90, status: "cancelled", date: "14 Janv. 2024", time: "20:00" },
  { id: "ORD-9839", client: "Julie L.", items: "Tiramisu x2", total: 17.00, status: "delivered", date: "14 Janv. 2024", time: "12:30" },
  { id: "ORD-9838", client: "Thomas P.", items: "Burger Truffe x1", total: 22.50, status: "delivered", date: "13 Janv. 2024", time: "21:00" },
];

export default function PartnerOrdersHistory() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "delivered" | "cancelled">("all");

  const filteredOrders = MOCK_HISTORY.filter(order => {
    const matchesSearch = order.client.toLowerCase().includes(search.toLowerCase()) || order.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || order.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle2 size={16} className="text-foodiz-green" />;
      case "cancelled": return <XCircle size={16} className="text-foodiz-red" />;
      default: return <Clock size={16} className="text-foodiz-gold" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered": return "Livrée";
      case "cancelled": return "Annulée";
      default: return "En cours";
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Historique des Commandes</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-foodiz-card p-4 rounded-2xl border border-foodiz-gold/10">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foodiz-gray" />
            <input 
              type="text" 
              placeholder="Rechercher par client ou N° commande..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-foodiz-black border border-foodiz-gold/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold/50 transition-all"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {(["all", "delivered", "cancelled"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                  filter === f 
                    ? "bg-foodiz-gold text-foodiz-black border-foodiz-gold" 
                    : "bg-foodiz-black text-foodiz-gray border-foodiz-gold/20 hover:border-foodiz-gold/40"
                }`}
              >
                <Filter size={12} /> {f === "all" ? "Toutes" : f === "delivered" ? "Livrées" : "Annulées"}
              </button>
            ))}
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10 hover:border-foodiz-gold/30 transition-all flex flex-col md:flex-row items-center gap-4 group">
              
              {/* Status Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                order.status === "delivered" ? "bg-foodiz-green/10" : order.status === "cancelled" ? "bg-foodiz-red/10" : "bg-foodiz-gold/10"
              }`}>
                {getStatusIcon(order.status)}
              </div>

              {/* Order Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                  <h3 className="font-bold text-foodiz-cream text-sm">{order.id}</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-foodiz-gray uppercase tracking-tighter">
                    {order.date} à {order.time}
                  </span>
                </div>
                <p className="text-xs text-foodiz-gray">Client: <span className="text-foodiz-cream">{order.client}</span></p>
                <p className="text-[10px] text-foodiz-gray/60 mt-0.5 line-clamp-1">{order.items}</p>
              </div>

              {/* Total & Status */}
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                <div className="text-right">
                  <p className="text-[10px] text-foodiz-gray uppercase font-bold">Total</p>
                  <p className="text-lg font-serif italic text-foodiz-cream font-bold">{order.total.toFixed(2).replace(".", ",")} €</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-[10px] text-foodiz-gray uppercase font-bold">Statut</p>
                  <p className={`text-xs font-bold flex items-center justify-end gap-1 ${
                    order.status === "delivered" ? "text-foodiz-green" : order.status === "cancelled" ? "text-foodiz-red" : "text-foodiz-gold"
                  }`}>
                    {getStatusLabel(order.status)}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <p className="text-foodiz-gray text-sm">Aucune commande trouvée pour ces critères.</p>
          </div>
        )}

      </main>
    </div>
  );
}
