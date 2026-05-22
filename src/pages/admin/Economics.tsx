import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  BarChart3, 
  Wallet, 
  User, 
  Store, 
  Bike, 
  ShieldCheck, 
  ArrowUpRight,
  BrainCircuit,
  History,
  Info,
  Server,
  Truck
} from "lucide-react";

// Structure des tranches selon le brief initial
type EconomicSplit = {
  courier: number;
  foodizComm: number;
  loyalty: number;
  referral: number;
  internal: number;
  serviceFee: number;
  deliveryFee: number;
};

const calculateEconomicSplit = (partnerPrice: number): EconomicSplit => {
  // Frais classiques fixes pour la simulation dispatch
  const serviceFee = 0.99;
  const deliveryFee = 2.50;

  if (partnerPrice <= 3.50) {
    return { courier: 0.50, foodizComm: 0.50, loyalty: 0.10, referral: 0, internal: 0.10, serviceFee, deliveryFee };
  } else if (partnerPrice <= 8.49) {
    return { courier: 1.00, foodizComm: 1.00, loyalty: 0.20, referral: 0.20, internal: 0.10, serviceFee, deliveryFee };
  } else {
    return { courier: 1.20, foodizComm: 1.50, loyalty: 0.30, referral: 0.30, internal: 0.20, serviceFee, deliveryFee };
  }
};

const MOCK_ORDERS = [
  { id: "ORD-9842", restaurant: "Maison K", partnerPrice: 12.50, client: "Alex M.", date: "À l'instant" },
  { id: "ORD-9841", restaurant: "Sushi Ko", partnerPrice: 7.80, client: "Sarah B.", date: "Il y a 5 min" },
  { id: "ORD-9840", restaurant: "Marché Bio", partnerPrice: 3.20, client: "Marc D.", date: "Il y a 12 min" },
];

