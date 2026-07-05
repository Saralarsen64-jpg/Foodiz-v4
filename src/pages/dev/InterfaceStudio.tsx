import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bike,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Crown,
  Eye,
  FileCheck2,
  Headphones,
  Heart,
  Home,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Map,
  MapPin,
  Menu,
  MoreHorizontal,
  Navigation,
  PackageCheck,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  TimerReset,
  TrendingUp,
  UserRound,
  UserCheck,
  UsersRound,
  UtensilsCrossed,
  WalletCards,
} from "lucide-react";
import { cn } from "../../utils/cn";

type Role = "client" | "partner" | "courier" | "admin";

const ROLE_SCREENS: Record<Role, string[]> = {
  client: ["Accueil", "Restaurants"],
  partner: ["Tableau de bord", "Commandes"],
  courier: ["Accueil", "Course en cours"],
  admin: ["Cockpit", "Validations"],
};

const ROLE_LABELS: Record<Role, string> = {
  client: "Client",
  partner: "Partenaire",
  courier: "Livreur",
  admin: "Admin",
};

function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/images/weello-wordmark.png"
      alt="Weello"
      className={cn("object-contain object-center", className)}
    />
  );
}

function PhoneStatus({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-4 text-[11px] font-bold", dark ? "text-black" : "text-white")}>
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]">
          {[4, 7, 10, 13].map((height) => (
            <i key={height} className={cn("block w-[3px] rounded-full", dark ? "bg-black" : "bg-white")} style={{ height }} />
          ))}
        </span>
        <span className="text-[10px]">●))</span>
        <span className={cn("h-3 w-6 rounded-[3px] border p-[1px]", dark ? "border-black/80" : "border-white/80")}>
          <i className={cn("block h-full w-[82%] rounded-[1px]", dark ? "bg-black" : "bg-white")} />
        </span>
      </div>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[2.5rem] border border-foodiz-gold/25 bg-[#030303] text-white shadow-[0_45px_100px_rgba(0,0,0,.72),0_0_45px_rgba(216,168,79,.08)]">
      {children}
    </div>
  );
}

function GoldCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.25rem] border border-[#8f6729]/55 bg-[radial-gradient(circle_at_top_right,rgba(216,168,79,.07),transparent_42%),linear-gradient(145deg,#0d0d0d,#050505)] shadow-[0_16px_45px_rgba(0,0,0,.32)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function GoldPill({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold",
        active
          ? "border-[#d99a36] bg-[#d99a36] text-black"
          : "border-[#8f6729]/60 bg-black/65 text-[#e7a83f]",
      )}
    >
      {children}
    </span>
  );
}

