import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bike,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Headphones,
  MapPin,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";

import AdminShell from "../../components/AdminShell";
import { supabase } from "../../lib/supabase";

const euros = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);

type ProfileRow = {
  id: string;
  role: string;
  city: string | null;
  status: string | null;
  courier_online: boolean | null;
};

type RestaurantRow = {
  id: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
  status: string;
  is_active: boolean;
};

type OrderRestaurant = {
  id: string;
  name: string;
  city: string | null;
  cuisine_type: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  final_client_total_cents: number;
  created_at: string;
  restaurant: OrderRestaurant | OrderRestaurant[] | null;
};

type LedgerRow = {
  client_collected_cents: number;
  created_at: string;
};

type CityArea = {
  id: string;
  city: string;
  status: string;
  counts: {
    approvedPartners?: number;
    approvedCouriers?: number;
    activeRestaurants?: number;
    documentsToReview?: number;
    clients?: number;
    partners?: number;
    couriers?: number;
    serviceAreaRequests?: number;
  };
};

type AreaRequest = {
  id: string;
  city: string;
  postal_code: string | null;
  status: string;
};

type DashboardData = {
  profileRows: ProfileRow[];
  restaurantRows: RestaurantRow[];
  orderRows: OrderRow[];
  ledgerRows: LedgerRow[];
  areas: CityArea[];
  areaRequests: AreaRequest[];
  totalOrders: number;
  totalCollected: number;
  tickets: number;
};

const emptyData: DashboardData = {
  profileRows: [],
  restaurantRows: [],
  orderRows: [],
  ledgerRows: [],
  areas: [],
  areaRequests: [],
  totalOrders: 0,
  totalCollected: 0,
  tickets: 0,
};

function restaurantOf(order: OrderRow) {
  return Array.isArray(order.restaurant) ? order.restaurant[0] || null : order.restaurant;
}

function cityKey(value: string | null | undefined) {
  return value?.trim() || "Ville non renseignée";
}

