import { useNavigate } from "react-router-dom";
import {
  User,
  Gift,
  Star,
  MapPin,
  CreditCard,
  Heart,
  HelpCircle,
  LogOut,
  ChevronRight,
  Users,
  MessageCircle,
  Trash2,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const MENU_ITEMS = [
  { label: "Informations personnelles", icon: User, path: "/client/account/personal-info" },
  { label: "Mes adresses", icon: MapPin, path: "/client/account/addresses" },
  { label: "Moyens de paiement", icon: CreditCard, path: "/client/account/payments" },
  { label: "Mes favoris", icon: Heart, path: "/client/account/favorites" },
];

const LOYALTY_ITEMS = [
  { label: "Mes avantages", icon: Gift, path: "/client/advantages", badge: "1 240 pts" },
  { label: "Parrainage", icon: Users, path: "/client/account/referral", desc: "Gagnez 500 pts par ami invité" },
  { label: "Historique des avantages", icon: Star, path: "/client/advantages/history" },
];

const SUPPORT_ITEMS = [
  { label: "Centre d'aide", icon: HelpCircle, path: "/client/help-center" },
  { label: "Nous contacter", icon: MessageCircle, path: "/client/account/help" },
];

export default function AccountPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Profile Card */}
      <div className="foodiz-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-foodiz-gradient-gold border-2 border-foodiz-gold/30 flex items-center justify-center">
          <span className="text-foodiz-gold font-serif font-bold text-xl">A</span>
        </div>
        <div className="flex-1">
          <h2 className="foodiz-title text-lg">Alexandre</h2>
          <p className="text-foodiz-gray text-xs">alexandre@email.com</p>
          <div className="flex items-center gap-2 mt-1.5">
            <GoldIcon icon={Star} size={12} />
            <span className="text-foodiz-gold text-xs font-semibold">1 240 points Foodiz</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/client/account/personal-info")}
          className="text-foodiz-gold text-xs"
        >
          Modifier
        </button>
      </div>

      {/* Loyalty Section */}
      <div className="space-y-1">
        <h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest mb-3">
          Fidélité & Avantages
        </h3>
        {LOYALTY_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <GoldIcon icon={item.icon} size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foodiz-cream">{item.label}</p>
              {item.desc && (
                <p className="text-[10px] text-foodiz-gray mt-0.5">{item.desc}</p>
              )}
            </div>
            {item.badge && (
              <span className="text-[10px] text-foodiz-gold bg-foodiz-gold/10 px-2 py-1 rounded-full font-semibold">
                {item.badge}
              </span>
            )}
            <ChevronRight size={14} className="text-foodiz-gold/30" />
          </button>
        ))}
      </div>

      {/* Account Section */}
      <div className="space-y-1">
        <h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest mb-3">
          Compte
        </h3>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <GoldIcon icon={item.icon} size={18} />
            <div className="flex-1">
              <p className="text-sm text-foodiz-cream">{item.label}</p>
            </div>
            <ChevronRight size={14} className="text-foodiz-gold/30" />
          </button>
        ))}
      </div>

      {/* Support Section */}
      <div className="space-y-1">
        <h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest mb-3">
          Assistance
        </h3>
        {SUPPORT_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"
          >
            <GoldIcon icon={item.icon} size={18} />
            <div className="flex-1">
              <p className="text-sm text-foodiz-cream">{item.label}</p>
            </div>
            <ChevronRight size={14} className="text-foodiz-gold/30" />
          </button>
        ))}
      </div>

      {/* Danger Zone */}
      <button
        onClick={() => navigate("/client/account/delete")}
        className="w-full foodiz-card p-4 flex items-center gap-3 border-foodiz-red/20 hover:border-foodiz-red/40 transition-all"
      >
        <Trash2 size={18} className="text-foodiz-red" />
        <span className="text-sm text-foodiz-red">Supprimer mon compte</span>
      </button>

      {/* Logout */}
      <button onClick={() => navigate("/auth")} className="w-full flex items-center justify-center gap-2 py-3 text-foodiz-gray hover:text-foodiz-cream transition-colors text-sm">
        <LogOut size={16} />
        Se déconnecter
      </button>
    </div>
  );
}