function PhoneBottomNav({ active }: { active: string }) {
  const items = [
    ["Accueil", Home],
    ["Recherche", Search],
    ["Panier", ShoppingCart],
    ["Commandes", ClipboardCheck],
    ["Compte", UserRound],
  ] as const;
  return (
    <nav className="mx-3 mb-3 mt-4 grid grid-cols-5 rounded-[1.65rem] border border-[#8f6729]/45 bg-[#080808] px-2 py-3 shadow-[0_-10px_30px_rgba(0,0,0,.55)]">
      {items.map(([label, Icon]) => {
        const selected = active === label;
        return (
          <button key={label} className={cn("flex flex-col items-center gap-1 text-[8px]", selected ? "text-[#f0a83a]" : "text-white/65")}>
            <Icon size={19} strokeWidth={selected ? 2.3 : 1.7} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function KraftMasthead() {
  return (
    <header className="relative h-[238px] overflow-hidden">
      <img
        src="/images/weello-wordmark.png"
        alt="Weello"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="relative h-full">
        <PhoneStatus dark />
        <div className="mt-5 flex items-center justify-between px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/70 bg-black text-sm font-serif text-[#d9a04c] shadow-lg">
            S
          </div>
          <div className="flex items-center justify-end gap-3 text-black">
            <span className="relative"><Bell size={21} /><b className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#eda637] text-[8px]">2</b></span>
            <span className="relative"><ShoppingCart size={22} /><b className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#eda637] text-[8px]">1</b></span>
          </div>
        </div>
        <div className="absolute bottom-4 left-0 flex items-center gap-3 px-5 text-black">
          <MapPin size={24} fill="black" />
          <div>
            <p className="text-[9px]">Ma position</p>
            <p className="font-serif text-lg font-semibold">Mont-de-Marsan</p>
          </div>
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>
    </header>
  );
}

function SearchBar({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#8f6729]/50 bg-[#080808] px-4 py-3.5">
      <Search size={20} className="text-[#e9a43a]" />
      <span className="flex-1 text-xs text-white/65">{placeholder}</span>
      <SlidersHorizontal size={18} className="text-[#e9a43a]" />
    </div>
  );
}

function ClientHome() {
  const categories = [
    ["Market", ShoppingBag],
    ["Restos", UtensilsCrossed],
    ["Halal", Star],
    ["Burgers", Menu],
    ["Pizzas", Sparkles],
  ] as const;
  return (
    <PhoneFrame>
      <KraftMasthead />
      <main className="space-y-4 px-3 pt-3">
        <SearchBar placeholder="Restaurant, plat, produit…" />
        <div className="grid grid-cols-2 gap-2">
          {[
            ["RESTAURANTS", "Les meilleures tables près de vous", "/images/restaurant-bistrot.jpg"],
            ["MARKET", "Vos courses livrées rapidement", "/images/market-bio.jpg"],
          ].map(([title, copy, image]) => (
            <GoldCard key={title} className="relative h-[188px] overflow-hidden">
              <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/90" />
              <div className="relative flex h-full flex-col justify-between p-3">
                <div>
                  <h2 className="text-sm font-bold tracking-wide">{title}</h2>
                  <p className="mt-1 max-w-[120px] text-[10px] leading-relaxed text-white/80">{copy}</p>
                </div>
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfa044] text-black">
                  <ChevronRight size={20} />
                </button>
              </div>
            </GoldCard>
          ))}
        </div>
        <div className="flex gap-2 overflow-hidden">
          {categories.map(([label, Icon]) => (
            <button key={label} className="flex min-w-[68px] flex-col items-center gap-2 rounded-xl border border-[#8f6729]/45 bg-[#0a0a0a] px-2 py-3 text-[8px] text-white/80">
              <Icon size={22} className="text-[#e6a13a]" />
              {label}
            </button>
          ))}
        </div>
        <GoldCard className="relative overflow-hidden p-5">
          <div className="absolute right-[-18px] top-[-18px] h-36 w-36 rounded-full bg-[#c77f1e]/15 blur-2xl" />
          <div className="relative grid grid-cols-[1.2fr_.8fr] items-center gap-3">
            <div>
              <p className="font-serif text-xl leading-tight">Avec Weello Club, profitez d’avantages exclusifs</p>
              <p className="mt-2 text-[10px] leading-relaxed text-[#e5a23c]">Points fidélité, offres privées, livraison offerte…</p>
              <button className="mt-4 rounded-lg bg-[#dda044] px-4 py-2 text-[10px] font-bold text-black">Découvrir</button>
            </div>
            <div className="mx-auto flex h-28 w-24 rotate-3 flex-col items-center justify-center rounded-xl border border-[#8f6729]/60 bg-[#080808] shadow-2xl">
              <Crown size={25} className="text-[#e6a13a]" />
              <p className="mt-2 font-serif text-lg italic text-[#e6a13a]">Weello</p>
              <p className="text-[8px] tracking-[.2em] text-white/70">CLUB</p>
            </div>
          </div>
        </GoldCard>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-serif text-xl">Vos dernières commandes</h3>
            <button className="text-[10px] text-[#e6a13a]">Voir tout ›</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Le Bistrot", "/images/restaurant-bistrot.jpg", "20,40 €"],
              ["Sushi House", "/images/restaurant-sushi.jpg", "28,50 €"],
            ].map(([name, image, price]) => (
              <GoldCard key={name} className="overflow-hidden">
                <img src={image} alt="" className="h-24 w-full object-cover" />
                <div className="p-3">
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="mt-1 text-[9px] text-white/60">{price} · Livrée</p>
                  <p className="mt-2 text-[10px] tracking-wider text-[#e6a13a]">★★★★★</p>
                </div>
              </GoldCard>
            ))}
          </div>
        </div>
      </main>
      <PhoneBottomNav active="Accueil" />
    </PhoneFrame>
  );
}

function ClientRestaurants() {
  const restaurants = [
    ["Le Bistrot", "Burgers · Français", "4,8", "20–30 min", "/images/restaurant-bistrot.jpg"],
    ["Sushi House", "Sushis · Japonais", "4,9", "15–25 min", "/images/restaurant-sushi.jpg"],
    ["Casa Mia", "Pizzas · Italien", "4,7", "20–30 min", "/images/restaurant-pizza.jpg"],
    ["Maison K", "Cuisine locale", "4,9", "18–24 min", "/images/restaurant-maison-k.jpg"],
  ] as const;
  return (
    <PhoneFrame>
      <PhoneStatus />
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div className="h-10 w-10 overflow-hidden rounded-full border border-[#d99a36]">
          <img src="/images/restaurant-maison-k.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="font-serif text-3xl">Restaurants</h1>
        <div className="flex gap-3 text-white/80"><Bell size={20} /><ShoppingCart size={20} /></div>
      </header>
      <main className="space-y-4 px-3">
        <SearchBar placeholder="Rechercher un restaurant, un plat…" />
        <div className="flex gap-2 overflow-hidden">
          {["Tous", "Halal", "Burgers", "Pizzas", "Asiatique"].map((category, index) => (
            <GoldPill key={category} active={index === 0}>{category}</GoldPill>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Les tables près de vous</h2>
          <span className="text-[10px] text-[#e6a13a]">Mont-de-Marsan</span>
        </div>
        <div className="space-y-3">
          {restaurants.map(([name, cuisine, rating, time, image]) => (
            <GoldCard key={name} className="grid grid-cols-[42%_1fr] overflow-hidden">
              <div className="relative">
                <img src={image} alt="" className="h-full min-h-[126px] w-full object-cover" />
                <GoldPill><Clock3 size={10} />{time}</GoldPill>
              </div>
              <div className="relative p-4">
                <Heart size={19} className="absolute right-3 top-3 text-white/70" />
                <h3 className="pr-7 font-serif text-xl">{name}</h3>
                <p className="mt-1 text-[10px] text-white/60">{cuisine}</p>
                <p className="mt-3 text-[10px] text-white/60">Produits frais, recettes généreuses et savoir-faire local.</p>
                <p className="mt-3 text-[10px]"><span className="text-[#e6a13a]">★</span> {rating} · Livraison 1,50 €</p>
              </div>
            </GoldCard>
          ))}
        </div>
      </main>
      <PhoneBottomNav active="Recherche" />
    </PhoneFrame>
  );
}

function PartnerTop({ title }: { title: string }) {
  return (
    <>
      <PhoneStatus />
      <header className="flex items-center justify-between border-b border-[#8f6729]/35 px-5 pb-4 pt-3">
        <BrandLogo className="h-12 w-28 rounded-md" />
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-[.22em] text-[#e5a13a]">Espace partenaire</p>
          <h1 className="font-serif text-lg">{title}</h1>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8f6729]/55 text-[#e5a13a]"><Settings size={17} /></button>
      </header>
    </>
  );
}

function PartnerBottom({ active }: { active: string }) {
  const items = [
    ["Accueil", LayoutDashboard],
    ["Commandes", ClipboardCheck],
    ["Carte", UtensilsCrossed],
    ["Revenus", BarChart3],
    ["Compte", UserRound],
  ] as const;
  return (
    <nav className="mx-3 mb-3 mt-4 grid grid-cols-5 rounded-[1.65rem] border border-[#8f6729]/45 bg-[#080808] p-2.5">
      {items.map(([label, Icon]) => (
        <button key={label} className={cn("flex flex-col items-center gap-1 text-[8px]", active === label ? "text-[#e5a13a]" : "text-white/60")}>
          <Icon size={18} /><span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function PartnerDashboard() {
  return (
    <PhoneFrame>
      <PartnerTop title="Maison Montoise" />
      <main className="space-y-4 px-3 pt-4">
        <GoldCard className="relative h-44 overflow-hidden">
          <img src="/images/restaurant-maison-k.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <GoldPill active><Check size={10} />Ouvert</GoldPill>
              <h2 className="mt-2 font-serif text-2xl">Bonjour Sara.</h2>
              <p className="text-[10px] text-white/70">Le service du soir commence bien.</p>
            </div>
            <span className="rounded-full border border-[#8f6729]/60 bg-black/75 px-3 py-2 text-[10px] text-[#e5a13a]">4,9 ★</span>
          </div>
        </GoldCard>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["CA du jour", "486 €", TrendingUp],
            ["Commandes", "34", ShoppingBag],
            ["Panier moyen", "14,30 €", CircleDollarSign],
          ] as const).map(([label, value, Icon]) => (
            <GoldCard key={String(label)} className="p-3">
              <Icon size={16} className="text-[#e5a13a]" />
              <p className="mt-3 text-[8px] uppercase tracking-wider text-white/50">{label}</p>
              <p className="mt-1 font-serif text-lg text-white">{value}</p>
            </GoldCard>
          ))}
        </div>
        <GoldCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-[.2em] text-[#e5a13a]">À préparer maintenant</p>
              <h3 className="mt-1 font-serif text-xl">3 commandes actives</h3>
            </div>
            <button className="text-[10px] text-[#e5a13a]">Tout voir ›</button>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ["#FZ-4821", "2 menus · 1 dessert", "18 min", "Nouvelle"],
              ["#FZ-4819", "1 formule du marché", "7 min", "En cuisine"],
              ["#FZ-4818", "2 plats", "Livreur arrivé", "Prête"],
            ].map(([id, content, time, state], index) => (
              <div key={id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", index === 0 ? "bg-[#e5a13a] text-black" : "bg-[#e5a13a]/10 text-[#e5a13a]")}>
                  <PackageCheck size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] font-bold">{id}</p>
                  <p className="truncate text-[9px] text-white/55">{content}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-[#e5a13a]">{state}</p>
                  <p className="mt-1 text-[8px] text-white/50">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </GoldCard>
        <div className="grid grid-cols-2 gap-2">
          <GoldCard className="p-4">
            <UtensilsCrossed size={20} className="text-[#e5a13a]" />
            <p className="mt-3 font-serif text-lg">Ma carte</p>
            <p className="mt-1 text-[9px] text-white/55">8 produits en ligne</p>
          </GoldCard>
          <GoldCard className="p-4">
            <WalletCards size={20} className="text-[#e5a13a]" />
            <p className="mt-3 font-serif text-lg">Mes revenus</p>
            <p className="mt-1 text-[9px] text-white/55">1 842 € ce mois</p>
          </GoldCard>
        </div>
      </main>
      <PartnerBottom active="Accueil" />
    </PhoneFrame>
  );
}

function PartnerOrders() {
  const orders = [
    ["#FZ-4821", "Nouvelle commande", "28,40 €", "01:42", "Accepter"],
    ["#FZ-4819", "En préparation", "43,80 €", "12:08", "Marquer prête"],
    ["#FZ-4818", "Prête", "17,90 €", "Livreur arrivé", "Remettre"],
  ] as const;
  return (
    <PhoneFrame>
      <PartnerTop title="Commandes" />
      <main className="space-y-3 px-3 pt-4">
        <div className="grid grid-cols-3 gap-2">
          {["En cours 3", "Aujourd’hui 34", "Terminées 31"].map((label, index) => (
            <button key={label} className={cn("rounded-xl border px-2 py-2.5 text-[9px]", index === 0 ? "border-[#d99a36] bg-[#d99a36] text-black" : "border-[#8f6729]/45 text-white/65")}>{label}</button>
          ))}
        </div>
        {orders.map(([id, status, total, time, action], index) => (
          <GoldCard key={id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-sm font-bold">{id}</p>
                <p className="mt-1 text-[9px] text-[#e5a13a]">{status}</p>
              </div>
              <GoldPill active={index === 0}><Clock3 size={10} />{time}</GoldPill>
            </div>
            <div className="my-4 grid grid-cols-[1fr_auto] gap-3 border-y border-[#8f6729]/25 py-3">
              <div className="text-[10px] leading-relaxed text-white/65">
                <p>2 × Menu signature</p>
                <p>1 × Douceur chocolat</p>
                <p className="mt-1 text-[8px]">Sans couverts · allergie renseignée</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-white/45">Votre revenu</p>
                <p className="mt-1 font-serif text-xl text-[#e5a13a]">{total}</p>
              </div>
            </div>
            <button className={cn("w-full rounded-xl py-3 text-[11px] font-bold", index === 0 ? "bg-[#dfa044] text-black" : "border border-[#d99a36] text-[#e5a13a]")}>{action}</button>
          </GoldCard>
        ))}
      </main>
      <PartnerBottom active="Commandes" />
    </PhoneFrame>
  );
}

function CourierTop({ title }: { title: string }) {
  return (
    <>
      <PhoneStatus />
      <header className="flex items-center justify-between border-b border-[#8f6729]/35 px-5 pb-4 pt-3">
        <BrandLogo className="h-12 w-28 rounded-md" />
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-[.22em] text-[#e5a13a]">Espace livreur</p>
          <h1 className="font-serif text-lg">{title}</h1>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8f6729]/55 text-[#e5a13a]"><UserRound size={17} /></button>
      </header>
    </>
  );
}

function CourierHome() {
  return (
    <PhoneFrame>
      <CourierTop title="Accueil" />
      <main className="space-y-4 px-3 pt-4">
        <GoldCard className="relative h-40 overflow-hidden">
          <img src="/images/auth-courier.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="relative flex h-full flex-col justify-center p-5">
            <GoldPill active><Navigation size={10} />En ligne</GoldPill>
            <h2 className="mt-3 font-serif text-2xl">Bonjour Amine.</h2>
            <p className="mt-1 max-w-[210px] text-[10px] leading-relaxed text-white/65">Votre zone est active. Les courses arrivent ici.</p>
          </div>
        </GoldCard>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["Aujourd’hui", "42,80 €", WalletCards],
            ["Courses", "7", Bike],
            ["Ponctualité", "98 %", Clock3],
          ] as const).map(([label, value, Icon]) => (
            <GoldCard key={String(label)} className="p-3">
              <Icon size={16} className="text-[#e5a13a]" />
              <p className="mt-3 text-[8px] text-white/50">{label}</p>
              <p className="mt-1 font-serif text-lg">{value}</p>
            </GoldCard>
          ))}
        </div>
        <GoldCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-[.2em] text-[#e5a13a]">Nouvelle proposition</p>
              <h3 className="mt-1 font-serif text-xl">Maison Montoise</h3>
            </div>
            <span className="font-serif text-2xl text-[#e5a13a]">4,80 €</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["Retrait", "1,2 km"], ["Livraison", "3,8 km"], ["Durée", "19 min"]].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.035] p-2.5 text-center">
                <p className="text-[8px] text-white/45">{label}</p>
                <p className="mt-1 text-[10px] font-bold">{value}</p>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl bg-[#dfa044] py-3 text-[11px] font-bold text-black">Accepter la course</button>
        </GoldCard>
        <GoldCard className="p-4">
          <h3 className="font-serif text-lg">Mes disponibilités</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Midi", "Soir", "Flexible"].map((item, index) => (
              <GoldPill key={item} active={index < 5 || item === "Flexible"}>{item}</GoldPill>
            ))}
          </div>
        </GoldCard>
      </main>
      <PartnerBottom active="Accueil" />
    </PhoneFrame>
  );
}

function CourierCurrent() {
  return (
    <PhoneFrame>
      <CourierTop title="Course #FZ-4821" />
      <main className="space-y-4 px-3 pt-4">
        <GoldCard className="relative h-56 overflow-hidden p-3">
          <div className="relative h-full overflow-hidden rounded-xl bg-[linear-gradient(135deg,#1a1813,#080808)]">
            <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(216,168,79,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(216,168,79,.18)_1px,transparent_1px)] [background-size:28px_28px]" />
            <div className="absolute left-[18%] top-[70%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,.12)]" />
            <div className="absolute left-[21%] top-[65%] h-0.5 w-[50%] -rotate-[24deg] bg-[#e5a13a] shadow-[0_0_12px_#e5a13a]" />
            <div className="absolute right-[22%] top-[28%] flex h-11 w-11 items-center justify-center rounded-full border border-[#d99a36] bg-black text-[#e5a13a]"><Bike size={19} /></div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-[#8f6729]/45 bg-black/85 p-3">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-white/45">Arrivée estimée</p>
                <p className="mt-1 font-serif text-xl">12 minutes</p>
              </div>
              <GoldPill active>À l’heure</GoldPill>
            </div>
          </div>
        </GoldCard>
        <GoldCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] uppercase tracking-[.2em] text-white/45">Chrono réglementé</p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#54b97e]">11:42</p>
            </div>
            <TimerReset size={28} className="text-[#e5a13a]" />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full w-[58%] bg-gradient-to-r from-[#54b97e] to-[#e5a13a]" /></div>
        </GoldCard>
        <GoldCard className="p-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8f6729]/55 text-[#e5a13a]"><MapPin size={18} /></span>
            <div>
              <h3 className="font-serif text-lg">Sara · Centre-ville</h3>
              <p className="mt-1 text-[10px] text-white/60">9 rue Maubec, Mont-de-Marsan</p>
              <p className="mt-2 text-[9px] text-[#e5a13a]">Sonner à l’interphone</p>
            </div>
          </div>
        </GoldCard>
        <div className="grid grid-cols-2 gap-2">
          <GoldCard className="p-3"><p className="text-[8px] text-white/45">Gain prévu</p><p className="mt-1 font-serif text-xl text-[#e5a13a]">4,80 €</p></GoldCard>
          <GoldCard className="p-3"><p className="text-[8px] text-white/45">Code client</p><p className="mt-1 font-mono text-xl tracking-[.2em]">••••••</p></GoldCard>
        </div>
        <button className="w-full rounded-xl bg-[#dfa044] py-3.5 text-[11px] font-bold text-black">Je suis arrivé</button>
      </main>
      <PartnerBottom active="Commandes" />
    </PhoneFrame>
  );
}

const ADMIN_NAV = [
  ["Vue d’ensemble", LayoutDashboard],
  ["Commandes", ClipboardCheck],
  ["Partenaires", Store],
  ["Livreurs", Bike],
  ["Villes", Map],
  ["Finances", WalletCards],
  ["Support", LifeBuoy],
  ["Utilisateurs", UsersRound],
  ["Paramètres", Settings],
] as const;

function AdminFrame({
  children,
  active = "Vue d’ensemble",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1220px] overflow-hidden rounded-[1.75rem] border border-[#8f6729]/55 bg-[#040404] shadow-[0_45px_120px_rgba(0,0,0,.78),0_0_60px_rgba(216,168,79,.05)]">
      <div className="grid min-h-[780px] md:grid-cols-[220px_1fr]">
        <aside className="hidden border-r border-[#8f6729]/30 bg-[linear-gradient(180deg,#0b0a08,#050505_58%)] p-4 md:flex md:flex-col">
          <BrandLogo className="h-20 w-full rounded-lg" />
          <div className="mt-3 flex items-center gap-2 px-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#54b97e] shadow-[0_0_10px_#54b97e]" />
            <p className="text-[8px] font-bold uppercase tracking-[.24em] text-[#cfa65b]">Administration</p>
          </div>
          <nav className="mt-7 space-y-1">
            {ADMIN_NAV.map(([label, Icon]) => (
              <button
                key={label}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[10px] transition",
                  active === label
                    ? "border-[#aa7628]/55 bg-[linear-gradient(90deg,rgba(216,168,79,.16),rgba(216,168,79,.04))] text-[#efbd62]"
                    : "border-transparent text-white/48 hover:border-white/[0.05] hover:bg-white/[0.025] hover:text-white/80",
                )}
              >
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {active === label && <span className="h-1 w-1 rounded-full bg-[#efbd62]" />}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-[#8f6729]/25 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#b98535]/50 bg-[#dba34e]/10 font-serif text-sm text-[#efbd62]">SL</span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold">Sara Larsen</p>
                <p className="text-[8px] text-white/35">Super administratrice</p>
              </div>
            </div>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function AdminHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[#8f6729]/25 bg-[#070707]/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-serif text-[26px] leading-none text-[#f6f0e6]">{title}</h1>
        <p className="mt-2 text-[9px] text-white/38">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="hidden h-9 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 text-white/35 lg:flex">
          <Search size={13} />
          <input className="w-32 bg-transparent text-[9px] text-white outline-none placeholder:text-white/28" placeholder="Rechercher…" />
        </label>
        <span className="hidden items-center gap-1.5 rounded-full border border-[#397a55]/40 bg-[#54b97e]/[0.08] px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-[#6ed291] sm:flex">
          <ShieldCheck size={11} /> Système opérationnel
        </span>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#8f6729]/40 bg-[#d9a348]/[0.05] text-[#e5a13a]">
          <Bell size={15} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#e56b56]" />
        </button>
      </div>
    </header>
  );
}

function AdminSparkline({
  points,
  color = "#e5a13a",
}: {
  points: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24 overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AdminKpi({
  label,
  value,
  change,
  icon: Icon,
  points,
}: {
  label: string;
  value: string;
  change: string;
  icon: typeof ShoppingBag;
  points: string;
}) {
  return (
    <GoldCard className="overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#a9772f]/35 bg-[#d8a84f]/[0.07] text-[#e5a13a]">
          <Icon size={15} />
        </span>
        <span className="flex items-center gap-1 text-[8px] font-semibold text-[#62c987]">
          <ArrowUpRight size={10} /> {change}
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-[8px] uppercase tracking-[.14em] text-white/35">{label}</p>
          <p className="mt-1.5 font-serif text-[25px] leading-none text-[#f5eee3]">{value}</p>
        </div>
        <AdminSparkline points={points} />
      </div>
    </GoldCard>
  );
}

function RevenueChart() {
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[8px] text-white/38">
        <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#e5a13a]" /> Volume d’affaires</span>
        <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[#61c787]" /> Marge nette</span>
      </div>
      <svg viewBox="0 0 720 245" className="h-auto w-full overflow-visible" role="img" aria-label="Évolution du volume d’affaires et de la marge sur sept jours">
        <defs>
          <linearGradient id="adminRevenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dca64e" stopOpacity=".26" />
            <stop offset="100%" stopColor="#dca64e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[28, 72, 116, 160, 204].map((y) => (
          <line key={y} x1="42" x2="702" y1={y} y2={y} stroke="rgba(255,255,255,.065)" strokeWidth="1" />
        ))}
        {["4 k€", "3 k€", "2 k€", "1 k€", "0"].map((label, index) => (
          <text key={label} x="0" y={33 + index * 44} fill="rgba(255,255,255,.28)" fontSize="9">{label}</text>
        ))}
        <path
          d="M42 187 C75 184 93 160 132 164 S196 133 228 139 S296 111 324 116 S392 86 420 98 S482 56 516 68 S578 42 612 53 S674 25 702 32 L702 204 L42 204 Z"
          fill="url(#adminRevenueFill)"
        />
        <path
          d="M42 187 C75 184 93 160 132 164 S196 133 228 139 S296 111 324 116 S392 86 420 98 S482 56 516 68 S578 42 612 53 S674 25 702 32"
          fill="none"
          stroke="#e5a13a"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M42 196 C96 192 108 187 132 188 S195 180 228 182 S286 169 324 174 S384 160 420 164 S481 148 516 153 S574 139 612 145 S669 128 702 132"
          fill="none"
          stroke="#61c787"
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        {[
          ["Lun", 42], ["Mar", 152], ["Mer", 262], ["Jeu", 372], ["Ven", 482], ["Sam", 592], ["Dim", 702],
        ].map(([label, x]) => (
          <text key={label} x={Number(x) - 10} y="232" fill="rgba(255,255,255,.35)" fontSize="9">{label}</text>
        ))}
        <circle cx="702" cy="32" r="5" fill="#050505" stroke="#e5a13a" strokeWidth="3" />
      </svg>
    </div>
  );
}

function AllocationChart() {
  const items = [
    ["Partenaires", "58 %", "#e5a13a"],
    ["Livreurs", "22 %", "#c7853e"],
    ["Weello", "12 %", "#62c987"],
    ["Fidélité", "8 %", "#857153"],
  ] as const;

  return (
    <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="12" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="#e5a13a" strokeWidth="12" pathLength="100" strokeDasharray="58 42" strokeDashoffset="0" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="#c7853e" strokeWidth="12" pathLength="100" strokeDasharray="22 78" strokeDashoffset="-58" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="#62c987" strokeWidth="12" pathLength="100" strokeDasharray="12 88" strokeDashoffset="-80" />
          <circle cx="60" cy="60" r="45" fill="none" stroke="#857153" strokeWidth="12" pathLength="100" strokeDasharray="8 92" strokeDashoffset="-92" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-xl">3 842 €</span>
          <span className="mt-1 text-[7px] uppercase tracking-wider text-white/35">encaissés</span>
        </div>
      </div>
      <div className="w-full space-y-2.5">
        {items.map(([label, value, color]) => (
          <div key={label} className="flex items-center text-[9px]">
            <i className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="flex-1 text-white/48">{label}</span>
            <b className="text-white/80">{value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCockpit() {
  return (
    <AdminFrame active="Vue d’ensemble">
      <AdminHeader title="Vue d’ensemble" subtitle="Pilotage Weello · données consolidées au 2 juillet 2026, 10:42" />
      <main className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminKpi label="Volume d’affaires" value="3 842 €" change="+18,4 %" icon={CircleDollarSign} points="2,27 17,25 30,18 43,21 55,12 70,16 84,5 94,8" />
          <AdminKpi label="Commandes" value="184" change="+12,7 %" icon={ShoppingBag} points="2,25 17,22 30,26 43,15 55,18 70,8 84,12 94,4" />
          <AdminKpi label="Panier moyen" value="20,88 €" change="+3,2 %" icon={BarChart3} points="2,23 17,22 30,19 43,21 55,15 70,16 84,10 94,8" />
          <AdminKpi label="Marge Weello" value="461 €" change="+16,1 %" icon={TrendingUp} points="2,28 17,25 30,27 43,18 55,20 70,11 84,7 94,4" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.65fr_.75fr]">
          <GoldCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">Activité financière</h2>
                <p className="mt-1 text-[8px] text-white/35">7 derniers jours · paiements confirmés</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-2.5 py-2 text-[8px] text-white/45">
                7 jours <ChevronRight size={10} className="rotate-90" />
              </button>
            </div>
            <RevenueChart />
          </GoldCard>

          <GoldCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">Répartition</h2>
                <p className="mt-1 text-[8px] text-white/35">Flux encaissés aujourd’hui</p>
              </div>
              <button className="text-white/25"><MoreHorizontal size={18} /></button>
            </div>
            <AllocationChart />
          </GoldCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_.85fr]">
          <GoldCard className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h2 className="font-serif text-xl">Territoires</h2>
                <p className="mt-1 text-[8px] text-white/35">Déploiement et capacité opérationnelle</p>
              </div>
              <button className="rounded-lg border border-[#9d6d28]/45 px-3 py-2 text-[8px] font-semibold text-[#e5a13a]">Gérer les villes</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-white/[0.05] text-[7px] uppercase tracking-[.14em] text-white/28">
                  <tr>
                    <th className="px-5 py-3 font-medium">Ville</th>
                    <th className="px-3 py-3 font-medium">Statut</th>
                    <th className="px-3 py-3 text-center font-medium">Partenaires</th>
                    <th className="px-3 py-3 text-center font-medium">Livreurs</th>
                    <th className="px-3 py-3 text-center font-medium">Commandes</th>
                    <th className="px-5 py-3 font-medium">Capacité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.045] text-[9px]">
                  {[
                    ["Mont-de-Marsan", "Active", "8", "14", "184", 87],
                    ["Dax", "Déploiement", "5", "7", "—", 64],
                    ["Bayonne", "Recrutement", "3", "4", "—", 42],
                    ["Bordeaux", "Prospection", "1", "2", "—", 18],
                  ].map(([city, status, partners, couriers, orders, progress]) => (
                    <tr key={String(city)} className="transition hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 font-semibold text-white/82"><MapPin size={12} className="text-[#dca34b]" />{city}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={cn(
                          "inline-flex rounded-full border px-2 py-1 text-[7px]",
                          status === "Active" ? "border-[#4f9b6c]/35 bg-[#54b97e]/[0.07] text-[#69ca8b]" : "border-[#8f6729]/35 text-[#cda45e]",
                        )}>{status}</span>
                      </td>
                      <td className="px-3 py-3.5 text-center text-white/58">{partners}</td>
                      <td className="px-3 py-3.5 text-center text-white/58">{couriers}</td>
                      <td className="px-3 py-3.5 text-center text-white/58">{orders}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#986b2a] to-[#e5a13a]" style={{ width: `${progress}%` }} /></div>
                          <span className="w-6 text-right text-[7px] text-white/35">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GoldCard>

          <GoldCard className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">À traiter</h2>
                <p className="mt-1 text-[8px] text-white/35">13 actions nécessitent une décision</p>
              </div>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#dca34b] px-2 text-[8px] font-bold text-black">13</span>
            </div>
            <div className="mt-4 space-y-2">
              {([
                ["Documents partenaires", "4", FileCheck2, "2 urgents"],
                ["Dossiers livreurs", "6", UserCheck, "Mont-de-Marsan"],
                ["Tickets support", "3", Headphones, "1 critique"],
              ] as const).map(([label, count, Icon, detail]) => (
                <button key={label} className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 text-left hover:border-[#8f6729]/45">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dca34b]/[0.08] text-[#e5a13a]"><Icon size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[9px] text-white/72">{label}</b>
                    <small className="mt-1 block text-[7px] text-white/30">{detail}</small>
                  </span>
                  <b className="text-xs text-white/75">{count}</b>
                  <ChevronRight size={12} className="text-[#e5a13a]/65" />
                </button>
              ))}
            </div>
          </GoldCard>
        </div>

        <GoldCard className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl">État des services</h2>
              <p className="mt-1 text-[8px] text-white/35">Surveillance des dépendances critiques</p>
            </div>
            <button className="flex items-center gap-1.5 text-[8px] text-white/35"><RefreshCw size={10} /> Actualiser</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {([
              ["Stripe", "Paiements test", CircleDollarSign, "Opérationnel"],
              ["OpenRouteService", "Routage & distances", Navigation, "Opérationnel"],
              ["Resend", "Emails transactionnels", Mail, "À vérifier"],
              ["Supabase", "Base & authentification", Server, "Opérationnel"],
            ] as const).map(([name, detail, Icon, status]) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3">
                <Icon size={15} className={status === "Opérationnel" ? "text-[#64c989]" : "text-[#e5a13a]"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[9px] font-semibold text-white/75">{name}</p>
                  <p className="mt-1 truncate text-[7px] text-white/30">{detail}</p>
                </div>
                <span className={cn("h-1.5 w-1.5 rounded-full", status === "Opérationnel" ? "bg-[#64c989] shadow-[0_0_8px_#64c989]" : "bg-[#e5a13a]")} />
              </div>
            ))}
          </div>
        </GoldCard>
      </main>
    </AdminFrame>
  );
}

function AdminValidations() {
  return (
    <AdminFrame active="Partenaires">
      <AdminHeader title="Validations" subtitle="Contrôle des partenaires et livreurs avant activation" />
      <main className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([
            ["En attente", "10", Clock3, "text-[#e5a13a]"],
            ["À examiner aujourd’hui", "6", Eye, "text-[#e7b45c]"],
            ["Documents incomplets", "2", AlertTriangle, "text-[#e56b56]"],
            ["Validés ce mois", "38", UserCheck, "text-[#62c987]"],
          ] as const).map(([label, value, Icon, color]) => (
            <GoldCard key={label} className="p-4">
              <div className="flex items-center justify-between">
                <Icon size={16} className={color} />
                <span className="text-[7px] text-white/25">JUIL. 2026</span>
              </div>
              <p className="mt-4 font-serif text-2xl">{value}</p>
              <p className="mt-1 text-[8px] text-white/38">{label}</p>
            </GoldCard>
          ))}
        </div>

        <GoldCard className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {["Tous · 10", "Partenaires · 4", "Livreurs · 6", "Incomplets · 2"].map((item, index) => (
                <button key={item} className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-[8px]",
                  index === 0 ? "border-[#a5742c]/55 bg-[#dca34b]/[0.08] text-[#e5a13a]" : "border-white/[0.06] text-white/38",
                )}>{item}</button>
              ))}
            </div>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 text-white/30">
              <Search size={12} />
              <input className="w-full bg-transparent text-[8px] outline-none placeholder:text-white/25 lg:w-40" placeholder="Nom, ville ou SIRET" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left">
              <thead className="border-b border-white/[0.05] text-[7px] uppercase tracking-[.12em] text-white/27">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidat</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Ville</th>
                  <th className="px-3 py-3 font-medium">Documents</th>
                  <th className="px-3 py-3 font-medium">Contrôle</th>
                  <th className="px-3 py-3 font-medium">Reçu</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.045]">
                {[
                  { name: "Boulangerie des Arènes", detail: "SIRET ••• 4812", type: "Partenaire", city: "Mont-de-Marsan", docs: [4, 4], control: "À examiner", date: "Aujourd’hui, 09:14", icon: Store },
                  { name: "Amine B.", detail: "SIRET ••• 0936", type: "Livreur", city: "Mont-de-Marsan", docs: [3, 3], control: "Identité", date: "Hier, 18:42", icon: Bike },
                  { name: "Le Comptoir Dacquois", detail: "SIRET ••• 2271", type: "Partenaire", city: "Dax", docs: [3, 4], control: "Incomplet", date: "Hier, 15:20", icon: Store },
                  { name: "Léa M.", detail: "SIRET ••• 6104", type: "Livreur", city: "Bayonne", docs: [2, 3], control: "Incomplet", date: "30 juin, 11:03", icon: Bike },
                ].map((item) => {
                  const Icon = item.icon;
                  const complete = item.docs[0] === item.docs[1];
                  return (
                    <tr key={item.name} className="text-[8px] transition hover:bg-white/[0.018]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8f6729]/35 bg-[#dca34b]/[0.06] text-[#e5a13a]"><Icon size={14} /></span>
                          <div>
                            <p className="text-[9px] font-semibold text-white/78">{item.name}</p>
                            <p className="mt-1 text-[7px] text-white/28">{item.detail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-white/45">{item.type}</td>
                      <td className="px-3 py-3.5 text-white/45">{item.city}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {Array.from({ length: item.docs[1] }, (_, index) => (
                              <i key={index} className={cn("h-1.5 w-4 rounded-full", index < item.docs[0] ? "bg-[#dca34b]" : "bg-white/[0.08]")} />
                            ))}
                          </div>
                          <span className="text-[7px] text-white/35">{item.docs[0]}/{item.docs[1]}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[7px]",
                          complete ? "border-[#8f6729]/35 text-[#d9a64e]" : "border-[#a64b3d]/35 bg-[#e56b56]/[0.05] text-[#df7664]",
                        )}>
                          {complete ? <Clock3 size={8} /> : <AlertTriangle size={8} />}{item.control}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-white/32">{item.date}</td>
                      <td className="px-4 py-3.5 text-right">
                        <button className="rounded-lg border border-[#9e6e2a]/50 px-3 py-2 text-[8px] font-semibold text-[#e5a13a]">Examiner</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-3 text-[7px] text-white/28">
            <span>4 dossiers sur 10</span>
            <div className="flex gap-1">
              <button className="rounded-md border border-white/[0.06] px-2 py-1.5">Précédent</button>
              <button className="rounded-md border border-[#8f6729]/45 px-2 py-1.5 text-[#e5a13a]">Suivant</button>
            </div>
          </div>
        </GoldCard>
      </main>
    </AdminFrame>
  );
}

function StudioToolbar({
  role,
  screen,
  onRole,
  onScreen,
}: {
  role: Role;
  screen: string;
  onRole: (role: Role) => void;
  onScreen: (screen: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#8f6729]/30 bg-[#050505]/95 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-11 w-24 rounded-md" />
            <div className="border-l border-[#8f6729]/35 pl-3">
              <p className="text-[8px] font-bold uppercase tracking-[.22em] text-[#e5a13a]">Studio visuel officiel</p>
              <p className="mt-1 text-[10px] text-white/50">Données fictives · local uniquement</p>
            </div>
          </div>
          <a href="/waitlist" className="flex items-center gap-2 text-[10px] text-white/55 hover:text-[#e5a13a]"><ArrowLeft size={14} />Retour</a>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            {(Object.keys(ROLE_LABELS) as Role[]).map((item) => (
              <button
                key={item}
                onClick={() => onRole(item)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold",
                  role === item ? "border-[#d99a36] bg-[#d99a36] text-black" : "border-[#8f6729]/45 text-white/60",
                )}
              >
                {ROLE_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {ROLE_SCREENS[role].map((item) => (
              <button
                key={item}
                onClick={() => onScreen(item)}
                className={cn(
                  "shrink-0 rounded-xl px-3 py-2 text-[10px]",
                  screen === item ? "bg-white/[0.08] text-white" : "text-white/45",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function InterfaceStudio() {
  const [role, setRole] = useState<Role>("client");
  const [screen, setScreen] = useState(ROLE_SCREENS.client[0]);

  const chooseRole = (nextRole: Role) => {
    setRole(nextRole);
    setScreen(ROLE_SCREENS[nextRole][0]);
  };

  let preview: React.ReactNode;
  if (role === "client") preview = screen === "Restaurants" ? <ClientRestaurants /> : <ClientHome />;
  else if (role === "partner") preview = screen === "Commandes" ? <PartnerOrders /> : <PartnerDashboard />;
  else if (role === "courier") preview = screen === "Course en cours" ? <CourierCurrent /> : <CourierHome />;
  else preview = screen === "Validations" ? <AdminValidations /> : <AdminCockpit />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(216,168,79,.08),transparent_28%),#030303] text-white">
      <StudioToolbar role={role} screen={screen} onRole={chooseRole} onScreen={setScreen} />
      <main className="mx-auto max-w-7xl px-3 py-7 sm:px-6 lg:py-10">
        <div className="mb-5 text-center">
          <p className="text-[8px] font-bold uppercase tracking-[.26em] text-[#e5a13a]">Aperçu {ROLE_LABELS[role]}</p>
          <h1 className="mt-2 font-serif text-2xl">{screen}</h1>
        </div>
        {preview}
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[9px] text-white/35">
          <Eye size={12} /> Aperçu visuel sans connexion · aucune donnée Weello réelle
        </p>
      </main>
    </div>
  );
}
