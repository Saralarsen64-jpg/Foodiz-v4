import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  LifeBuoy,
  CreditCard,
  Megaphone,
  Store,
  Bike,
  ChevronLeft,
  Radio,
  UsersRound,
  MapPinned,
  LogOut,
  ShoppingBag,
  Bell,
  MessageSquareText,
} from "lucide-react";
import AdminBrandMark from "./AdminBrandMark";
import { cn } from "../utils/cn";
import { supabase } from "../lib/supabase";
import { clearAdminAccess } from "../utils/adminAccess";

const ADMIN_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Commandes", icon: ShoppingBag, path: "/admin/orders" },
  { label: "Utilisateurs", icon: UsersRound, path: "/admin/users" },
  { label: "Économie", icon: BarChart3, path: "/admin/economics" },
  { label: "Virements", icon: Wallet, path: "/admin/payouts" },
  { label: "Support", icon: LifeBuoy, path: "/admin/support" },
  { label: "Abonnements", icon: CreditCard, path: "/admin/subscriptions" },
  { label: "Campagnes", icon: Megaphone, path: "/admin/marketing-campaigns" },
  { label: "Diffusion", icon: Radio, path: "/admin/broadcast" },
  { label: "Partenaires", icon: Store, path: "/admin/partner-applications" },
  { label: "Livreurs", icon: Bike, path: "/admin/courier-applications" },
  { label: "Villes", icon: MapPinned, path: "/admin/service-areas" },
  { label: "Parrainage", icon: UsersRound, path: "/admin/referrals" },
];

export default function AdminShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const signOut = async () => {
    clearAdminAccess();
    await supabase.auth.signOut();
    navigate("/admin/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-weello-black text-weello-cream">
      <div className="grid lg:grid-cols-[280px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col border-r border-weello-gold/10 bg-[linear-gradient(180deg,rgba(17,17,17,0.98),rgba(5,5,5,1))] p-6 sticky top-0 h-screen">
          <div className="flex items-center gap-3 mb-8">
            <AdminBrandMark size="md" />
            <div>
              <p className="text-[10px] uppercase tracking-[.22em] text-weello-gold font-bold">Weello</p>
              <p className="text-xs text-weello-gray mt-1">Administration</p>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-weello-gold/10 bg-white/[0.02] p-4 mb-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-weello-gold font-bold mb-2">Centre de contrôle</p>
            <p className="text-sm text-weello-gray leading-relaxed">
              Pilotage global de l’activité, des validations, des campagnes et des flux financiers.
            </p>
          </div>

          <nav className="space-y-2">
            {ADMIN_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all border",
                    isActive
                      ? "bg-weello-gold/10 text-weello-gold border-weello-gold/20"
                      : "text-weello-gray border-transparent hover:text-weello-cream hover:border-weello-gold/10 hover:bg-white/[0.02]"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto weello-card p-4 bg-white/[0.02] border-weello-gold/10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-weello-gold font-bold mb-2">Admin Weello</p>
            <p className="text-sm text-weello-cream">Direction & exploitation</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-weello-red/20 px-3 py-2 text-xs text-weello-red transition-colors hover:bg-weello-red/5"
            >
              <LogOut size={15} />
              Déconnexion sécurisée
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <div
            aria-label="Univers visuel Weello"
            className="flex h-24 items-center justify-center overflow-hidden border-b border-weello-gold/20 bg-black sm:h-28 lg:h-36"
          >
            <img
              src="/images/weello-wordmark.png"
              alt="Weello"
              className="h-full w-auto max-w-full object-contain"
            />
          </div>
          <header className="sticky top-0 z-30 border-b border-weello-gold/10 bg-black/70 backdrop-blur-xl px-4 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => navigate(-1)} className="lg:hidden text-weello-gold">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h1 className="weello-title text-xl lg:text-2xl truncate">{title}</h1>
                  {subtitle && <p className="text-[11px] lg:text-xs text-weello-gray mt-1">{subtitle}</p>}
                </div>
              </div>
              <div className="hidden items-center gap-2 lg:flex">
                <Link
                  to="/admin/support"
                  aria-label="Ouvrir le support"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-weello-gold/20 text-weello-gold transition hover:bg-weello-gold/10"
                >
                  <MessageSquareText size={17} />
                </Link>
                <Link
                  to="/admin/orders"
                  aria-label="Voir l’activité récente"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-weello-gold/20 text-weello-gold transition hover:bg-weello-gold/10"
                >
                  <Bell size={17} />
                </Link>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-weello-gold/30 bg-weello-gold/10 font-serif text-sm text-weello-gold">
                  SL
                </span>
              </div>
              <div className="lg:hidden">
                <div className="flex items-center gap-3">
                  <AdminBrandMark size="sm" />
                  <button
                    type="button"
                    aria-label="Déconnexion administrateur"
                    onClick={() => void signOut()}
                    className="text-weello-red"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
