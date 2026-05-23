import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Wallet, 
  Store, 
  Bike, 
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BrainCircuit,
  Search,
  Filter
} from "lucide-react";

type PayoutRequest = {
  id: string;
  entityName: string;
  type: "partner" | "courier";
  amount: number;
  frequency: "daily" | "weekly";
  status: "pending" | "processing" | "paid";
  lastPayout: string;
};

const MOCK_REQUESTS: PayoutRequest[] = [
  { id: "PAY-001", entityName: "Maison K", type: "partner", amount: 845.20, frequency: "weekly", status: "pending", lastPayout: "15 Janv." },
  { id: "PAY-002", entityName: "Karim (Livreur)", type: "courier", amount: 124.50, frequency: "daily", status: "pending", lastPayout: "Hier" },
  { id: "PAY-003", entityName: "Sushi Ko", type: "partner", amount: 530.00, frequency: "daily", status: "pending", lastPayout: "Hier" },
  { id: "PAY-004", entityName: "Julie (Livreur)", type: "courier", amount: 89.20, frequency: "weekly", status: "pending", lastPayout: "08 Janv." },
];

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "daily" | "weekly">("all");

  const filteredRequests = MOCK_REQUESTS.filter(r => filter === "all" || r.frequency === filter);

  const totals = useMemo(() => ({
    pending: MOCK_REQUESTS.reduce((sum, r) => sum + r.amount, 0),
    count: MOCK_REQUESTS.length
  }), []);

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA]">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/admin")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <Wallet size={20} className="text-foodiz-gold" />
            <h1 className="foodiz-title text-lg uppercase tracking-widest">Gestion des Virements</h1>
          </div>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* IA Smart Payout Banner */}
        <div className="foodiz-card p-6 bg-gradient-to-r from-foodiz-gold/10 to-transparent border-foodiz-gold/20 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-foodiz-gold/20 flex items-center justify-center border border-foodiz-gold/30">
            <BrainCircuit size={32} className="text-foodiz-gold animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-serif italic text-foodiz-cream">Prêt pour le dispatch groupé</h2>
            <p className="text-xs text-foodiz-gray mt-1 uppercase tracking-widest">L'IA a préparé {totals.count} virements Stripe Connect</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] text-foodiz-gray uppercase font-bold">Total à décaisser</p>
            <p className="text-3xl font-serif italic text-foodiz-gold font-bold">{totals.pending.toFixed(2)} €</p>
          </div>
          <button className="w-full md:w-auto px-8 py-4 rounded-full bg-foodiz-gold text-foodiz-black font-bold shadow-[0_0_30px_rgba(216,168,79,0.3)] hover:scale-105 transition-transform">
            VALIDER TOUS LES VIREMENTS
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex bg-white/5 p-1 rounded-full border border-white/10 w-full md:w-auto">
             {[
               { id: "all", label: "Tous", icon: Filter },
               { id: "daily", label: "Quotidien", icon: Clock },
               { id: "weekly", label: "Hebdomadaire", icon: Calendar },
             ].map((btn) => (
               <button
                 key={btn.id}
                 onClick={() => setFilter(btn.id as any)}
                 className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${filter === btn.id ? "bg-foodiz-gold text-foodiz-black" : "text-foodiz-gray hover:text-foodiz-cream"}`}
               >
                 <btn.icon size={12} /> {btn.label}
               </button>
             ))}
           </div>
           
           <div className="relative w-full md:w-64">
             <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foodiz-gray" />
             <input type="text" placeholder="Rechercher..." className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs outline-none focus:border-foodiz-gold/30" />
           </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.map((req) => (
            <div key={req.id} className="foodiz-card p-5 bg-[#0A0A0A] hover:border-foodiz-gold/30 transition-all group">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Type Icon */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${req.type === "partner" ? "bg-foodiz-gold/10 text-foodiz-gold" : "bg-[#3FA76D]/10 text-[#3FA76D]"}`}>
                  {req.type === "partner" ? <Store size={24} /> : <Bike size={24} />}
                </div>

                {/* Entity Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <h3 className="font-bold text-foodiz-cream">{req.entityName}</h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-foodiz-gray uppercase tracking-tighter">{req.id}</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-foodiz-gray">
                      <Calendar size={12} className="text-foodiz-gold/50" />
                      Dernier : {req.lastPayout}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] uppercase font-bold ${req.frequency === "daily" ? "text-amber-400" : "text-blue-400"}`}>
                      {req.frequency === "daily" ? <Clock size={12} /> : <Calendar size={12} />}
                      Virement {req.frequency === "daily" ? "Quotidien" : "Hebdo"}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-center md:text-right px-6 border-x border-white/5">
                   <p className="text-[10px] text-foodiz-gray uppercase font-bold">Montant net</p>
                   <p className="text-2xl font-serif italic text-foodiz-cream">{req.amount.toFixed(2)} €</p>
                </div>

                {/* Individual Action */}
                <div className="flex gap-2">
                  <button className="p-3 rounded-xl bg-foodiz-gold text-foodiz-black hover:scale-105 transition-all shadow-lg shadow-foodiz-gold/10">
                    <CheckCircle2 size={20} />
                  </button>
                  <button className="p-3 rounded-xl bg-white/5 text-foodiz-gray hover:text-red-400 border border-white/10 transition-all">
                    <AlertCircle size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
