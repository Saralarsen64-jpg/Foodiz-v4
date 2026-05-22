import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Navigation, Wallet, LogOut, Menu } from "lucide-react";
import { supabase } from "../../lib/supabase";
import GoldIcon from "../../components/GoldIcon";
import Logo from "../../components/Logo";

export default function CourierDashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [courierName, setCourierName] = useState("Livreur");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profileData) setCourierName(profileData.full_name || "Livreur");
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const sidebarItems = [
    { label: "Dashboard", icon: TrendingUp, path: "/courier" },
    { label: "Courses disponibles", icon: Navigation, path: "/courier/deliveries/available" },
    { label: "Gains", icon: Wallet, path: "/courier/earnings" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-foodiz-gold md:hidden">
            <Menu size={22} />
          </button>
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
              {sidebarItems.map((item) => (
                <button key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
                  <GoldIcon icon={item.icon} size={18} /> {item.label}
                </button>
              ))}
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-red hover:bg-foodiz-red/5 transition-all mt-8">
                <LogOut size={18} /> Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="foodiz-title text-2xl mb-1">Bonjour, {courierName}</h1>
            <p className="text-foodiz-gray text-sm">Prêt à rouler ?</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-foodiz-gray hover:text-foodiz-red transition-colors text-sm bg-foodiz-card px-3 py-2 rounded-xl border border-foodiz-gold/10">
            <LogOut size={14} />
          </button>
        </div>

        {/* Online Toggle */}
        <div className="foodiz-card p-6 flex items-center justify-between bg-gradient-to-r from-foodiz-gold/10 to-foodiz-card border-foodiz-gold/20">
          <div>
            <h3 className="text-foodiz-cream font-bold">Statut : {isOnline ? "En ligne" : "Hors ligne"}</h3>
            <p className="text-xs text-foodiz-gray mt-1">{isOnline ? "Vous recevez des courses..." : "Reposez-vous bien !"}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-foodiz-black peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-foodiz-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-foodiz-green"></div>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10">
            <p className="text-[10px] text-foodiz-gray uppercase font-bold">Gains du jour</p>
            <p className="text-2xl font-serif italic text-foodiz-green mt-1">45.50 €</p>
          </div>
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/10">
            <p className="text-[10px] text-foodiz-gray uppercase font-bold">Courses terminées</p>
            <p className="text-2xl font-serif italic text-foodiz-cream mt-1">8</p>
          </div>
        </div>

        {/* Actions */}
        <button onClick={() => navigate("/courier/deliveries/available")} className="w-full foodiz-btn py-4 text-lg flex items-center justify-center gap-2">
          <Navigation size={20} /> Voir les courses disponibles
        </button>
      </main>
    </div>
  );
}
