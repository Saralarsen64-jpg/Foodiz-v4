import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ShoppingBag, Clock, DollarSign, Bell, Users, Star, Settings, Menu, Wallet, History, Megaphone, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";

type PeriodKey = "day" | "week" | "month" | "year";

const CHART_DATA: Record<PeriodKey, { label: string; value: number }[]> = {
  day: [{ label: "10h", value: 42 }, { label: "12h", value: 138 }, { label: "14h", value: 96 }, { label: "16h", value: 54 }, { label: "18h", value: 128 }, { label: "20h", value: 164 }, { label: "22h", value: 88 }],
  week: [{ label: "Lun", value: 240 }, { label: "Mar", value: 310 }, { label: "Mer", value: 280 }, { label: "Jeu", value: 420 }, { label: "Ven", value: 380 }, { label: "Sam", value: 510 }, { label: "Dim", value: 450 }],
  month: [{ label: "S1", value: 1420 }, { label: "S2", value: 1580 }, { label: "S3", value: 1710 }, { label: "S4", value: 1890 }],
  year: [{ label: "Jan", value: 4200 }, { label: "Fév", value: 3900 }, { label: "Mar", value: 4700 }, { label: "Avr", value: 5100 }, { label: "Mai", value: 5600 }, { label: "Juin", value: 5900 }],
};

