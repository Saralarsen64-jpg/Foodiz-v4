import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { CreditCard, Save, AlertCircle, CheckCircle, Menu, X, LogOut, Activity, UserCheck, Megaphone } from "lucide-react";
import Logo from "../../components/Logo";

export default function PartnerSettings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [bankDetails, setBankDetails] = useState({
    iban: "",
    bic: "",
    holder_name: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('bank_accounts').select('*').eq('user_id', user.id).single();
        if (data) setBankDetails({ iban: data.iban, bic: data.bic, holder_name: data.holder_name });
      }
    };
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('bank_accounts').upsert({
      user_id: user.id,
      ...bankDetails
    });

    if (error) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    } else {
      setMessage({ type: 'success', text: "Coordonnées bancaires enregistrées avec succès !" });
    }
    setLoading(false);
  };

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/partner" },
    { label: "Commandes", icon: UserCheck, path: "/partner/orders/current" },
    { label: "Finances", icon: CreditCard, path: "/partner/payouts" },
    { label: "Foodiz+", icon: Megaphone, path: "/partner/marketing" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden"><Menu size={22} /></button>
          <Logo size="md" />
          <div className="w-6" />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-foodiz-card border-r border-foodiz-gold/10 p-6 overflow-y-auto">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
                  <item.icon size={18} className="text-foodiz-gold" /> {item.label}
                </button>
              ))}
              <button onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-red hover:bg-foodiz-red/5 transition-all mt-8">
                <LogOut size={18} /> Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="foodiz-title text-2xl text-foodiz-cream mb-2">Paramètres de l'établissement</h1>
        <p className="text-foodiz-gray text-sm mb-8">Gérez vos informations bancaires pour recevoir vos virements Foodiz.</p>

        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-foodiz-gold/10">
            <div className="p-3 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20">
              <CreditCard size={24} className="text-foodiz-gold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foodiz-cream">Coordonnées Bancaires</h2>
              <p className="text-xs text-foodiz-gray">Ces informations sont cryptées et uniquement visibles par l'administrateur Foodiz pour les virements.</p>
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20' : 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Titulaire du compte</label>
                <input 
                  type="text" 
                  required 
                  value={bankDetails.holder_name} 
                  onChange={(e) => setBankDetails({...bankDetails, holder_name: e.target.value})}
                  className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors"
                  placeholder="Nom de l'entreprise ou du titulaire"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Code BIC / SWIFT</label>
                <input 
                  type="text" 
                  required 
                  value={bankDetails.bic} 
                  onChange={(e) => setBankDetails({...bankDetails, bic: e.target.value.toUpperCase()})}
                  className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors font-mono uppercase"
                  placeholder="EX: BNPAFRPP"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-foodiz-gray tracking-wider">Numéro IBAN</label>
              <input 
                type="text" 
                required 
                value={bankDetails.iban} 
                onChange={(e) => setBankDetails({...bankDetails, iban: e.target.value.toUpperCase()})}
                className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold transition-colors font-mono uppercase tracking-widest"
                placeholder="EX: FR76 3000 4000 5000 6000 7000 800"
              />
              <p className="text-[10px] text-foodiz-gray/50">Assurez-vous que l'IBAN correspond bien au titulaire du compte.</p>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={loading} className="foodiz-btn flex items-center gap-2 px-8 py-3 disabled:opacity-50">
                {loading ? "Enregistrement..." : <><Save size={18} /> Enregistrer les coordonnées</>}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}