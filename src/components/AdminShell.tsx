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
  Hourglass,
} from "lucide-react";
import Logo from "./Logo";
import { cn } from "../utils/cn";

const ADMIN_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Économie", icon: BarChart3, path: "/admin/economics" },
  { label: "Virements", icon: Wallet, path: "/admin/payouts" },
  { label: "Support", icon: LifeBuoy, path: "/admin/support" },
  { label: "Abonnements", icon: CreditCard, path: "/admin/subscriptions" },
  { label: "Campagnes", icon: Megaphone, path: "/admin/marketing-campaigns" },
  { label: "Diffusion", icon: Radio, path: "/admin/broadcast" },
  { label: "Partenaires", icon: Store, path: "/admin/partner-applications" },
  { label: "Livreurs", icon: Bike, path: "/admin/courier-applications" },
  { label: "Parrainage", icon: UsersRound, path: "/admin/referrals" },
  { label: "Pré-lancement", icon: Hourglass, path: "/admin/prelaunch" },
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

  return (
    <div className="min-h-screen bg-foodiz-black text-foodiz-cream">
      <div className="grid lg:grid-cols-[280px_1fr] min-h-screen">
        <aside className="hidden lg:flex flex-col border-r border-foodiz-gold/10 bg-[linear-gradient(180deg,rgba(17,17,17,0.98),rgba(5,5,5,1))] p-6 sticky top-0 h-screen">
          <div className="flex items-center gap-3 mb-8">
            <Logo size="md" />
          </div>

          <div className="rounded-[1.6rem] border border-foodiz-gold/10 bg-white/[0.02] p-4 mb-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-foodiz-gold font-bold mb-2">Centre de contrôle</p>
            <p className="text-sm text-foodiz-gray leading-relaxed">
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
                      ? "bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/20"
                      : "text-foodiz-gray border-transparent hover:text-foodiz-cream hover:border-foodiz-gold/10 hover:bg-white/[0.02]"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto foodiz-card p-4 bg-white/[0.02] border-foodiz-gold/10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold font-bold mb-2">Admin Foodiz</p>
            <p className="text-sm text-foodiz-cream">Direction & exploitation</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-foodiz-gold/10 bg-black/70 backdrop-blur-xl px-4 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => navigate(-1)} className="lg:hidden text-foodiz-gold">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-0">
                  <h1 className="foodiz-title text-xl lg:text-2xl truncate">{title}</h1>
                  {subtitle && <p className="text-[11px] lg:text-xs text-foodiz-gray mt-1">{subtitle}</p>}
                </div>
              </div>
              <div className="lg:hidden">
                <Logo size="sm" />
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
