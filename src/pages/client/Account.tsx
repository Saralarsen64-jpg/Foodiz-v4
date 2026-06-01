import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, Mail, MapPin, ChevronRight, LogOut, Gift, CreditCard, Settings } from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. On récupère l'ID de la personne CONNECTÉE (pas d'admin, pas d'autre)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 2. On demande UNIQUEMENT les données de CET ID
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        setProfile({
          full_name: data?.full_name || "Utilisateur Foodiz",
          email: user.email, // L'email vient de l'auth sécurisée
          phone: data?.phone || "",
          address: data?.address || "",
          referral_code: data?.referral_code || ""
        });
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!profile) return <div className="min-h-screen bg-foodiz-black flex items-center justify-center text-foodiz-gold animate-pulse">Chargement du profil...</div>;

  const menuItems = [
    { label: "Mes informations personnelles", icon: User, path: "/client/account/personal-info" },
    { label: "Mes adresses de livraison", icon: MapPin, path: "/client/account/addresses" },
    { label: "Mes moyens de paiement", icon: CreditCard, path: "/client/account/payments" },
    { label: "Mes favoris", icon: Gift, path: "/client/account/favorites" },
    { label: "Parrainage", icon: Gift, path: "/client/account/referral" },
    { label: "Foodiz Club & Avantages", icon: Gift, path: "/client/advantages" },
    { label: "Centre d'aide", icon: Settings, path: "/client/help-center" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-foodiz-gradient-gold mx-auto flex items-center justify-center mb-3 shadow-lg shadow-foodiz-gold/20">
            <User size={32} className="text-foodiz-black" />
          </div>
          <h1 className="foodiz-title text-xl text-foodiz-cream">{profile.full_name}</h1>
          <p className="text-foodiz-gray text-xs mt-1 flex items-center justify-center gap-1">
            <Mail size={12} /> {profile.email}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className="w-full foodiz-card p-4 flex items-center justify-between hover:border-foodiz-gold/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-medium text-foodiz-cream">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-foodiz-gray/50" />
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="w-full foodiz-card p-4 flex items-center gap-4 mt-8 border-foodiz-red/20 hover:bg-foodiz-red/5 transition-all group"
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