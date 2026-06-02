import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Save, User, Mail, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react";

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ fullName: "", email: "", phone: "", address: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setFormData({
            fullName: profile.full_name || "",
            email: session.user.email || "",
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
    if (!userId) return;
    setLoading(true);
    setMessage(null);

    // Mise à jour de la table profiles
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ full_name: formData.fullName, phone: formData.phone, address: formData.address })
      .eq('id', userId);

    // Mise à jour de l'email dans l'auth
    const { error: authError } = await supabase.auth.updateUser({ email: formData.email });

    if (authError || dbError) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    } else {
      setMessage({ type: 'success', text: "Informations enregistrées !" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30 flex items-center justify-between max-w-lg mx-auto">
        <button onClick={() => navigate("/client/account")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
        <h1 className="foodiz-title text-lg">Mes informations</h1>
        <div className="w-6" />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === 'success' ? 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20' : 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="foodiz-card p-4 flex items-center gap-3">
            <User size={16} className="text-foodiz-gold" />
            <input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream outline-none" placeholder="Nom complet" required />
          </div>
          <div className="foodiz-card p-4 flex items-center gap-3">
            <Mail size={16} className="text-foodiz-gold" />
            <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream outline-none" placeholder="Email" required />
          </div>
          <div className="foodiz-card p-4 flex items-center gap-3">
            <Phone size={16} className="text-foodiz-gold" />
            <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream outline-none" placeholder="Téléphone" required />
          </div>
          <div className="foodiz-card p-4 flex items-center gap-3">
            <MapPin size={16} className="text-foodiz-gold" />
            <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="flex-1 bg-transparent text-foodiz-cream outline-none" placeholder="Adresse de livraison" required />
          </div>
          <button type="submit" disabled={loading} className="w-full foodiz-btn !py-4 flex items-center justify-center gap-2 disabled:opacity-50 mt-6">
            <Save size={18} /> {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </main>
    </div>
  );
}