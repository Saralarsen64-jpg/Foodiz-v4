import { useState, useEffect } from "react"; // Assure-toi que useEffect est là
import { supabase } from "../../lib/supabase"; // Ajoute cette ligne
import { LogOut } from "lucide-react"; // Ajoute LogOut pour le bouton déconnexion
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ChevronRight,
  Bell,
  Users,
  Star,
  Settings,
  Menu,
  Image as ImageIcon,
  Plus,
  FolderPlus,
  Wallet,
  BarChart3,
  UtensilsCrossed,
  History,
  Megaphone,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";
import { loadPartnerProfile } from "../../utils/partnerStore";

type PeriodKey = "day" | "week" | "month" | "year";

const ACTIVE_ORDERS = [
  { id: "o1", items: "Burger x2, Frites x1", total: 38.4, status: "preparing", time: "12 min", client: "Alexandre" },
  { id: "o2", items: "Salade Caesar x1, Tiramisu x1", total: 24.5, status: "new", time: "0 min", client: "Marie" },
  { id: "o3", items: "Poulet Rôti x1, Légumes x2", total: 32.0, status: "ready", time: "Prête", client: "Julien" },
];

const HISTORY_ORDERS = [
  { id: "h1", client: "Alexandre", total: 28.6, partnerTotal: 19.0, date: "24 mai 2025" },
  { id: "h2", client: "Marie", total: 18.2, partnerTotal: 12.0, date: "24 mai 2025" },
  { id: "h3", client: "Julien", total: 24.0, partnerTotal: 16.0, date: "23 mai 2025" },
  { id: "h4", client: "Sophie", total: 19.5, partnerTotal: 13.0, date: "23 mai 2025" },
  { id: "h5", client: "Nora", total: 44.5, partnerTotal: 30.0, date: "22 mai 2025" },
];

const TOP_CUSTOMERS = [
  { name: "Alexandre M.", orders: 18, avgBasket: 29.4, score: "Elite" },
  { name: "Marie L.", orders: 15, avgBasket: 24.1, score: "Gold" },
  { name: "Julien P.", orders: 13, avgBasket: 26.8, score: "Gold" },
  { name: "Sophie R.", orders: 12, avgBasket: 21.5, score: "Gold" },
  { name: "Nora B.", orders: 10, avgBasket: 34.2, score: "Premium" },
  { name: "Karim D.", orders: 9, avgBasket: 19.6, score: "Silver" },
  { name: "Lina K.", orders: 8, avgBasket: 22.8, score: "Silver" },
  { name: "Yanis F.", orders: 8, avgBasket: 17.9, score: "Silver" },
  { name: "Chloé T.", orders: 7, avgBasket: 31.0, score: "Premium" },
  { name: "Marc V.", orders: 6, avgBasket: 18.2, score: "Silver" },
];

