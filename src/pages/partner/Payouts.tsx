import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  CreditCard, 
  Calendar, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  Wallet,
  AlertCircle
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function PartnerPayouts() {
  const navigate = useNavigate();
  const [frequency, setRating] = useState<"daily" | "weekly">("weekly");
  const [isUpdating, setIsUpdating] = useState(false);

  const stats = {
    balance: 845.20,
    nextPayout: "Lun. 22 Janv.",
    lastPayout: 1240.00,
  };

  const handleUpdateFrequency = (newFreq: "daily" | "weekly") => {
    setIsUpdating(true);
    setTimeout(() => {
      setRating(newFreq);
      setIsUpdating(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Virements & Paiements</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Solde Card */}
        <div className="foodiz-card p-8 bg-foodiz-gradient-gold border-foodiz-gold/30 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
          <p className="text-[10px] text-foodiz-black font-bold uppercase tracking-[0.2em] mb-2 opacity-60">Solde disponible</p>
          <p className="text-5xl font-serif italic text-foodiz-black font-bold">{stats.balance.toFixed(2)} €</p>
          <div className="mt-6 flex justify-center gap-4">
             <div className="bg-foodiz-black/10 px-4 py-2 rounded-full flex items-center gap-2">
                <Clock size={14} className="text-foodiz-black" />
                <span className="text-[10px] text-foodiz-black font-bold uppercase">Prochain : {stats.nextPayout}</span>
             </div>
          </div>
        </div>

        {/* Choix Fréquence */}
        <div className="foodiz-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={20} className="text-foodiz-gold" />
            <h2 className="foodiz-title text-sm">Fréquence des virements</h2>
          </div>
          <p className="text-xs text-foodiz-gray leading-relaxed">
            Choisissez quand vous souhaitez recevoir vos fonds sur votre compte bancaire.
          </p>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => handleUpdateFrequency("daily")}
              className={`p-4 rounded-2xl border transition-all text-left ${frequency === "daily" ? "bg-foodiz-gold/10 border-foodiz-gold" : "bg-foodiz-card border-foodiz-gold/10"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`p-2 rounded-lg ${frequency === "daily" ? "bg-foodiz-gold text-foodiz-black" : "bg-white/5 text-foodiz-gray"}`}>
                  <Clock size={16} />
                </span>
                {frequency === "daily" && <CheckCircle2 size={16} className="text-foodiz-gold" />}
              </div>
              <p className="text-sm font-bold text-foodiz-cream">Quotidien</p>
              <p className="text-[10px] text-foodiz-gray mt-1">Virement chaque matin (J+1)</p>
            </button>

            <button 
              onClick={() => handleUpdateFrequency("weekly")}
              className={`p-4 rounded-2xl border transition-all text-left ${frequency === "weekly" ? "bg-foodiz-gold/10 border-foodiz-gold" : "bg-foodiz-card border-foodiz-gold/10"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`p-2 rounded-lg ${frequency === "weekly" ? "bg-foodiz-gold text-foodiz-black" : "bg-white/5 text-foodiz-gray"}`}>
                  <Calendar size={16} />
                </span>
                {frequency === "weekly" && <CheckCircle2 size={16} className="text-foodiz-gold" />}
              </div>
              <p className="text-sm font-bold text-foodiz-cream">Hebdomadaire</p>
              <p className="text-[10px] text-foodiz-gray mt-1">Chaque lundi matin</p>
            </button>
          </div>
          {isUpdating && <p className="text-[10px] text-foodiz-gold animate-pulse text-center">Mise à jour de vos préférences...</p>}
        </div>

        {/* Historique */}
        <div className="space-y-3">
           <h3 className="foodiz-title text-sm px-2">Derniers virements</h3>
           {[
             { date: "15 Janv. 2024", amount: 1240.00, status: "Terminé" },
             { date: "08 Janv. 2024", amount: 980.50, status: "Terminé" },
           ].map((p, i) => (
             <div key={i} className="foodiz-card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <ArrowUpRight size={18} className="text-foodiz-gray" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foodiz-cream">{p.amount.toFixed(2)} €</p>
                    <p className="text-[10px] text-foodiz-gray">{p.date}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-foodiz-green bg-foodiz-green/10 px-3 py-1 rounded-full">{p.status}</span>
             </div>
           ))}
        </div>

        <div className="foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10 flex gap-3">
          <AlertCircle size={16} className="text-foodiz-gold shrink-0 mt-0.5" />
          <p className="text-[10px] text-foodiz-gray leading-relaxed">
            Les virements sont effectués via Stripe Connect. Un délai de 1 à 3 jours ouvrés peut être appliqué par votre banque pour la réception effective des fonds.
          </p>
        </div>
      </main>
    </div>
  );
}
