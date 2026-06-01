import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, Mail, MapPin, ChevronRight, LogOut, Gift, CreditCard, Settings, Camera } from "lucide-react";

export default function AccountPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [userEmail, setUserEmail] = useState("Chargement...");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // 1. On récupère la session de l'utilisateur connecté
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // 2. On affiche son email réel
          setUserEmail(session.user.email || "Email non disponible");
          
          // 3. On récupère ses infos (Nom, Photo, etc.)
          const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          
          if (error) {
            console.error("Erreur lors de la récupération du profil:", error);
          }

          setProfile({
            full_name: data?.full_name || "Utilisateur Foodiz",
            avatar_url: data?.avatar_url,
            referral_count: data?.referral_count || 0,
          });
        } else {
          // Si personne n'est connecté, on renvoie vers la page de connexion
          navigate("/auth");
        }
      } catch (err) {
        console.error("Erreur critique chargement compte:", err);
        setUserEmail("Erreur de chargement");
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error("Erreur upload avatar:", error);
      alert("Erreur lors de l'upload. Vérifiez la console (F12) pour plus de détails.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Si le profil n'est pas encore chargé, on affiche un texte simple (plus de page blanche !)
  if (!profile) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <p className="animate-pulse text-lg">Chargement de votre profil...</p>
        <p className="text-xs text-foodiz-gray mt-2">Email détecté : {userEmail}</p>
      </div>
    );
  }

  const menuItems = [
    { label: "Mes informations personnelles", icon: User, path: "/client/account/personal-info" },
    { label: "Mes adresses de livraison", icon: MapPin, path: "/client/account/addresses" },
    { label: "Mes moyens de paiement", icon: CreditCard, path: "/client/account/payments" },
    { label: "Mes favoris", icon: Gift, path: "/client/account/favorites" },
    { label: "Parrainage & VIP", icon: Gift, path: "/client/account/referral" },
    { label: "Foodiz Club & Avantages", icon: Gift, path: "/client/advantages" },
    { label: "Centre d'aide", icon: Settings, path: "/client/help-center" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="relative w-24 h-24 mx-auto mb-3 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-full h-full rounded-full bg-foodiz-gradient-gold p-1 shadow-lg shadow-foodiz-gold/20 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profil" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-foodiz-black flex items-center justify-center">
                  <User size={32} className="text-foodiz-gold" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
          </div>
          
          <h1 className="foodiz-title text-xl text-foodiz-cream">{profile.full_name}</h1>
          <p className="text-foodiz-gray text-xs mt-1 flex items-center justify-center gap-1">
            <Mail size={12} /> {userEmail}
          </p>
          {uploading && <p className="text-foodiz-gold text-[10px] mt-2 animate-pulse">Upload en cours...</p>}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <button key={item.label} onClick={() => navigate(item.path)} className="w-full foodiz-card p-4 flex items-center justify-between hover:border-foodiz-gold/30 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-gold/20 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-medium text-foodiz-cream">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-foodiz-gray/50" />
          </button>
        ))}

        <button onClick={handleLogout} className="w-full foodiz-card p-4 flex items-center gap-4 mt-8 border-foodiz-red/20 hover:bg-foodiz-red/5 transition-all group">
          <div className="w-10 h-10 rounded-full bg-foodiz-black border border-foodiz-red/20 flex items-center justify-center text-foodiz-red group-hover:bg-foodiz-red group-hover:text-white transition-colors">
            <LogOut size={18} />
          </div>
          <span className="text-sm font-medium text-foodiz-red">Se déconnecter</span>
        </button>
      </main>
    </div>
  );
}