import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ChevronRight,
  Bell,
  Star,
  Settings,
  Menu,
  Store,
  Sparkles,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";

const STATS = [
  { label: "Commandes aujourd'hui", value: 24, icon: ShoppingBag, change: "+12 %" },
  { label: "Chiffre d'affaires du jour", value: "386,50 €", icon: DollarSign, change: "+8 %" },
  { label: "Note moyenne", value: "4,8", icon: Star, change: "▲ 0,2" },
  { label: "Temps moyen", value: "22 min", icon: Clock, change: "-3 min" },
];

const ACTIVE_ORDERS = [
  { id: "o1", items: "Burger x2, Frites x1", total: 38.40, status: "preparing", time: "12 min", client: "Alexandre" },
  { id: "o2", items: "Salade Caesar x1, Tiramisu x1", total: 24.50, status: "new", time: "0 min", client: "Marie" },
  { id: "o3", items: "Poulet Rôti x1, Légumes x2", total: 32.00, status: "ready", time: "Prête", client: "Julien" },
];

const WEEKLY_DATA = [
  { day: "Lun", value: 240 },
  { day: "Mar", value: 310 },
  { day: "Mer", value: 280 },
  { day: "Jeu", value: 420 },
  { day: "Ven", value: 380 },
  { day: "Sam", value: 510 },
  { day: "Dim", value: 450 },
];

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rating, setRating] = useState("4,8");

  useEffect(() => {
    const saved = localStorage.getItem("foodiz_reviews_v1");
    if (saved) {
      const reviews = JSON.parse(saved);
      // Maison K as default in this demo dashboard
      const partnerReviews = reviews.filter((r: any) => r.restaurantRating > 0);
      if (partnerReviews.length > 0) {
        const avg = partnerReviews.reduce((sum: number, r: any) => sum + r.restaurantRating, 0) / partnerReviews.length;
        const finalRating = ((4.8 * 10 + avg) / 11).toFixed(1).replace(".", ",");
        setRating(finalRating);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-foodiz-black">
      {/* Top Bar */}
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden">
            <Menu size={22} />
          </button>
          <Logo size="md" />
          <button className="relative">
            <Bell size={20} className="text-foodiz-gold" />
            <span className="absolute -top-1 -right-1 bg-foodiz-gold text-foodiz-black text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-foodiz-card border-r border-foodiz-gold/10 p-6">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {[
                { label: "Dashboard", icon: TrendingUp, path: "/partner" },
                { label: "Commandes en cours", icon: ShoppingBag, path: "/partner/orders/current" },
                { label: "Historique", icon: Clock, path: "/partner/orders/history" },
                { label: "Analytics & Clients", icon: DollarSign, path: "/partner/analytics" },
                { label: "Menu", icon: Menu, path: "/partner/menu" },
                { label: "Virements", icon: DollarSign, path: "/partner/payouts" },
                { label: "Paramètres", icon: Settings, path: "/partner/settings" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all"
                >
                  <GoldIcon icon={item.icon} size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="foodiz-title text-2xl mb-1">Bonjour, Maison K</h1>
        <p className="text-foodiz-gray text-sm mb-8">Voici votre activité du jour</p>

        {/* Stats - Premium Kraft Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Commandes", value: 24, icon: ShoppingBag, change: "+12 %" },
            { label: "Chiffre d'affaires", value: "386,50 €", icon: DollarSign, change: "+8 %" },
            { label: "Note moyenne", value: rating, icon: Star, change: "▲ 0,2" },
            { label: "Temps moyen", value: "22 min", icon: Clock, change: "-3 min" },
          ].map((stat) => (
            <div 
              key={stat.label} 
              className="relative p-5 rounded-sm shadow-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              style={{ 
                backgroundImage: "url('/images/kraft-texture.jpg')", 
                backgroundSize: 'cover',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
              }}
            >
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-[#1a1a1a]/5 rounded-bl-full" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#D8A84F]">
                    <stat.icon size={18} className="text-[#D8A84F]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-white/80 px-2 py-1 rounded-full shadow-sm">
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-serif font-bold text-[#1a1a1a] italic">{stat.value}</p>
                <p className="text-[9px] text-[#5C4033] uppercase tracking-[0.15em] font-bold mt-2">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu des Fonctionnalités (Navigation Rapide) */}
        <h2 className="foodiz-title text-lg text-foodiz-cream mb-4 border-l-4 border-foodiz-gold pl-3">Gestion de mon Établissement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Foodiz+ Marketing", icon: Sparkles, path: "/partner/marketing", desc: "Campagnes locales intelligentes", special: true },
            { label: "Commandes en cours", icon: ShoppingBag, path: "/partner/orders/current", desc: "Gérer les commandes actives" },
            { label: "Historique des commandes", icon: Clock, path: "/partner/orders/history", desc: "Voir l'historique complet" },
            { label: "Analytics & Top Clients", icon: TrendingUp, path: "/partner/analytics", desc: "Graphique intelligent CA & VIP" },
            { label: "Gestion du Menu", icon: Menu, path: "/partner/menu", desc: "Créer catégories, plats & photos" },
            { label: "Fiche Établissement", icon: Store, path: "/partner/settings", desc: "Uploader bannière & infos" },
            { label: "Virements & Gains", icon: DollarSign, path: "/partner/payouts", desc: "Suivre les paiements" },
          ].map((item: any, i: number) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`foodiz-card p-6 text-left hover:border-foodiz-gold/50 transition-all group flex items-start gap-4 ${item.special ? 'bg-foodiz-gold/10 border-foodiz-gold/30 border-2' : 'bg-foodiz-card border border-foodiz-gold/10'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.special ? 'bg-foodiz-gold' : 'bg-foodiz-gold/10 group-hover:bg-foodiz-gold/20'}`}>
                <item.icon size={24} className={item.special ? 'text-foodiz-black' : 'text-foodiz-gold'} />
              </div>
              <div>
                <h3 className={`text-sm font-bold transition-colors ${item.special ? 'text-foodiz-gold' : 'text-foodiz-cream group-hover:text-foodiz-gold'}`}>{item.label}</h3>
                <p className="text-[10px] text-foodiz-gray mt-1">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="foodiz-card p-5 mb-8">
          <h3 className="foodiz-title text-sm mb-4">Activité cette semaine</h3>
          <div className="flex items-end gap-2 h-32">
            {WEEKLY_DATA.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-foodiz-gray">{d.value}€</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-foodiz-gold/40 to-foodiz-gold/20 hover:from-foodiz-gold/60 transition-all"
                  style={{ height: `${(d.value / 510) * 100}%` }}
                />
                <span className="text-[10px] text-foodiz-gray">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Orders */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="foodiz-title text-lg">Commandes en cours</h2>
            <button
              onClick={() => navigate("/partner/orders")}
              className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
            >
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {ACTIVE_ORDERS.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/partner/orders/${order.id}`)}
                className="w-full foodiz-card p-4 flex items-center gap-4 text-left hover:border-foodiz-gold/30 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  order.status === "new" ? "bg-foodiz-gold/20" :
                  order.status === "preparing" ? "bg-foodiz-gold/15" : "bg-foodiz-green/10"
                }`}>
                  <ShoppingBag size={18} className={
                    order.status === "new" ? "text-foodiz-gold" :
                    order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold/70"
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foodiz-cream">{order.client}</h3>
                    <span className={`text-[10px] font-medium ${
                      order.status === "new" ? "text-foodiz-gold" :
                      order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold/70"
                    }`}>
                      {order.status === "new" ? "Nouvelle" :
                       order.status === "preparing" ? "En préparation" : "Prête"}
                    </span>
                  </div>
                  <p className="text-[11px] text-foodiz-gray mt-0.5">{order.items}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-foodiz-gold text-xs font-semibold">
                      {order.total.toFixed(2).replace(".", ",")} €
                    </span>
                    <span className="text-[10px] text-foodiz-gray">• {order.time}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-foodiz-gold/30" />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
