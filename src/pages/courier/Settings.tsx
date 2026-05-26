import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { CreditCard, Save, AlertCircle, CheckCircle, Menu, X, LogOut, Activity, Navigation, Wallet } from "lucide-react";
import Logo from "../../components/Logo";

export default function CourierSettings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [bankDetails, setBankDetails] = useState({ iban: "", bic: "", holder_name: "" });

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

    const { error } = await supabase.from('bank_accounts').upsert({ user_id: user.id, ...bankDetails });
    if (error) setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    else setMessage({ type: 'success', text: "Coordonnées bancaires enregistrées !" });
    setLoading(false);
  };

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/courier" },
    { label: "Courses", icon: Navigation, path: "/courier/deliveries/available" },
    { label: "Gains", icon: Wallet, path: "/courier/earnings" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold"><Menu size={22} /></button>
          <Logo size="md" />
          <div className="w-6" />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-foodiz-card border-r border-foodiz-gold/10 p-6">
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

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="foodiz-title text-2xl text-foodiz-cream mb-2">Mes Coordonnées Bancaires</h1>
        <p className="text-foodiz-gray text-sm mb-8">Renseigne ton IBAN pour recevoir tes gains de courses.</p>

        <div className="foodiz-card p-6 bg-[#0A0A0A] border-foodiz-gold/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20"><CreditCard size={24} className="text-foodiz-gold" /></div>
            <h2 className="text-lg font-bold text-foodiz-cream">Virement Bancaire</h2>
          </div>

          {message && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${message.type === 'success' ? 'bg-foodiz-green/10 text-foodiz-green border-foodiz-green/20' : 'bg-foodiz-red/10 text-foodiz-red border-foodiz-red/20'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <input type="text" required value={bankDetails.holder_name} onChange={(e) => setBankDetails({...bankDetails, holder_name: e.target.value})} className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold" placeholder="Titulaire du compte" />
            <input type="text" required value={bankDetails.bic} onChange={(e) => setBankDetails({...bankDetails, bic: e.target.value.toUpperCase()})} className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold font-mono uppercase" placeholder="Code BIC" />
            <input type="text" required value={bankDetails.iban} onChange={(e) => setBankDetails({...bankDetails, iban: e.target.value.toUpperCase()})} className="w-full bg-foodiz-black border border-foodiz-gold/30 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold font-mono uppercase tracking-widest" placeholder="IBAN" />
            
            <button type="submit" disabled={loading} className="w-full foodiz-btn flex items-center justify-center gap-2 py-4 mt-4 disabled:opacity-50">
              {loading ? "Enregistrement..." : <><Save size={18} /> Enregistrer</>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}