import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { User, Mail, MapPin, ChevronRight, LogOut, Gift, CreditCard, Settings, Camera } from "lucide-react";
import toast from "react-hot-toast";

export default function AccountPage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("Utilisateur");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      // 1. On récupère la session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // On affiche l'email et le nom
        setUserEmail(session.user.email || "");
        setFullName(session.user.user_metadata?.full_name || "Utilisateur");
        
        // 2. On récupère l'avatar et le nom mis à jour depuis la base de données
        const { data: profileData } = await supabase.from('profiles').select('avatar_url, full_name').eq('id', session.user.id).single();
        
        if (profileData) {
          if (profileData.full_name) setFullName(profileData.full_name);
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
        }
      }
      // PAS DE REDIRECTION ICI. La page reste affichée quoi qu'il arrive.
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      toast.error("Utilisez une image JPG, PNG ou WebP de 3 Mo maximum.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée.");
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatars/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("profile-media").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("profile-media").getPublicUrl(path);
      const { error: profileError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      if (profileError) throw profileError;
      setAvatarUrl(data.publicUrl);
      toast.success("Photo de profil mise à jour.");
    } catch (error: any) {
      toast.error(error.message || "Upload impossible.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const menuItems = [
    { label: "Mes informations", icon: User, path: "/client/account/personal-info" },
    { label: "Mes adresses", icon: MapPin, path: "/client/account/addresses" },
    { label: "Mes paiements", icon: CreditCard, path: "/client/account/payments" },
    { label: "Mes favoris", icon: Gift, path: "/client/account/favorites" },
    { label: "Parrainage & VIP", icon: Gift, path: "/client/account/referral" },
    { label: "Weello Club", icon: Gift, path: "/client/advantages" },
    { label: "Centre d'aide", icon: Settings, path: "/client/help-center" },
  ];

  // La page s'affiche IMMÉDIATEMENT.
  return (
    <div className="min-h-screen bg-weello-black pb-24 animate-fade-in-up relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-weello-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-weello-gold/20 to-transparent z-50" />
      
      <header className="px-6 pt-12 pb-8 bg-gradient-to-b from-weello-card to-weello-black border-b border-weello-gold/10">
        <div className="max-w-lg mx-auto text-center">
          <label className="relative block w-24 h-24 mx-auto mb-4 group cursor-pointer">
            <div className="w-full h-full rounded-full bg-weello-gradient-gold p-1 shadow-lg shadow-weello-gold/20 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profil" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-weello-black flex items-center justify-center">
                  <User size={32} className="text-weello-gold" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar ? <span className="text-xs text-white">Chargement…</span> : <Camera size={24} className="text-white" />}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingAvatar} onChange={(event) => void uploadAvatar(event.target.files?.[0])} className="hidden" />
          </label>
          
          <h1 className="weello-title text-2xl text-weello-cream">{fullName}</h1>
          <p className="text-weello-gray text-xs mt-2 flex items-center justify-center gap-1">
            <Mail size={12} /> {userEmail}
          </p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-3">
        {menuItems.map((item) => (
          <button 
            key={item.label} 
            onClick={() => navigate(item.path)} 
            className="w-full weello-card p-4 flex items-center justify-between hover:border-weello-gold/30 transition-all group bg-[#0A0A0A]"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-weello-black border border-weello-gold/20 flex items-center justify-center text-weello-gold group-hover:bg-weello-gold group-hover:text-weello-black transition-colors">
                <item.icon size={18} />
              </div>
              <span className="text-sm font-medium text-weello-cream">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-weello-gray/50 group-hover:text-weello-gold transition-colors" />
          </button>
        ))}

        <button 
          onClick={handleLogout} 
          className="w-full weello-card p-4 flex items-center gap-4 mt-8 border-weello-red/20 hover:bg-weello-red/5 transition-all group bg-[#0A0A0A]"
        >
          <div className="w-10 h-10 rounded-full bg-weello-black border border-weello-red/20 flex items-center justify-center text-weello-red group-hover:bg-weello-red group-hover:text-white transition-colors">
            <LogOut size={18} />
          </div>
          <span className="text-sm font-medium text-weello-red">Se déconnecter</span>
        </button>
      </main>
    </div>
  );
}
