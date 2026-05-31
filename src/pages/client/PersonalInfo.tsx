import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Save, User, Mail, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Initialisation avec des chaînes vides (JAMAIS de faux noms ici)
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupération des VRAIES infos depuis la base de données
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          setFormData({
            fullName: profile.full_name || "",
            email: user.email || "",
            phone: profile.phone || "",
            address: profile.address || ""
          });
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mise à jour de la table profiles avec les VRAIES infos modifiées
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ 
        full_name: formData.fullName, 
        phone: formData.phone, 
        address: formData.address 
      })
      .eq('id', user.id);

    // Mise à jour de l'email dans l'authentification
    const { error: authError } = await supabase.auth.updateUser({ email: formData.email });

    if (authError || dbError) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    } else {
      setMessage({ type: 'success', text: "Informations mises à jour avec succès !" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Mes informations</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20' : 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Nom complet</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={User} size={16} />
              <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none" required />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Adresse email</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Mail} size={16} />
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none" required />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Téléphone</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={Phone} size={16} />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none" required />
            </div>
          </div>

          <div className="foodiz-card p-4">
            <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Adresse de livraison</label>
            <div className="flex items-center gap-3 mt-2">
              <GoldIcon icon={MapPin} size={16} />
              <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none" placeholder="Ex: 12 rue de la Paix, Paris" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full foodiz-btn !py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-6">
            <Save size={18} /> {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </form>
      </main>
    </div>
  );
}