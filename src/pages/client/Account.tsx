import { useEffect, useState } from "react";
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
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { supabase } from "../../lib/supabase";
import { getCurrentUserProfile, getFullName } from "../../utils/authProfile";

const MENU_ITEMS = [
  { label: "Informations personnelles", icon: User, path: "/client/account/personal-info" },
  { label: "Mes adresses", icon: MapPin, path: "/client/account/addresses" },
  { label: "Moyens de paiement", icon: CreditCard, path: "/client/account/payments" },
  { label: "Mes favoris", icon: Heart, path: "/client/account/favorites" },
];
const LOYALTY_ITEMS = [
  { label: "Mes avantages", icon: Gift, path: "/client/advantages" },
  { label: "Parrainage", icon: Users, path: "/client/account/referral", desc: "Gagnez 500 pts par ami invité" },
  { label: "Historique des avantages", icon: Star, path: "/client/advantages/history" },
];
const SUPPORT_ITEMS = [
  { label: "Centre d'aide", icon: HelpCircle, path: "/client/help-center" },
  { label: "Nous contacter", icon: MessageCircle, path: "/client/account/help" },
];

export default function AccountPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Utilisateur");
  const [email, setEmail] = useState("");
  const [points, setPoints] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { profile } = await getCurrentUserProfile();
        if (profile) {
          setName(getFullName(profile));
          setEmail(profile.email || "");
          setPoints(profile.points_balance || 0);
        }
      } catch {}
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(135deg,rgba(216,168,79,0.16),rgba(17,17,17,0.95)_28%,rgba(5,5,5,1)_100%)] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.45),0_0_28px_rgba(216,168,79,0.06)]">
        <div className="absolute inset-0 kraft-paper-overlay opacity-20" />
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foodiz-gold/80 to-transparent" />
        <div className="absolute -top-10 right-0 h-32 w-32 rounded-full bg-foodiz-gold/10 blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-foodiz-gradient-gold border-2 border-foodiz-gold/30 flex items-center justify-center shadow-[0_12px_30px_rgba(216,168,79,0.18)] shrink-0">
            <span className="text-foodiz-black font-serif font-bold text-2xl">{name.charAt(0) || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-1 rounded-full bg-black/30 border border-foodiz-gold/15 text-[9px] uppercase tracking-[0.18em] text-foodiz-gold font-bold">Foodiz Club</span>
              <span className="px-2.5 py-1 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/20 text-[9px] uppercase tracking-[0.18em] text-foodiz-gold font-bold">Membre</span>
            </div>
            <h2 className="foodiz-title text-xl">{name}</h2>
            <p className="text-foodiz-gray text-xs">{email}</p>
          </div>
          <button onClick={() => navigate("/client/account/personal-info")} className="text-foodiz-gold text-xs border border-foodiz-gold/20 rounded-full px-3 py-1.5 hover:border-foodiz-gold/40 transition-all">Modifier</button>
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[1.2rem] bg-white/[0.03] border border-foodiz-gold/10 p-4">
            <p className="text-[10px] text-foodiz-gray uppercase tracking-[0.18em] font-bold">Points disponibles</p>
            <div className="flex items-center gap-2 mt-2"><GoldIcon icon={Star} size={14} /><span className="text-foodiz-gold text-2xl font-bold font-serif">{points}</span></div>
          </div>
          <div className="rounded-[1.2rem] bg-white/[0.03] border border-foodiz-gold/10 p-4">
            <p className="text-[10px] text-foodiz-gray uppercase tracking-[0.18em] font-bold">Avantage actif</p>
            <div className="flex items-center gap-2 mt-2"><GoldIcon icon={Sparkles} size={14} /><span className="text-foodiz-cream text-sm font-medium">Aucun verrouillage</span></div>
          </div>
        </div>
      </div>

      <button onClick={() => navigate("/client/account/referral")} className="w-full overflow-hidden rounded-[1.6rem] border border-foodiz-gold/15 bg-[linear-gradient(135deg,rgba(216,168,79,0.08),rgba(17,17,17,0.95)_26%,rgba(10,10,10,1)_100%)] p-5 text-left shadow-[0_14px_40px_rgba(0,0,0,0.3)]">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] text-foodiz-gold uppercase tracking-[0.2em] font-bold mb-2">Parrainage Foodiz</p><h3 className="foodiz-title text-lg mb-2">Invitez vos proches</h3><p className="text-foodiz-gray text-sm leading-relaxed max-w-[260px]">Gagnez 500 points Foodiz pour chaque ami invité ayant validé sa première commande.</p></div><div className="w-12 h-12 rounded-2xl bg-foodiz-gold/12 border border-foodiz-gold/20 flex items-center justify-center shrink-0"><GoldIcon icon={Users} size={18} /></div></div>
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1"><ShieldCheck size={14} className="text-foodiz-gold" /><h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Fidélité & Avantages</h3></div>
        {LOYALTY_ITEMS.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all bg-[linear-gradient(145deg,rgba(216,168,79,0.05),rgba(17,17,17,0.98)_25%,rgba(10,10,10,1)_100%)]">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center shrink-0"><GoldIcon icon={item.icon} size={18} /></div>
            <div className="flex-1 min-w-0"><p className="text-sm text-foodiz-cream">{item.label}</p>{item.desc && <p className="text-[10px] text-foodiz-gray mt-0.5">{item.desc}</p>}</div>
            {item.label === "Mes avantages" && <span className="text-[10px] text-foodiz-gold bg-foodiz-gold/10 px-2 py-1 rounded-full font-semibold border border-foodiz-gold/15">{points} pts</span>}
            <ChevronRight size={14} className="text-foodiz-gold/30" />
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1"><User size={14} className="text-foodiz-gold" /><h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Compte</h3></div>
        {MENU_ITEMS.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-foodiz-gold/10 flex items-center justify-center shrink-0"><GoldIcon icon={item.icon} size={18} /></div><div className="flex-1"><p className="text-sm text-foodiz-cream">{item.label}</p></div><ChevronRight size={14} className="text-foodiz-gold/30" /></button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1"><HelpCircle size={14} className="text-foodiz-gold" /><h3 className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Assistance</h3></div>
        {SUPPORT_ITEMS.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full foodiz-card p-4 flex items-center gap-3 text-left hover:border-foodiz-gold/30 transition-all"><div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-foodiz-gold/10 flex items-center justify-center shrink-0"><GoldIcon icon={item.icon} size={18} /></div><div className="flex-1"><p className="text-sm text-foodiz-cream">{item.label}</p></div><ChevronRight size={14} className="text-foodiz-gold/30" /></button>
        ))}
      </div>

      <button onClick={() => navigate("/client/account/delete")} className="w-full foodiz-card p-4 flex items-center gap-3 border-foodiz-red/20 hover:border-foodiz-red/40 transition-all"><div className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center shrink-0"><Trash2 size={18} className="text-foodiz-red" /></div><span className="text-sm text-foodiz-red">Supprimer mon compte</span></button>

      <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 text-foodiz-gray hover:text-foodiz-cream transition-colors text-sm"><LogOut size={16} />Se déconnecter</button>
    </div>
  );
}
