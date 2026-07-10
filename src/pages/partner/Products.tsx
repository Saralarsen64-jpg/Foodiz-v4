import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Plus, Edit, EyeOff, Menu, LogOut, Activity, UserCheck, CreditCard, Megaphone } from "lucide-react";
import toast from "react-hot-toast";
import Logo from "../../components/Logo";

export default function PartnerProducts() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupérer l'ID du restaurant lié à ce partenaire et ses produits
        const { data: restaurant } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
        if (restaurant) {
          const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false });
          if (prods) setProducts(prods);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleArchive = async (id: string) => {
    if (!window.confirm("Retirer ce produit de la vente ? Son historique sera conservé.")) return;
    const { error } = await supabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error("Impossible d'archiver ce produit.");
    else { setProducts((current) => current.map((product) => product.id === id ? { ...product, is_active: false } : product)); toast.success("Produit retiré de la vente."); }
  };

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/partner" },
    { label: "Commandes", icon: UserCheck, path: "/partner/orders/current" },
    { label: "Finances", icon: CreditCard, path: "/partner/payouts" },
    { label: "Weello+", icon: Megaphone, path: "/partner/marketing" },
  ];

  return (
    <div className="min-h-screen bg-weello-black pb-24 relative border-x-2 border-weello-gold/20">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-weello-gold/40 to-transparent z-50" />
      
      <header className="bg-weello-card border-b border-weello-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-weello-gold md:hidden"><Menu size={22} /></button>
          <Logo size="md" />
          <button onClick={() => navigate("/partner/products/new")} className="weello-btn py-2 px-4 text-xs flex items-center gap-2">
            <Plus size={14} /> Ajouter un plat
          </button>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 bg-weello-card border-r border-weello-gold/10 p-6 overflow-y-auto">
            <Logo size="md" className="mb-8" />
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <button key={item.label} onClick={() => { navigate(item.path); setSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-weello-gray hover:text-weello-cream hover:bg-weello-gold/5 transition-all">
                  <item.icon size={18} className="text-weello-gold" /> {item.label}
                </button>
              ))}
              <button onClick={() => { supabase.auth.signOut(); navigate("/auth"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-weello-red hover:bg-weello-red/5 transition-all mt-8">
                <LogOut size={18} /> Déconnexion
              </button>
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="weello-title text-2xl text-weello-cream mb-2">Gestion du Menu</h1>
        <p className="text-weello-gray text-sm mb-8">Ajoutez, modifiez ou supprimez vos plats. Les prix sont en euros mais stockés en centimes pour le moteur économique.</p>

        {loading ? (
          <div className="text-center py-20 text-weello-gray animate-pulse">Chargement du menu...</div>
        ) : products.length === 0 ? (
          <div className="weello-card p-12 text-center bg-[#0A0A0A] border-weello-gold/10">
            <Menu size={48} className="mx-auto text-weello-gray/20 mb-4" />
            <h3 className="text-weello-cream text-lg font-medium mb-2">Votre carte est vide</h3>
            <p className="text-weello-gray text-sm mb-6">Commencez par ajouter votre premier plat pour être visible par les clients.</p>
            <button onClick={() => navigate("/partner/products/new")} className="weello-btn inline-flex items-center gap-2">
              <Plus size={18} /> Créer mon premier plat
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <div key={product.id} className="weello-card p-4 bg-[#0A0A0A] border-weello-gold/10 flex items-center justify-between group hover:border-weello-gold/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-weello-black border border-weello-gold/10 overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-weello-gray/20"><Menu size={24} /></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-weello-cream font-bold text-lg flex items-center gap-2">
                      {product.name}
                      {!product.is_active && <span className="text-[10px] px-2 py-0.5 rounded bg-weello-red/10 text-weello-red border border-weello-red/20 uppercase">Rupture</span>}
                    </h3>
                    <p className="text-weello-gray text-xs mb-1">{product.category}</p>
                    <p className="text-weello-gold font-serif italic text-lg">{(product.partner_price_cents / 100).toFixed(2)} €</p>
                    {product.promotion_partner_price_cents && (
                      <p className="mt-1 text-xs font-semibold text-weello-green">
                        {product.promotion_label || "Offre partenaire"} · {(product.promotion_partner_price_cents / 100).toFixed(2)} €
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/partner/products/${product.id}/edit`)} className="p-3 rounded-xl bg-weello-gold/10 text-weello-gold hover:bg-weello-gold/20 transition-all">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleArchive(product.id)} disabled={!product.is_active} className="p-3 rounded-xl bg-weello-red/10 text-weello-red hover:bg-weello-red/20 transition-all disabled:opacity-30">
                    <EyeOff size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