export default function AdminEconomics() {
  const navigate = useNavigate();

  const totalEconomy = useMemo(() => {
    return MOCK_ORDERS.reduce((acc, order) => {
      const split = calculateEconomicSplit(order.partnerPrice);
      return {
        totalPartner: acc.totalPartner + order.partnerPrice,
        totalCourier: acc.totalCourier + split.courier + split.deliveryFee, // Part course + frais livraison client
        totalFoodiz: acc.totalFoodiz + split.foodizComm,
        totalInternal: acc.totalInternal + split.internal + split.serviceFee, // Part interne + frais service client
        totalLoyalty: acc.totalLoyalty + split.loyalty,
        totalReferral: acc.totalReferral + split.referral,
      };
    }, { totalPartner: 0, totalCourier: 0, totalFoodiz: 0, totalInternal: 0, totalLoyalty: 0, totalReferral: 0 });
  }, []);

  const subAccounts = [
    { label: "Sous-compte Partenaires", value: totalEconomy.totalPartner, icon: Store, color: "text-[#FFF8EA]", desc: "Dû aux restaurateurs" },
    { label: "Commission Foodiz", value: totalEconomy.totalFoodiz, icon: BarChart3, color: "text-foodiz-gold", desc: "Marge brute plateforme" },
    { label: "Sous-compte Livreurs", value: totalEconomy.totalCourier, icon: Bike, color: "text-[#3FA76D]", desc: "Part fixe + Frais livraison" },
    { label: "Frais Internes & Service", value: totalEconomy.totalInternal, icon: Server, color: "text-blue-400", desc: "Coûts structure + Frais service" },
    { label: "Réserve Fidélité", value: totalEconomy.totalLoyalty, icon: Wallet, color: "text-amber-300", desc: "Provision points générés" },
    { label: "Réserve Parrainage", value: totalEconomy.totalReferral, icon: User, color: "text-purple-400", desc: "Provision bonus invitations" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA]">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/admin")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <BrainCircuit size={20} className="text-foodiz-gold" />
            <h1 className="foodiz-title text-lg uppercase tracking-widest">Dispatch IA avec Frais Annexes</h1>
          </div>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* IA Status Banner */}
        <div className="foodiz-card p-4 bg-foodiz-gold/5 border-foodiz-gold/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 flex items-center justify-center border border-foodiz-gold/20">
            <div className="w-2 h-2 bg-foodiz-gold rounded-full animate-ping" />
          </div>
          <div>
            <p className="text-sm font-medium text-foodiz-gold">Agent IA Connecté à Stripe Connect</p>
            <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Redispach auto : Prix + Livraison + Service</p>
          </div>
          <div className="ml-auto flex gap-2">
             <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] text-foodiz-gray uppercase font-bold flex items-center gap-2">
               <Truck size={12} className="text-foodiz-gold" /> Livraison incluse
             </div>
             <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] text-foodiz-gray uppercase font-bold flex items-center gap-2">
               <Server size={12} className="text-foodiz-gold" /> Service inclus
             </div>
          </div>
        </div>

        {/* Sub-Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subAccounts.map((acc, i) => (
            <div key={i} className="foodiz-card p-6 bg-[#0A0A0A] group hover:border-foodiz-gold/40 transition-all duration-500">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <acc.icon size={24} className={acc.color} />
                </div>
                <ArrowUpRight size={16} className="text-foodiz-gray/30" />
              </div>
              <p className="text-[10px] text-foodiz-gray uppercase font-bold tracking-[0.2em] mb-1">{acc.label}</p>
              <p className="text-3xl font-serif italic text-foodiz-cream">{acc.value.toFixed(2)} €</p>
              <p className="text-[9px] text-foodiz-gray/60 mt-2 italic">{acc.desc}</p>
            </div>
          ))}
        </div>

        {/* Live Transaction Ledger */}
        <div className="foodiz-card overflow-hidden">
          <div className="p-6 border-b border-foodiz-gold/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-foodiz-gold" />
              <h2 className="foodiz-title text-sm">Journal de Ventilation IA Complète</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-foodiz-gray font-bold">
                <tr>
                  <th className="px-6 py-4">Commande</th>
                  <th className="px-6 py-4">Ventilation Resto</th>
                  <th className="px-6 py-4 text-center">Dispatch Livreur</th>
                  <th className="px-6 py-4 text-center">Dispatch Interne</th>
                  <th className="px-6 py-4 text-center text-foodiz-gold">Foodiz Net</th>
                  <th className="px-6 py-4 text-center">Reserves</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/[0.05]">
                {MOCK_ORDERS.map((order) => {
                  const split = calculateEconomicSplit(order.partnerPrice);
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-foodiz-cream">{order.id}</p>
                        <p className="text-[9px] text-foodiz-gray uppercase">{order.date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-foodiz-cream">{order.partnerPrice.toFixed(2)} €</p>
                        <p className="text-[9px] text-foodiz-gray uppercase">Prix article</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="font-medium">{(split.courier + split.deliveryFee).toFixed(2)} €</p>
                        <p className="text-[9px] text-foodiz-gray uppercase">Fixe + Livr.</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="font-medium">{(split.internal + split.serviceFee).toFixed(2)} €</p>
                        <p className="text-[9px] text-foodiz-gray uppercase">Interne + Serv.</p>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-foodiz-gold">{split.foodizComm.toFixed(2)} €</td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-[10px] font-bold text-amber-300">{(split.loyalty + split.referral).toFixed(2)} €</p>
                        <p className="text-[9px] text-foodiz-gray uppercase tracking-tighter">Fid + Parr</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="foodiz-card p-4 bg-white/[0.01] flex gap-3 border-foodiz-gold/10">
           <Info size={16} className="text-foodiz-gold shrink-0 mt-0.5" />
           <p className="text-[10px] text-foodiz-gray leading-relaxed">
             Le moteur IA applique ici une ventilation multi-couches. 
             Contrairement aux plateformes classiques, **Foodiz ne prélève rien sur le prix restaurant**. 
             Les revenus Foodiz proviennent exclusivement du supplément client, tandis que les frais de service et livraison sont 100% alloués à la structure technique et aux livreurs.
           </p>
        </div>
      </main>
    </div>
  );
}