function shortOrder(id: string) {
  return `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "À confirmer",
    preparing: "En préparation",
    ready: "Prête",
    pickup: "Retrait",
    picked_up: "Récupérée",
    delivering: "En livraison",
    delivered: "Livrée",
    cancelled: "Annulée",
  };
  return labels[status] || status;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const [
          profiles,
          restaurants,
          orders,
          orderCount,
          ledger,
          balances,
          tickets,
          areasResponse,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id,role,city,status,courier_online")
            .neq("role", "admin"),
          supabase
            .from("restaurants")
            .select("id,name,city,cuisine_type,status,is_active"),
          supabase
            .from("orders")
            .select(
              "id,status,final_client_total_cents,created_at,restaurant:restaurants(id,name,city,cuisine_type)",
            )
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase
            .from("order_financial_ledger")
            .select("client_collected_cents,created_at")
            .order("created_at", { ascending: false })
            .limit(1000),
          supabase
            .from("admin_financial_account_balances")
            .select("client_collected_cents")
            .maybeSingle(),
          supabase
            .from("support_tickets")
            .select("id", { count: "exact", head: true })
            .in("status", ["open", "in_progress"]),
          fetch("/api/admin/service-areas", {
            headers: { Authorization: `Bearer ${session?.access_token || ""}` },
          }),
        ]);

        if (profiles.error) throw profiles.error;
        if (restaurants.error) throw restaurants.error;
        if (orders.error) throw orders.error;
        if (ledger.error) throw ledger.error;

        let areas: CityArea[] = [];
        let areaRequests: AreaRequest[] = [];
        if (areasResponse.ok) {
          const payload = await areasResponse.json();
          areas = payload.areas || [];
          areaRequests = payload.requests || [];
        }

        if (!active) return;
        setData({
          profileRows: (profiles.data || []) as ProfileRow[],
          restaurantRows: (restaurants.data || []) as RestaurantRow[],
          orderRows: (orders.data || []) as unknown as OrderRow[],
          ledgerRows: (ledger.data || []) as LedgerRow[],
          areas,
          areaRequests,
          totalOrders: orderCount.count || 0,
          totalCollected: Number(balances.data?.client_collected_cents || 0),
          tickets: tickets.count || 0,
        });
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Les indicateurs ne peuvent pas être chargés.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const activePartners = data.restaurantRows.filter(
      (restaurant) => restaurant.is_active && restaurant.status === "active",
    ).length;
    const clients = data.profileRows.filter(
      (profile) => profile.role === "client" && profile.status !== "suspended",
    ).length;
    const couriersOnline = data.profileRows.filter(
      (profile) => profile.role === "courier" && profile.courier_online,
    ).length;
    return { activePartners, clients, couriersOnline };
  }, [data.profileRows, data.restaurantRows]);

  const revenueChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      date.setHours(0, 0, 0, 0);
      return {
        key: date.toISOString().slice(0, 10),
        label: date
          .toLocaleDateString("fr-FR", { weekday: "short" })
          .replace(".", ""),
        value: 0,
      };
    });
    data.ledgerRows.forEach((row) => {
      const day = days.find(
        (candidate) =>
          candidate.key === new Date(row.created_at).toISOString().slice(0, 10),
      );
      if (day) day.value += Number(row.client_collected_cents || 0);
    });
    return {
      days,
      max: Math.max(1, ...days.map((day) => day.value)),
    };
  }, [data.ledgerRows]);

  const cityStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        city: string;
        revenue: number;
        orders: number;
        partners: number;
        couriers: number;
        clients: number;
        requests: number;
      }
    >();
    const ensure = (city: string) => {
      const current = stats.get(city);
      if (current) return current;
      const created = {
        city,
        revenue: 0,
        orders: 0,
        partners: 0,
        couriers: 0,
        clients: 0,
        requests: 0,
      };
      stats.set(city, created);
      return created;
    };

    data.orderRows.forEach((order) => {
      const row = ensure(cityKey(restaurantOf(order)?.city));
      row.orders += 1;
      if (order.status !== "cancelled") {
        row.revenue += Number(order.final_client_total_cents || 0);
      }
    });
    data.profileRows.forEach((profile) => {
      const row = ensure(cityKey(profile.city));
      if (profile.role === "client") row.clients += 1;
      if (profile.role === "partner") row.partners += 1;
      if (profile.role === "courier") row.couriers += 1;
    });
    data.areaRequests.forEach((request) => {
      ensure(cityKey(request.city)).requests += 1;
    });
    data.areas.forEach((area) => {
      const row = ensure(cityKey(area.city));
      row.partners = Math.max(
        row.partners,
        Number(area.counts.partners || area.counts.activeRestaurants || area.counts.approvedPartners || 0),
      );
      row.couriers = Math.max(
        row.couriers,
        Number(area.counts.couriers || area.counts.approvedCouriers || 0),
      );
      row.clients = Math.max(row.clients, Number(area.counts.clients || 0));
      row.requests = Math.max(row.requests, Number(area.counts.serviceAreaRequests || 0));
    });
    return [...stats.values()]
      .filter((row) => row.city !== "Ville non renseignée" || row.orders > 0)
      .sort((a, b) => b.orders - a.orders || b.clients - a.clients || b.requests - a.requests);
  }, [data.areaRequests, data.areas, data.orderRows, data.profileRows]);

  const categoryStats = useMemo(() => {
    const categories = new Map<string, number>();
    data.restaurantRows
      .filter((restaurant) => restaurant.is_active)
      .forEach((restaurant) => {
        const label = restaurant.cuisine_type?.trim() || "Autres";
        categories.set(label, (categories.get(label) || 0) + 1);
      });
    return [...categories.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data.restaurantRows]);

  const orderStatus = useMemo(() => {
    const status = {
      delivered: 0,
      active: 0,
      cancelled: 0,
    };
    data.orderRows.forEach((order) => {
      if (order.status === "delivered") status.delivered += 1;
      else if (order.status === "cancelled") status.cancelled += 1;
      else status.active += 1;
    });
    return status;
  }, [data.orderRows]);

  const totalRecentOrders = Math.max(1, data.orderRows.length);
  const topCity = Math.max(1, ...cityStats.map((city) => city.orders));
  const topCategory = Math.max(1, ...categoryStats.map((category) => category.value));
  const deliveredDegrees = Math.round(
    (orderStatus.delivered / totalRecentOrders) * 360,
  );
  const activeDegrees = Math.round(
    (orderStatus.active / totalRecentOrders) * 360,
  );

  const cards = [
    {
      label: "Chiffre d’affaires encaissé",
      value: euros(data.totalCollected),
      icon: CircleDollarSign,
      path: "/admin/economics",
    },
    {
      label: "Commandes",
      value: data.totalOrders.toLocaleString("fr-FR"),
      icon: ShoppingBag,
      path: "/admin/orders",
    },
    {
      label: "Partenaires actifs",
      value: metrics.activePartners.toLocaleString("fr-FR"),
      icon: Store,
      path: "/admin/partner-applications",
    },
    {
      label: "Livreurs en ligne",
      value: metrics.couriersOnline.toLocaleString("fr-FR"),
      icon: Bike,
      path: "/admin/courier-applications",
    },
    {
      label: "Clients actifs",
      value: metrics.clients.toLocaleString("fr-FR"),
      icon: Users,
      path: "/admin/users",
    },
  ];

  return (
    <AdminShell
      title="Tableau de bord"
      subtitle="Activité Weello, mise à jour à partir des données opérationnelles"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.24em] text-weello-gold">
            Centre de pilotage
          </p>
          <h2 className="weello-title mt-1 text-2xl text-weello-cream lg:text-3xl">
            Votre réseau en un regard
          </h2>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-weello-gold/20 bg-white/[.02] px-3 py-2 text-xs text-weello-gray">
            <CalendarDays size={15} className="text-weello-gold" />
            Aujourd’hui
          </span>
          <button
            type="button"
            onClick={() => navigate("/admin/service-areas")}
            className="inline-flex items-center gap-2 rounded-xl border border-weello-gold/20 bg-white/[.02] px-3 py-2 text-xs text-weello-gray transition hover:text-weello-gold"
          >
            <MapPin size={15} className="text-weello-gold" />
            Toutes les villes
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-weello-red/30 bg-weello-red/5 p-4 text-sm text-weello-red">
          Impossible de charger le cockpit : {error}
        </div>
      ) : null}

      {loading ? (
        <div className="weello-card p-8 text-weello-gray animate-pulse">
          Chargement des indicateurs…
        </div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(({ label, value, icon: Icon, path }) => (
            <button
              type="button"
              key={label}
              onClick={() => navigate(path)}
              className="weello-card group min-h-40 border-weello-gold/15 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.12),transparent_45%)] p-5 text-left transition hover:-translate-y-0.5 hover:border-weello-gold/35"
            >
              <Icon size={20} className="text-weello-gold" />
              <p className="mt-5 text-[9px] uppercase tracking-[.16em] text-weello-gray">
                {label}
              </p>
              <p className="mt-2 font-serif text-2xl text-weello-cream">{value}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[10px] text-weello-gold opacity-70 transition group-hover:opacity-100">
                Ouvrir <ChevronRight size={12} />
              </span>
            </button>
          ))}
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <article className="weello-card overflow-hidden border-weello-gold/20">
          <div className="flex items-center justify-between border-b border-weello-gold/10 p-5">
            <div>
              <h3 className="weello-title text-xl">Activité encaissée</h3>
              <p className="mt-1 text-xs text-weello-gray">Sept derniers jours</p>
            </div>
            <BarChart3 size={20} className="text-weello-gold" />
          </div>
          <div className="flex h-64 items-end gap-3 p-5">
            {revenueChart.days.map((day) => (
              <div key={day.key} className="flex h-full flex-1 flex-col justify-end gap-2">
                <span className="truncate text-center text-[8px] text-weello-gray">
                  {day.value ? euros(day.value) : "—"}
                </span>
                <div
                  className="min-h-1 rounded-t-xl border border-weello-gold/25 bg-gradient-to-t from-weello-gold/75 to-weello-gold/10 shadow-[0_0_22px_rgba(216,168,79,.12)]"
                  style={{
                    height: `${Math.max(2, (day.value / revenueChart.max) * 100)}%`,
                  }}
                />
                <span className="text-center text-[10px] capitalize text-weello-gray">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="weello-card border-weello-gold/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="weello-title text-xl">Répartition des commandes</h3>
              <p className="mt-1 text-xs text-weello-gray">
                {data.orderRows.length} commande(s) récente(s)
              </p>
            </div>
            <Activity size={20} className="text-weello-gold" />
          </div>
          <div className="mt-7 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <div
              className="relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#d8a84f 0deg ${deliveredDegrees}deg, #4f9f62 ${deliveredDegrees}deg ${deliveredDegrees + activeDegrees}deg, #8d3030 ${deliveredDegrees + activeDegrees}deg 360deg)`,
              }}
            >
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#0b0b0b]">
                <strong className="font-serif text-2xl text-weello-cream">
                  {data.orderRows.length}
                </strong>
                <span className="text-[9px] uppercase text-weello-gray">commandes</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {[
                ["Livrées", orderStatus.delivered, "bg-weello-gold"],
                ["En cours", orderStatus.active, "bg-weello-green"],
                ["Annulées", orderStatus.cancelled, "bg-weello-red"],
              ].map(([label, value, color]) => (
                <div key={String(label)} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-weello-gray">
                    <i className={`h-2 w-2 rounded-full ${color}`} />
                    {label}
                  </span>
                  <strong className="text-weello-cream">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <article className="weello-card border-weello-gold/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="weello-title text-xl">Vue par ville</h3>
              <p className="mt-1 text-xs text-weello-gray">
                Commandes récentes et capacité opérationnelle
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/admin/service-areas")}
              className="text-xs text-weello-gold"
            >
              Piloter les villes ›
            </button>
          </div>
          {cityStats.length ? (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {cityStats.slice(0, 8).map((city, index) => (
                <button
                  type="button"
                  key={city.city}
                  onClick={() => navigate("/admin/service-areas")}
                  className="group rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left transition hover:border-weello-gold/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-lg text-weello-cream">{city.city}</p>
                      <p className="mt-1 text-[10px] text-weello-gray">
                        {city.clients} client(s) · {city.partners} partenaire(s) · {city.couriers} livreur(s)
                      </p>
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-weello-gold/25 bg-weello-gold/10 text-xs text-weello-gold">
                      {index + 1}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-weello-gold"
                        style={{ width: `${Math.max(4, (city.orders / topCity) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-weello-cream">{city.orders} cmd.</span>
                  </div>
                  {city.requests > 0 ? (
                    <p className="mt-3 text-[10px] font-semibold text-weello-gold">
                      {city.requests} demande(s) d’ouverture
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-weello-gold/20 p-8 text-center text-sm text-weello-gray">
              Les villes apparaîtront ici dès les premières commandes réelles.
            </div>
          )}
        </article>

        <article className="weello-card border-weello-gold/20 p-5">
          <h3 className="weello-title text-xl">Catégories du réseau</h3>
          <p className="mt-1 text-xs text-weello-gray">Établissements actuellement actifs</p>
          <div className="mt-6 space-y-5">
            {categoryStats.length ? (
              categoryStats.map((category) => (
                <div key={category.label}>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-weello-cream">{category.label}</span>
                    <span className="text-weello-gray">{category.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-weello-gold/50 to-weello-gold"
                      style={{
                        width: `${Math.max(5, (category.value / topCategory) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-weello-gray">
                Aucune catégorie active pour le moment.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="weello-card border-weello-gold/20 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="weello-title text-xl">Activité en temps réel</h3>
            <button
              type="button"
              onClick={() => navigate("/admin/orders")}
              className="text-xs text-weello-gold"
            >
              Voir tout ›
            </button>
          </div>
          <div className="mt-5 divide-y divide-white/5">
            {data.orderRows.slice(0, 6).map((order) => {
              const restaurant = restaurantOf(order);
              return (
                <button
                  type="button"
                  key={order.id}
                  onClick={() => navigate("/admin/orders")}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-weello-gold/10 text-weello-gold">
                    <ShoppingBag size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-weello-cream">
                      {shortOrder(order.id)} · {restaurant?.name || "Établissement"}
                    </strong>
                    <span className="mt-1 block text-[10px] text-weello-gray">
                      {[restaurant?.city, new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={`rounded-full border px-2 py-1 text-[9px] ${
                    order.status === "delivered"
                      ? "border-weello-green/20 text-weello-green"
                      : order.status === "cancelled"
                        ? "border-weello-red/20 text-weello-red"
                        : "border-weello-gold/20 text-weello-gold"
                  }`}>
                    {statusLabel(order.status)}
                  </span>
                </button>
              );
            })}
            {!data.orderRows.length ? (
              <p className="py-8 text-center text-sm text-weello-gray">
                Aucune activité récente.
              </p>
            ) : null}
          </div>
        </article>

        <article className="weello-card border-weello-gold/20 p-5">
          <h3 className="weello-title text-xl">À traiter</h3>
          <p className="mt-1 text-xs text-weello-gray">Priorités opérationnelles</p>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => navigate("/admin/support")}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left"
            >
              <Headphones className="text-weello-gold" size={19} />
              <span className="flex-1">
                <strong className="block text-sm text-weello-cream">Support</strong>
                <span className="text-[10px] text-weello-gray">Tickets ouverts</span>
              </span>
              <strong className="text-xl text-weello-gold">{data.tickets}</strong>
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/partner-applications")}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left"
            >
              <Store className="text-weello-gold" size={19} />
              <span className="flex-1">
                <strong className="block text-sm text-weello-cream">Partenaires</strong>
                <span className="text-[10px] text-weello-gray">Dossiers et documents</span>
              </span>
              <ChevronRight size={17} className="text-weello-gold" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/courier-applications")}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left"
            >
              <Bike className="text-weello-gold" size={19} />
              <span className="flex-1">
                <strong className="block text-sm text-weello-cream">Livreurs</strong>
                <span className="text-[10px] text-weello-gray">Validations et disponibilité</span>
              </span>
              <ChevronRight size={17} className="text-weello-gold" />
            </button>
          </div>
        </article>
      </section>

      <section className="weello-card overflow-hidden border-weello-gold/20">
        <div className="flex items-center justify-between border-b border-weello-gold/10 p-5">
          <div>
            <h3 className="weello-title text-xl">Performances par ville</h3>
            <p className="mt-1 text-xs text-weello-gray">
              Données issues des commandes chargées et de la capacité active
            </p>
          </div>
          <MapPin size={20} className="text-weello-gold" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead className="text-[9px] uppercase tracking-wider text-weello-gray">
              <tr>
                {["Ville", "CA récent", "Commandes", "Clients", "Partenaires", "Livreurs", "Demandes", "Activité"].map((label) => (
                  <th key={label} className="px-5 py-4 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cityStats.slice(0, 10).map((city) => (
                <tr key={city.city} className="text-weello-cream">
                  <td className="px-5 py-4 font-serif text-base">{city.city}</td>
                  <td className="px-5 py-4">{euros(city.revenue)}</td>
                  <td className="px-5 py-4">{city.orders}</td>
                  <td className="px-5 py-4">{city.clients}</td>
                  <td className="px-5 py-4">{city.partners}</td>
                  <td className="px-5 py-4">{city.couriers}</td>
                  <td className="px-5 py-4 text-weello-gold">{city.requests}</td>
                  <td className="px-5 py-4">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-weello-green"
                        style={{ width: `${Math.max(4, (city.orders / topCity) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cityStats.length ? (
            <p className="p-8 text-center text-sm text-weello-gray">
              Le tableau se remplira avec les premières villes actives.
            </p>
          ) : null}
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 pb-3 text-[10px] text-weello-gray">
        <i className="h-2 w-2 rounded-full bg-weello-green" />
        Données opérationnelles Weello — aucune valeur de démonstration
      </p>
    </AdminShell>
  );
}
