import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  DollarSign,
  ChevronRight,
  CheckCircle2,
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
  LogOut,
  Camera,
  ClipboardCheck,
  Crown,
  Sparkles,
  Target,
  Flame,
  ShieldCheck,
  TimerReset,
  PackageCheck,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";
import { supabase } from "../../lib/supabase";
import { getPartnerOrderCustomers } from "../../lib/orderContacts";

type PeriodKey = "day" | "week" | "month" | "year";

const EMPTY_CHART: Record<PeriodKey, { label: string; value: number }[]> = { day: [], week: [], month: [], year: [] };

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rating, setRating] = useState("-");
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [restaurantName, setRestaurantName] = useState("Mon Établissement");
  const [ownerName, setOwnerName] = useState("Partenaire");
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrdersCount, setTodayOrdersCount] = useState(0);
  const [averageDeliveryMinutes, setAverageDeliveryMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverImage, setCoverImage] = useState("/images/auth-restaurant.jpg");
  const [location, setLocation] = useState("Adresse non renseignée");
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [chartData, setChartData] = useState(EMPTY_CHART);
  const [productsCount, setProductsCount] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [restaurantStatus, setRestaurantStatus] = useState("pending");
  const [restaurantIsActive, setRestaurantIsActive] = useState(false);
  const [hasCustomCover, setHasCustomCover] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate('/auth/login?role=partner');
          return;
        }

        // 1. Récupérer les infos du partenaire
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name,last_name,email")
          .eq("id", user.id)
          .single();

        if (profileData) {
          const fullName = [profileData.first_name, profileData.last_name].filter(Boolean).join(" ");
          setOwnerName(fullName || profileData.email || "Partenaire");
        }

        // 2. Récupérer le restaurant
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("*")
          .eq("owner_id", user.id)
          .single();

        if (!restaurant) {
          setRestaurantName("Aucun établissement");
          setLoading(false);
          return;
        }

        if (restaurant.name) {
          setRestaurantName(restaurant.name);
        }
        const restaurantCover = restaurant.cover_image || restaurant.image_url || "";
        const restaurantLocation = [restaurant.address, restaurant.postal_code, restaurant.city].filter(Boolean).join(", ") || "Adresse non renseignée";
        setCoverImage(restaurantCover || "/images/auth-restaurant.jpg");
        setLocation(restaurantLocation);
        setRestaurantStatus(restaurant.status || "pending");
        setRestaurantIsActive(restaurant.is_active === true);
        setHasCustomCover(Boolean(restaurantCover));

        const { data: reviews } = await supabase.from("reviews").select("restaurant_rating, orders!inner(restaurant_id)").eq("orders.restaurant_id", restaurant.id);
        const ratings = (reviews || []).map((review: any) => review.restaurant_rating).filter(Boolean);
        if (ratings.length) setRating((ratings.reduce((sum: number, value: number) => sum + value, 0) / ratings.length).toFixed(1).replace(".", ","));

        const [{ count: productsTotal }, { count: supportTotal }] = await Promise.all([
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("status", ["open", "in_progress"]),
        ]);
        setProductsCount(productsTotal || 0);
        setOpenSupportCount(supportTotal || 0);

        // 3. Récupérer les commandes actives
        const [{ data: activeOrdersData }, contacts] = await Promise.all([
          supabase
            .from("orders")
            .select(`
              id,
              status,
              partner_total_cents,
              created_at,
              order_items(quantity)
            `)
            .eq("restaurant_id", restaurant.id)
            .eq("payment_status", "completed")
            .in("status", ["pending", "preparing", "ready"])
            .order("created_at", { ascending: true }),
          getPartnerOrderCustomers(),
        ]);
        const contactByOrder = new Map(contacts.map((contact) => [contact.order_id, contact]));

        const formattedActive = (activeOrdersData || []).map((order: any) => ({
          id: order.id,
          items: `Commande #${order.id.slice(0, 8)}`,
          total: (order.partner_total_cents || 0) / 100,
          status: order.status,
          time: order.status === "ready" ? "Prête" : "En cours",
          client: contactByOrder.get(order.id)?.display_name || "Client",
        }));

        setActiveOrders(formattedActive);

        // 4. Récupérer les commandes livrées (historique + calcul revenu du jour)
        const { data: deliveredOrders } = await supabase
          .from("orders")
          .select("*")
          .eq("restaurant_id", restaurant.id)
          .eq("status", "delivered")
          .order("created_at", { ascending: false })

        if (deliveredOrders) {
          const formattedHistory = deliveredOrders.map((order: any) => ({
            id: order.id,
            client: contactByOrder.get(order.id)?.display_name || `#${order.id.slice(0, 8)}`,
            total: (order.final_client_total_cents || 0) / 100,
            partnerTotal: (order.partner_total_cents || 0) / 100,
            date: new Date(order.delivered_at || order.created_at).toLocaleDateString('fr-FR'),
          }));
          
          setHistoryOrders(formattedHistory);

          // Calculer le revenu du jour
          const today = new Date().toDateString();
          const todayOrders = deliveredOrders.filter(order => new Date(order.delivered_at || order.created_at).toDateString() === today);
          const todayRevenue = todayOrders
            .reduce((sum, order) => sum + ((order.partner_total_cents || 0) / 100), 0);
          setTodayOrdersCount(todayOrders.length);
          setTodayRevenue(todayRevenue);
          const timedOrders = deliveredOrders.filter((order: any) => order.delivered_at && order.created_at);
          if (timedOrders.length) setAverageDeliveryMinutes(Math.round(timedOrders.reduce((sum: number, order: any) => sum + (new Date(order.delivered_at).getTime() - new Date(order.created_at).getTime()) / 60000, 0) / timedOrders.length));

          const grouped = deliveredOrders.reduce<Record<string, any>>((acc, order: any) => {
            const key = order.client_id;
            const item = acc[key] || { name: contactByOrder.get(order.id)?.display_name || "Client", orders: 0, total: 0 };
            item.orders += 1;
            item.total += (order.final_client_total_cents || 0) / 100;
            acc[key] = item;
            return acc;
          }, {});
          setTopCustomers(Object.values(grouped).map((customer: any) => ({ ...customer, avgBasket: customer.total / customer.orders, score: customer.orders >= 15 ? "Elite" : customer.orders >= 8 ? "Gold" : customer.orders >= 3 ? "Silver" : "Nouveau" })).sort((a, b) => b.orders - a.orders).slice(0, 10));

          const aggregate = (labels: string[], keyFor: (date: Date) => number) => labels.map((label, index) => ({ label, value: deliveredOrders.filter((order: any) => keyFor(new Date(order.delivered_at || order.created_at)) === index).reduce((sum: number, order: any) => sum + (order.partner_total_cents || 0) / 100, 0) }));
          setChartData({
            day: aggregate(["0h", "4h", "8h", "12h", "16h", "20h"], (date) => Math.floor(date.getHours() / 4)),
            week: aggregate(["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"], (date) => date.getDay()),
            month: aggregate(["S1", "S2", "S3", "S4", "S5"], (date) => Math.floor((date.getDate() - 1) / 7)),
            year: aggregate(["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"], (date) => date.getMonth()),
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const chartPoints = chartData[period];
  const chartMax = Math.max(1, ...chartPoints.map((d) => d.value));
  const currentRevenue = chartPoints.reduce((sum, item) => sum + item.value, 0);
  const operationalStatus = restaurantIsActive || ["active", "validated", "approved"].includes(restaurantStatus);

  const readinessItems = [
    {
      label: "Dossier opérationnel",
      detail: operationalStatus ? "Compte prêt à vendre" : "Validation Foodiz en cours",
      ready: operationalStatus,
      icon: ClipboardCheck,
      path: "/partner/validation-status",
    },
    {
      label: "Adresse & zone",
      detail: location !== "Adresse non renseignée" ? "Adresse renseignée" : "Adresse à compléter",
      ready: location !== "Adresse non renseignée",
      icon: Settings,
      path: "/partner/settings",
    },
    {
      label: "Image de marque",
      detail: hasCustomCover ? "Couverture personnalisée" : "Ajoutez une photo premium",
      ready: hasCustomCover,
      icon: Camera,
      path: "/partner/settings",
    },
    {
      label: "Carte Foodiz",
      detail: productsCount >= 5 ? `${productsCount} produits en carte` : "Visez au moins 5 produits",
      ready: productsCount >= 5,
      icon: UtensilsCrossed,
      path: "/partner/products",
    },
    {
      label: "Support propre",
      detail: openSupportCount === 0 ? "Aucun ticket ouvert" : `${openSupportCount} ticket(s) à suivre`,
      ready: openSupportCount === 0,
      icon: Bell,
      path: "/partner/support",
    },
    {
      label: "Traction client",
      detail: historyOrders.length || activeOrders.length ? "Premiers signaux clients" : "Préparez votre lancement",
      ready: Boolean(historyOrders.length || activeOrders.length),
      icon: Target,
      path: "/partner/marketing",
    },
  ];
  const readinessScore = Math.round((readinessItems.filter((item) => item.ready).length / readinessItems.length) * 100);
  const priorityItem = readinessItems.find((item) => !item.ready) || readinessItems[0];
  const activeBreakdown = {
    pending: activeOrders.filter((order) => order.status === "pending").length,
    preparing: activeOrders.filter((order) => order.status === "preparing").length,
    ready: activeOrders.filter((order) => order.status === "ready").length,
  };
  const partnerStandards = [
    {
      title: "Accepter vite",
      detail: "Les premières minutes donnent le ton de l’expérience client.",
      icon: TimerReset,
      ready: activeBreakdown.pending === 0,
    },
    {
      title: "Préparer proprement",
      detail: "Sac fermé, commande complète, numéro prêt pour le livreur.",
      icon: PackageCheck,
      ready: activeBreakdown.preparing === 0,
    },
    {
      title: "Signaler prêt",
      detail: "Dès que la commande attend le livreur, passez-la en prête.",
      icon: Flame,
      ready: activeBreakdown.ready > 0 || activeOrders.length === 0,
    },
    {
      title: "Confiance Foodiz",
      detail: "Documents, fiche, support et carte gardent votre compte solide.",
      icon: ShieldCheck,
      ready: operationalStatus && openSupportCount === 0,
    },
  ];

  const quickActions = [
    { label: "Créer un produit", icon: Plus, path: "/partner/products/new", desc: "Ajouter un nouveau plat" },
    { label: "Créer une catégorie", icon: FolderPlus, path: "/partner/menu", desc: "Structurer votre carte" },
    { label: "Photo fiche établissement", icon: ImageIcon, path: "/partner/settings", desc: "Mettre à jour la couverture" },
    { label: "Photos produits", icon: UtensilsCrossed, path: "/partner/products", desc: "Éditer les cartes plats" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing", desc: "Envoyer une campagne locale" },
    { label: "Historique commandes", icon: History, path: "/partner/orders/history", desc: "Revoir toutes les ventes" },
    { label: "Virements", icon: Wallet, path: "/partner/payouts", desc: "Consulter les règlements enregistrés" },
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
    { label: "Support", icon: Bell, path: "/partner/support" },
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
              {activeOrders.length}
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
        <div className="flex justify-between items-center mb-2 gap-4 flex-wrap">
          <div>
            <h1 className="foodiz-title text-2xl mb-1">Bonjour, {ownerName}</h1>
            <p className="text-foodiz-gray text-sm">
              Tableau de bord de <span className="text-foodiz-gold italic">{restaurantName}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-foodiz-gray hover:text-foodiz-red transition-colors text-sm bg-foodiz-card px-4 py-2 rounded-xl border border-foodiz-gold/10"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>

        <div className="foodiz-card overflow-hidden p-0 border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.12),rgba(17,17,17,0.96)_28%,rgba(5,5,5,1)_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-0">
            <div className="p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-foodiz-gold font-bold mb-2">Espace Partenaire Foodiz</p>
              <h2 className="foodiz-title text-3xl mb-2">Bonjour, {restaurantName}</h2>
              <p className="text-foodiz-gray text-sm max-w-xl leading-relaxed">
                Pilotez votre activité, votre carte, vos visuels et vos revenus depuis un cockpit unique pensé pour la performance et l’image premium de votre établissement.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {[
                  { label: "Commandes livrées aujourd'hui", value: todayOrdersCount, icon: ShoppingBag, change: "Réel" },
                  { label: "Revenus du jour", value: `${todayRevenue.toFixed(2)} €`, icon: DollarSign, change: "Réel" },
                  { label: "Note moyenne", value: rating, icon: Star, change: "Avis clients" },
                  { label: "Délai moyen complet", value: averageDeliveryMinutes === null ? "-" : `${averageDeliveryMinutes} min`, icon: Clock, change: "Création à livraison" },
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
              <img src={coverImage} alt={restaurantName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold font-bold">Fiche établissement</p>
                  <p className="text-sm text-foodiz-cream mt-1">Établissement Foodiz</p>
                  <p className="text-[11px] text-foodiz-gray mt-1">{location}</p>
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

        <section className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
          <article className="foodiz-card border-foodiz-gold/25 bg-[radial-gradient(circle_at_top_left,rgba(216,168,79,.14),transparent_35%),#080808] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-foodiz-gold">Tour de contrôle</p>
                <h2 className="foodiz-title mt-1 text-2xl">Commandes à piloter maintenant</h2>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-foodiz-gray">
                  Une commande bien rythmée rassure le client, protège le livreur et donne envie de revenir.
                </p>
              </div>
              <button onClick={() => navigate("/partner/orders/current")} className="rounded-2xl bg-foodiz-gold px-4 py-3 text-xs font-black text-foodiz-black transition hover:scale-[1.02]">
                Ouvrir les commandes
              </button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Nouvelles", activeBreakdown.pending, "text-foodiz-gold"],
                ["En préparation", activeBreakdown.preparing, "text-amber-300"],
                ["Prêtes", activeBreakdown.ready, "text-foodiz-green"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-center">
                  <p className={`text-3xl font-serif italic ${color}`}>{value}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-widest text-foodiz-gray">{label}</p>
                </div>
              ))}
            </div>
            {activeOrders.length === 0 && (
              <div className="mt-4 rounded-2xl border border-foodiz-gold/10 bg-foodiz-gold/[0.04] p-4">
                <p className="text-sm font-semibold text-foodiz-cream">Tout est calme pour le moment.</p>
                <p className="mt-1 text-xs leading-relaxed text-foodiz-gray">
                  Profitez-en pour améliorer une photo, une description ou préparer votre prochaine campagne locale.
                </p>
              </div>
            )}
          </article>

          <article className="foodiz-card border-foodiz-gold/15 p-5">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-foodiz-gold">Standard Foodiz</p>
              <h2 className="foodiz-title mt-1 text-xl">Le rituel qui fait revenir les clients</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {partnerStandards.map((standard) => (
                <div key={standard.title} className={`rounded-2xl border p-4 ${standard.ready ? "border-foodiz-green/20 bg-foodiz-green/[0.035]" : "border-foodiz-gold/15 bg-white/[0.025]"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${standard.ready ? "border-foodiz-green/20 bg-foodiz-green/10 text-foodiz-green" : "border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"}`}>
                      <standard.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foodiz-cream">{standard.title}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-foodiz-gray">{standard.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="foodiz-card relative overflow-hidden border-foodiz-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.18),transparent_35%),linear-gradient(145deg,rgba(11,11,11,.98),rgba(5,5,5,1))] p-6">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full border border-foodiz-gold/10 bg-foodiz-gold/5 blur-sm" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/10">
                  <Crown size={22} className="text-foodiz-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-foodiz-gold">Cockpit réussite</p>
                  <h2 className="foodiz-title text-2xl">Votre niveau de préparation</h2>
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-serif italic text-foodiz-cream">{readinessScore}%</p>
                  <p className="mt-2 text-xs leading-relaxed text-foodiz-gray">
                    Score calculé sur la fiche, le menu, les visuels, le support et les signaux de vente.
                  </p>
                </div>
                <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-full border border-foodiz-gold/30 bg-black/35 sm:flex">
                  <Sparkles size={30} className="text-foodiz-gold" />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-foodiz-gold/15 bg-black/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foodiz-gold">Action prioritaire</p>
                <p className="mt-2 text-base font-semibold text-foodiz-cream">{priorityItem.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-foodiz-gray">{priorityItem.detail}</p>
                <button
                  onClick={() => navigate(priorityItem.path)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-foodiz-gold px-4 py-2 text-xs font-bold text-foodiz-black transition hover:scale-[1.02]"
                >
                  Améliorer maintenant <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </article>

          <article className="foodiz-card border-foodiz-gold/15 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="foodiz-title text-xl">Plan d’action partenaire</h2>
                <p className="mt-1 text-xs text-foodiz-gray">Les détails qui transforment une fiche en vraie vitrine Foodiz.</p>
              </div>
              <span className="rounded-full border border-foodiz-gold/20 px-3 py-1 text-[10px] uppercase tracking-widest text-foodiz-gold">
                {readinessItems.filter((item) => item.ready).length}/{readinessItems.length}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {readinessItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`group rounded-2xl border p-4 text-left transition-all ${
                    item.ready
                      ? "border-foodiz-green/20 bg-foodiz-green/[0.04]"
                      : "border-foodiz-gold/15 bg-white/[0.025] hover:border-foodiz-gold/35"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      item.ready ? "border-foodiz-green/20 bg-foodiz-green/10" : "border-foodiz-gold/20 bg-foodiz-gold/10"
                    }`}>
                      {item.ready ? (
                        <CheckCircle2 size={18} className="text-foodiz-green" />
                      ) : (
                        <item.icon size={18} className="text-foodiz-gold" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foodiz-cream">{item.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-foodiz-gray">{item.detail}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Photos qui donnent faim",
              text: "Une photo claire, lumineuse et cohérente augmente la confiance avant même le premier clic.",
              icon: Camera,
              path: "/partner/products",
            },
            {
              title: "Carte courte, lisible, rentable",
              text: "Mettez en avant les produits stars, les formules simples et les plats faciles à livrer.",
              icon: UtensilsCrossed,
              path: "/partner/menu",
            },
            {
              title: "Réactivité = préférence",
              text: "Plus vos commandes sont acceptées et préparées vite, plus l’expérience Foodiz devient mémorable.",
              icon: Clock,
              path: "/partner/orders/current",
            },
          ].map((tip) => (
            <button
              key={tip.title}
              onClick={() => navigate(tip.path)}
              className="foodiz-card group border-foodiz-gold/15 bg-[linear-gradient(145deg,rgba(216,168,79,.08),rgba(10,10,10,.98)_34%)] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foodiz-gold/35"
            >
              <GoldIcon icon={tip.icon} size={20} />
              <h3 className="mt-4 font-semibold text-foodiz-cream">{tip.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-foodiz-gray">{tip.text}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-foodiz-gold">
                Optimiser <ChevronRight size={12} />
              </p>
            </button>
          ))}
        </section>

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
              {activeOrders.length === 0 && (
                <div className="foodiz-card border-foodiz-gold/10 p-5 text-sm text-foodiz-gray">
                  Aucune commande active. Votre cockpit reste prêt dès qu’une commande arrive.
                </div>
              )}
              {activeOrders.slice(0, 3).map((order) => (
                <button
                  key={order.id}
                  onClick={() => navigate(`/partner/orders/${order.id}`)}
                  className="w-full foodiz-card p-4 flex items-center gap-4 text-left hover:border-foodiz-gold/30 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    order.status === "pending" ? "bg-foodiz-gold/20" : order.status === "preparing" ? "bg-foodiz-gold/15" : "bg-foodiz-green/10"
                  }`}>
                    <ShoppingBag size={18} className={order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foodiz-cream">{order.client}</h3>
                      <span className={`text-[10px] font-medium ${order.status === "ready" ? "text-foodiz-green" : "text-foodiz-gold"}`}>
                        {order.status === "pending" ? "Nouvelle" : order.status === "preparing" ? "En préparation" : "Prête"}
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
                {historyOrders.length === 0 && (
                  <div className="foodiz-card border-foodiz-gold/10 p-5 text-sm text-foodiz-gray">
                    Aucune commande livrée pour le moment. Les premières ventes apparaîtront ici.
                  </div>
                )}
                {historyOrders.slice(0, 4).map((order) => (
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
              {topCustomers.length === 0 && <div className="foodiz-card p-4 text-sm text-foodiz-gray">Aucune donnée client disponible.</div>}
              {topCustomers.map((customer, index) => (
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