const CHART_DATA: Record<PeriodKey, { label: string; value: number }[]> = {
  day: [
    { label: "10h", value: 42 },
    { label: "12h", value: 138 },
    { label: "14h", value: 96 },
    { label: "16h", value: 54 },
    { label: "18h", value: 128 },
    { label: "20h", value: 164 },
    { label: "22h", value: 88 },
  ],
  week: [
    { label: "Lun", value: 240 },
    { label: "Mar", value: 310 },
    { label: "Mer", value: 280 },
    { label: "Jeu", value: 420 },
    { label: "Ven", value: 380 },
    { label: "Sam", value: 510 },
    { label: "Dim", value: 450 },
  ],
  month: [
    { label: "S1", value: 1420 },
    { label: "S2", value: 1580 },
    { label: "S3", value: 1710 },
    { label: "S4", value: 1890 },
  ],
  year: [
    { label: "Jan", value: 4200 },
    { label: "Fév", value: 3900 },
    { label: "Mar", value: 4700 },
    { label: "Avr", value: 5100 },
    { label: "Mai", value: 5600 },
    { label: "Juin", value: 5900 },
  ],
};

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rating, setRating] = useState("4,8");
  const [period, setPeriod] = useState<PeriodKey>("week");
  const profile = useMemo(() => loadPartnerProfile(), []);

  useEffect(() => {
    const saved = localStorage.getItem("foodiz_reviews_v1");
    if (saved) {
      const reviews = JSON.parse(saved);
      const partnerReviews = reviews.filter((r: any) => r.restaurantRating > 0);
      if (partnerReviews.length > 0) {
        const avg = partnerReviews.reduce((sum: number, r: any) => sum + r.restaurantRating, 0) / partnerReviews.length;
        const finalRating = ((4.8 * 10 + avg) / 11).toFixed(1).replace(".", ",");
        setRating(finalRating);
      }
    }
  }, []);

  const chartPoints = CHART_DATA[period];
  const chartMax = Math.max(...chartPoints.map((d) => d.value));
  const currentRevenue = chartPoints.reduce((sum, item) => sum + item.value, 0);

  const quickActions = [
    { label: "Créer un produit", icon: Plus, path: "/partner/products/new", desc: "Ajouter un nouveau plat" },
    { label: "Créer une catégorie", icon: FolderPlus, path: "/partner/menu", desc: "Structurer votre carte" },
    { label: "Photo fiche établissement", icon: ImageIcon, path: "/partner/settings", desc: "Mettre à jour la couverture" },
    { label: "Photos produits", icon: UtensilsCrossed, path: "/partner/products", desc: "Éditer les cartes plats" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing", desc: "Envoyer une campagne locale" },
    { label: "Historique commandes", icon: History, path: "/partner/orders/history", desc: "Revoir toutes les ventes" },
    { label: "Virements", icon: Wallet, path: "/partner/payouts", desc: "Choisir quotidien ou hebdo" },
  ];

  const sidebarItems = [
    { label: "Dashboard", icon: TrendingUp, path: "/partner" },
    { label: "Commandes en cours", icon: ShoppingBag, path: "/partner/orders/current" },
    { label: "Historique", icon: History, path: "/partner/orders/history" },
    { label: "Revenus", icon: DollarSign, path: "/partner/revenues" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing" },
    { label: "Menu", icon: Menu, path: "/partner/menu" },
    { label: "Produits", icon: UtensilsCrossed, path: "/partner/products" },
    { label: "Clients", icon: Users, path: "/partner/customers" },
    { label: "Virements", icon: Wallet, path: "/partner/payouts" },
    { label: "Paramètres", icon: Settings, path: "/partner/settings" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden">
            <Menu size={22} />
          </button>
          <Logo size="md" />
          <button onClick={() => navigate("/partner/orders/current")} className="relative">
            <Bell size={20} className="text-foodiz-gold" />
            <span className="absolute -top-1 -right-1 bg-foodiz-gold text-foodiz-black text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-foodiz-card border-r border-foodiz-gold/10 p-6 overflow-y-auto">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
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

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="foodiz-card overflow-hidden p-0 border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-0">
            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-foodiz-gold font-bold mb-2">Espace Partenaire Foodiz</p>
              <h1 className="foodiz-title text-3xl mb-2">Bonjour, {profile.name}</h1>
              <p className="text-foodiz-gray text-sm max-w-xl leading-relaxed">
                Pilotez votre activité, votre carte, vos visuels et vos revenus depuis un cockpit unique pensé pour la performance et l’image premium de votre établissement.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {[
                  { label: "Commandes aujourd'hui", value: 24, icon: ShoppingBag, change: "+12 %" },
                  { label: "CA du jour", value: "386,50 €", icon: DollarSign, change: "+8 %" },
                  { label: "Note moyenne", value: rating, icon: Star, change: "▲ 0,2" },
                  { label: "Temps moyen", value: "22 min", icon: Clock, change: "-3 min" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <GoldIcon icon={stat.icon} size={18} />
                      <span className="text-[10px] text-foodiz-green font-medium">{stat.change}</span>
                    </div>
                    <p className="text-2xl font-bold font-serif text-foodiz-cream">{stat.value}</p>
                    <p className="text-[10px] text-foodiz-gray mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative min-h-[240px] bg-black/15">
              <img src={profile.coverImage} alt={profile.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold font-bold">Fiche établissement</p>
                  <p className="text-sm text-foodiz-cream mt-1">{profile.hours}</p>
                  <p className="text-[11px] text-foodiz-gray mt-1">{profile.location}</p>
                </div>
                <button
                  onClick={() => navigate("/partner/settings")}
                  className="shrink-0 px-4 py-2 rounded-full bg-foodiz-gold text-foodiz-black text-xs font-bold"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick management menu */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="foodiz-title text-lg">Outils de gestion</h2>
            <span className="text-[10px] text-foodiz-gray uppercase tracking-widest">Menu, visuels, revenus</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="foodiz-card p-4 text-left hover:border-foodiz-gold/35 transition-all bg-[linear-gradient(145deg,rgba(216,168,79,0.05),rgba(17,17,17,0.98)_25%,rgba(10,10,10,1)_100%)]"
              >
                <div className="w-11 h-11 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center mb-3">
                  <GoldIcon icon={action.icon} size={18} />
                </div>
                <p className="text-sm font-medium text-foodiz-cream">{action.label}</p>
                <p className="text-[10px] text-foodiz-gray mt-1">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Intelligent chart */}
        <div className="foodiz-card p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h3 className="foodiz-title text-lg">Graphique intelligent</h3>
              <p className="text-foodiz-gray text-xs mt-1">Évolution du chiffre d’affaires de la journée à l’année</p>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {[
                { key: "day", label: "Jour" },
                { key: "week", label: "Semaine" },
                { key: "month", label: "Mois" },
                { key: "year", label: "Année" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setPeriod(btn.key as PeriodKey)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    period === btn.key
                      ? "bg-foodiz-gold text-foodiz-black"
                      : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray hover:border-foodiz-gold/30"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-end">
            <div>
              <div className="flex items-end gap-2 h-44">
                {chartPoints.map((d) => (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[9px] text-foodiz-gray">{d.value}€</span>
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-foodiz-gold/55 to-foodiz-gold/18 hover:from-foodiz-gold/70 transition-all shadow-[0_0_18px_rgba(216,168,79,0.1)]"
                      style={{ height: `${(d.value / chartMax) * 100}%` }}
                    />
                    <span className="text-[10px] text-foodiz-gray">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-foodiz-gold/10 bg-white/[0.02] p-5">
              <div className="w-12 h-12 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center mb-4">
                <GoldIcon icon={BarChart3} size={18} />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gray font-bold mb-2">Période sélectionnée</p>
              <p className="text-3xl font-serif italic text-foodiz-gold font-bold">{currentRevenue.toFixed(0)}€</p>
              <p className="text-foodiz-gray text-xs mt-2">Lecture intelligente du chiffre d’affaires selon l’horizon choisi.</p>
            </div>
          </div>
        </div>

        {/* Orders + Top customers */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="foodiz-title text-lg">Commandes en cours</h2>
              <button
                onClick={() => navigate("/partner/orders/current")}
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
                    order.status === "new" ? "bg-foodiz-gold/20" : order.status === "preparing" ? "bg-foodiz-gold/15" : "bg-foodiz-green/10"
                  }`}>
                    <ShoppingBag size={18} className={order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foodiz-cream">{order.client}</h3>
                      <span className={`text-[10px] font-medium ${order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold"}`}>
                        {order.status === "new" ? "Nouvelle" : order.status === "preparing" ? "En préparation" : "Prête"}
                      </span>
                    </div>
                    <p className="text-[11px] text-foodiz-gray mt-0.5">{order.items}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-foodiz-gold text-xs font-semibold">{order.total.toFixed(2).replace(".", ",")} €</span>
                      <span className="text-[10px] text-foodiz-gray">• {order.time}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-foodiz-gold/30" />
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="foodiz-title text-lg">Historique récent</h2>
                <button
                  onClick={() => navigate("/partner/orders/history")}
                  className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
                >
                  Historique complet <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {HISTORY_ORDERS.slice(0, 4).map((order) => (
                  <div key={order.id} className="foodiz-card p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-foodiz-cream font-medium">{order.client}</p>
                      <p className="text-[10px] text-foodiz-gray mt-1">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-foodiz-gold text-sm font-semibold">{order.total.toFixed(2).replace(".", ",")} €</p>
                      <p className="text-[10px] text-foodiz-gray">Reçu {order.partnerTotal.toFixed(2).replace(".", ",")} €</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="foodiz-title text-lg">Top 10 meilleurs clients</h2>
              <button
                onClick={() => navigate("/partner/customers")}
                className="text-foodiz-gold text-xs font-semibold flex items-center gap-1"
              >
                Voir tout <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((customer, index) => (
                <div key={customer.name} className="foodiz-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center text-foodiz-gold font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foodiz-cream font-medium">{customer.name}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 text-foodiz-gold uppercase tracking-widest">
                        {customer.score}
                      </span>
                    </div>
                    <p className="text-[10px] text-foodiz-gray mt-1">{customer.orders} commandes • panier moyen {customer.avgBasket.toFixed(2).replace(".", ",")} €</p>
                  </div>
                  <Users size={16} className="text-foodiz-gold/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
