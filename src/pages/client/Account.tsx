import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, Mail, MapPin, ChevronRight, LogOut, Gift, CreditCard, Settings, Camera } from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("Utilisateur");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. On récupère la session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // On affiche l'email tout de suite
        setUserEmail(session.user.email || "");
        // On affiche le nom d'inscription par défaut en attendant la base de données
        setFullName(session.user.user_metadata?.full_name || "Utilisateur");
        
        // 2. On essaie de récupérer les infos profil (Avatar, Nom mis à jour)
        const { data: profileData } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', session.user.id).single();
        
        if (profileData) {
          if (profileData.full_name) setFullName(profileData.full_name);
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
        }
      } else {
        // Si vraiment personne n'est connecté, on renvoie à la page de connexion
        navigate("/auth");
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const menuItems = [
    { label: "Mes informations", icon: User, path: "/client/account/personal-info" },
    { label: "Mes adresses", icon: MapPin, path: "/client/account/addresses" },
    { label: "Mes paiements", icon: CreditCard, path: "/client/account/payments" },
    { label: "Mes favoris", icon: Gift, path: "/client/account/favorites" },
    { label: "Parrainage & VIP", icon: Gift, path: "/client/account/referral" },
    { label: "Foodiz Club", icon: Gift, path: "/client/advantages" },
    { label: "Centre d'aide", icon: Settings, path: "/client/help-center" },
  ];

  // La page s'affiche IMMÉDIATEMENT, plus de blocage "if (!profile)".
  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-foodiz-card to-foodiz-black border-b border-foodiz-gold/10">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer">
            <div className="w-full h-full rounded-full bg-foodiz-gradient-gold p-1 shadow-lg shadow-foodiz-gold/20 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profil" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-foodiz-black flex items-center justify-center">
                  <User size={32} className="text-foodiz-gold" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          
          <h1 className="foodiz-title text-2xl text-foodiz-cream">{fullName}</h1>
          <p className="text-foodiz-gray text-xs mt-2 flex items-center justify-center gap-1">
            <Mail size={12} /> {userEmail || "Chargement de l'email..."}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-3">
        {menuItems.map((item) => (
          <button 
            key={item.label} 
            onClick={() => navigate(item.path)} 
            className="w-full foodiz-card p-4 flex items-center justify-between hover:border-foodiz-gold/30 transition-all group bg-[#0A0A0A]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-medium text-foodiz-cream">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-foodiz-gray/50 group-hover:text-foodiz-gold transition-colors" />
          </button>
        ))}

        <button 
          onClick={handleLogout} 
          className="w-full foodiz-card p-4 flex items-center gap-4 mt-8 border-foodiz-red/20 hover:bg-foodiz-red/5 transition-all group bg-[#0A0A0A]"
        >
          <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-red/20 flex items-center justify-center text-foodiz-red group-hover:bg-foodiz-red group-hover:text-white transition-colors">
            <LogOut size={18} />
          </div>
          <span className="text-sm font-medium text-foodiz-red">Se déconnecter</span>
        </button>
      </main>
    </div>
  );
}