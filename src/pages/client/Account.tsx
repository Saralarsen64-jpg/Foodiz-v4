import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, Mail, MapPin, ChevronRight, LogOut, Gift, CreditCard, Settings, Camera } from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // On affiche TOUJOURS l'email de la session connectée
        setUserEmail(session.user.email || "");
        
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        
        // On utilise les données de la BDD, ou à défaut les métadonnées de l'inscription (Nom)
        setProfile({ 
          full_name: profileData?.full_name || session.user.user_metadata?.full_name || "Utilisateur", 
          avatar_url: profileData?.avatar_url || null,
          referral_count: profileData?.referral_count || 0
        });
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!profile) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gold animate-pulse">Chargement...</div>;

  const menuItems = [
    { label: "Mes informations", icon: User, path: "/client/account/personal-info" },
    { label: "Mes adresses", icon: MapPin, path: "/client/account/addresses" },
    { label: "Mes paiements", icon: CreditCard, path: "/client/account/payments" },
    { label: "Mes favoris", icon: Gift, path: "/client/account/favorites" },
    { label: "Parrainage & VIP", icon: Gift, path: "/client/account/referral" },
    { label: "Foodiz Club", icon: Gift, path: "/client/advantages" },
    { label: "Centre d'aide", icon: Settings, path: "/client/help-center" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-foodiz-card to-foodiz-black border-b border-foodiz-gold/10">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
            <div className="w-full h-full rounded-full bg-foodiz-gradient-gold p-1 shadow-lg shadow-foodiz-gold/20 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profil" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-foodiz-black flex items-center justify-center">
                  <User size={32} className="text-foodiz-gold" />
                </div>
              )}
            </div>
          </div>
          <h1 className="foodiz-title text-2xl text-foodiz-cream">{profile.full_name}</h1>
          <p className="text-foodiz-gray text-xs mt-2 flex items-center justify-center gap-1">
            <Mail size={12} /> {userEmail}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-3">
        {menuItems.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full foodiz-card p-4 flex items-center justify-between hover:border-foodiz-gold/30 transition-all group bg-[#0A0A0A]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-medium text-foodiz-cream">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-foodiz-gray/50 group-hover:text-foodiz-gold transition-colors" />
          </button>
        ))}

        <button onClick={handleLogout} className="w-full foodiz-card p-4 flex items-center gap-4 mt-8 border-foodiz-red/20 hover:bg-foodiz-red/5 transition-all group bg-[#0A0A0A]">
          <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-red/20 flex items-center justify-center text-foodiz-red group-hover:bg-foodiz-red group-hover:text-white transition-colors">
            <LogOut size={18} />
          </div>
          <span className="text-sm font-medium text-foodiz-red">Se déconnecter</span>
        </button>
      </main>
    </div>
  );
}