const TOP_CUSTOMERS = [
  { name: "Alexandre M.", orders: 18, avgBasket: 29.4, score: "Elite" },
  { name: "Marie L.", orders: 15, avgBasket: 24.1, score: "Gold" },
  { name: "Julien P.", orders: 13, avgBasket: 26.8, score: "Gold" },
  { name: "Sophie R.", orders: 12, avgBasket: 21.5, score: "Gold" },
  { name: "Nora B.", orders: 10, avgBasket: 34.2, score: "Premium" },
];

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [rating] = useState("4,8");
  const [restaurantName, setRestaurantName] = useState("Mon Établissement");
  const [ownerName, setOwnerName] = useState("Partenaire");

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profileData) setOwnerName(profileData.full_name || "Partenaire");
        const { data: restaurantData } = await supabase.from('restaurants').select('name').eq('owner_id', user.id).single();
        if (restaurantData) setRestaurantName(restaurantData.name);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };
  const chartPoints = CHART_DATA[period];
  const chartMax = Math.max(...chartPoints.map((d) => d.value));
  const currentRevenue = chartPoints.reduce((sum, item) => sum + item.value, 0);

  const quickActions = [
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing", desc: "Envoyer une campagne locale" },
    { label: "Historique commandes", icon: History, path: "/partner/orders/history", desc: "Revoir toutes les ventes" },
    { label: "Virements", icon: Wallet, path: "/partner/payouts", desc: "Choisir quotidien ou hebdo" },
    { label: "Menu", icon: Menu, path: "/partner/menu", desc: "Gérer la carte" },
    { label: "Paramètres", icon: Settings, path: "/partner/settings", desc: "Infos établissement" },
  ];

  const sidebarItems = [
    { label: "Dashboard", icon: TrendingUp, path: "/partner" },
    { label: "Commandes en cours", icon: ShoppingBag, path: "/partner/orders/current" },
    { label: "Historique", icon: History, path: "/partner/orders/history" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing" },
    { label: "Menu", icon: Menu, path: "/partner/menu" },
    { label: "Virements", icon: Wallet, path: "/partner/payouts" },
    { label: "Paramètres", icon: Settings, path: "/partner/settings" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden"><Menu size={22} /></button>
          <Logo size="md" />
          <button onClick={() => navigate("/partner/orders/current")} className="relative"><Bell size={20} className="text-foodiz-gold" /><span className="absolute -top-1 -right-1 bg-foodiz-gold text-foodiz-black text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">3</span></button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-foodiz-card border-r border-foodiz-gold/10 p-6 overflow-y-auto">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
                  <GoldIcon icon={item.icon} size={18} /> {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <div className="flex justify-between items-end mb-2">
            <div>
                <h1 className="foodiz-title text-3xl mb-1">Bonjour, {ownerName}</h1>
                <p className="text-foodiz-gray text-sm">Tableau de bord de <span className="text-foodiz-gold italic">{restaurantName}</span></p>
            </div>
            <button onClick={handleLogout} className="hidden md:flex items-center gap-2 text-foodiz-gray hover:text-foodiz-red transition-colors text-sm bg-foodiz-card px-4 py-2 rounded-xl border border-foodiz-gold/10"><LogOut size={16} /> Déconnexion</button>
        </div>

        <div className="foodiz-card overflow-hidden p-0 border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-[1fr] gap-0 p-6 lg:p-8">
              <p className="text-foodiz-gray text-sm max-w-xl leading-relaxed mb-6">Pilotez votre activité, votre carte, vos visuels et vos revenus depuis un cockpit unique pensé pour la performance.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[{ label: "Commandes aujourd'hui", value: 24, icon: ShoppingBag, change: "+12 %" }, { label: "CA du jour", value: "386,50 €", icon: DollarSign, change: "+8 %" }, { label: "Note moyenne", value: rating, icon: Star, change: "▲ 0,2" }, { label: "Temps moyen", value: "22 min", icon: Clock, change: "-3 min" }].map((stat) => (
                  <div key={stat.label} className="rounded-[1.2rem] border border-foodiz-gold/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between mb-2"><GoldIcon icon={stat.icon} size={18} /><span className="text-[10px] text-foodiz-green font-medium">{stat.change}</span></div>
                    <p className="text-2xl font-bold font-serif text-foodiz-cream">{stat.value}</p>
                    <p className="text-[10px] text-foodiz-gray mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
          </div>
        </div>

        <div>
          <h2 className="foodiz-title text-lg mb-4">Outils de gestion</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)} className="foodiz-card p-4 text-left hover:border-foodiz-gold/35 transition-all bg-[linear-gradient(145deg,rgba(216,168,79,0.05),rgba(17,17,17,0.98)_25%,rgba(10,10,10,1)_100%)]">
                <div className="w-11 h-11 rounded-2xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center mb-3"><GoldIcon icon={action.icon} size={18} /></div>
                <p className="text-sm font-medium text-foodiz-cream">{action.label}</p>
                <p className="text-[10px] text-foodiz-gray mt-1">{action.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="foodiz-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="foodiz-title text-lg">Graphique intelligent</h3><p className="text-foodiz-gray text-xs mt-1">Évolution du chiffre d’affaires</p></div>
              <div className="flex gap-2">
                {["day", "week", "month", "year"].map((btn) => (<button key={btn} onClick={() => setPeriod(btn as PeriodKey)} className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${period === btn ? "bg-foodiz-gold text-foodiz-black" : "bg-foodiz-card border border-foodiz-gold/15 text-foodiz-gray"}`}>{btn === "day" ? "Jour" : btn === "week" ? "Semaine" : btn === "month" ? "Mois" : "Année"}</button>))}
              </div>
            </div>
            <div className="flex items-end gap-2 h-40">
              {chartPoints.map((d) => (<div key={d.label} className="flex-1 flex flex-col items-center gap-2"><div className="w-full rounded-t-xl bg-gradient-to-t from-foodiz-gold/55 to-foodiz-gold/18 hover:from-foodiz-gold/70 transition-all" style={{ height: `${(d.value / chartMax) * 100}%` }} /><span className="text-[10px] text-foodiz-gray">{d.label}</span></div>))}
            </div>
            <div className="mt-4 text-center"><p className="text-2xl font-serif italic text-foodiz-gold font-bold">{currentRevenue.toFixed(0)} €</p><p className="text-[10px] text-foodiz-gray">CA sur la période</p></div>
          </div>

          <div>
            <h2 className="foodiz-title text-lg mb-4">Top 5 meilleurs clients</h2>
            <div className="space-y-3">
              {TOP_CUSTOMERS.map((customer, index) => (
                <div key={customer.name} className="foodiz-card p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center text-foodiz-gold font-bold text-xs shrink-0">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div