import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { CreditCard, CheckCircle, AlertCircle, ArrowLeft, Menu, X, LogOut, Activity, UserCheck, Megaphone, Euro } from "lucide-react";
import Logo from "../../components/Logo";

export default function AdminPayouts() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPayouts, setPendingPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'adminfoodiz@gmail.com') navigate("/admin-auth");
      else fetchPayouts();
    };
    checkAuth();
  }, [navigate]);

  const fetchPayouts = async () => {
    setLoading(true);
    // 1. Récupérer tous les partenaires et livreurs approuvés
    const { data: users } = await supabase.from('profiles').select('id, full_name, email, role').eq('is_approved', true).in('role', ['partner', 'courier']);
    
    if (users) {
      const payoutsData = await Promise.all(users.map(async (user) => {
        // Calculer les gains totaux (Commandes livrées)
        let totalEarnedCents = 0;
        if (user.role === 'courier') {
          // Exemple : 4.50€ par course livrée (450 centimes)
          const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('courier_id', user.id).eq('status', 'delivered');
          totalEarnedCents = (count || 0) * 450; 
        } else {
          // Pour les partenaires, on prend le total des commandes (à affiner avec le moteur économique plus tard)
          const { data: orders } = await supabase.from('orders').select('final_client_total_cents').eq('restaurant_id', user.id).eq('status', 'delivered'); // Note: il faut lier restaurant_id au user_id via la table restaurants en prod, ici simplifié
          // Pour l'instant, on met 0 pour éviter les erreurs de jointure complexes sans la table restaurants liée
        }

        // Récupérer ce qui a DÉJÀ été payé
        const { data: paidData } = await supabase.from('payouts').select('amount_cents').eq('user_id', user.id);
        const totalPaidCents = paidData ? paidData.reduce((sum, p) => sum + p.amount_cents, 0) : 0;

        // Récupérer l'IBAN
        const { data: bank } = await supabase.from('bank_accounts').select('*').eq('user_id', user.id).single();

        const remainingCents = totalEarnedCents - totalPaidCents;

        return {
          ...user,
          balance: remainingCents / 100,
          iban: bank?.iban || 'Non renseigné',
          bic: bank?.bic || '-',
          holder: bank?.holder_name || '-'
        };
      }));

      // Filtrer pour ne montrer que ceux qui ont de l'argent à recevoir
      setPendingPayouts(payoutsData.filter((u: any) => u.balance > 0));
    }
    setLoading(false);
  };

  const handlePay = async (userId: string, amount: number) => {
    if (!window.confirm(`Confirmer le virement de ${amount.toFixed(2)} € ?`)) return;
    
    // Enregistrer le virement dans l'historique
    await supabase.from('payouts').insert({
      user_id: userId,
      amount_cents: Math.round(amount * 100),
      status: 'paid'
    });
    
    fetchPayouts(); // Rafraîchir la liste
  };

  const menuItems = [
    { label: "Dashboard", icon: Activity, path: "/admin" },
    { label: "Validations", icon: UserCheck, path: "/admin/approvals" },
    { label: "Finances", icon: CreditCard, path: "/admin/payouts" },
    { label: "Foodiz+", icon: Megaphone, path: "/admin/foodiz-stats" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] flex overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-foodiz-gold/10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <Logo size="md" />
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-foodiz-gray"><X size={24} /></button>
        </div>
        <nav className="px-4 space-y-2 mt-4">
          {menuItems.map((item) => (
            <button key={item.label} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-gray hover:text-foodiz-cream hover:bg-foodiz-gold/5 transition-all">
              <item.icon size={18} className="text-foodiz-gold" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-foodiz-gold/10">
          <button onClick={() => { supabase.auth.signOut(); navigate("/admin-auth"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-foodiz-red hover:bg-foodiz-red/5 transition-all">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-[#0A0A0A]/80 backdrop-blur-md border-b border-foodiz-gold/10 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-foodiz-gold"><Menu size={24} /></button>
            <button onClick={() => navigate("/admin")} className="hidden md:flex items-center gap-2 text-foodiz-gray hover:text-foodiz-cream transition-colors"><ArrowLeft size={18} /> Retour</button>
            <h1 className="foodiz-title text-xl text-foodiz-cream">Dispatch Financier</h1>
          </div>
        </header>

        <main className="p-6 max-w-6xl mx-auto w-full">
          {loading ? <div className="text-center py-20 text-foodiz-gray animate-pulse">Calcul des virements en cours...</div> : (
            <div className="foodiz-card bg-[#0A0A0A] border-foodiz-gold/10 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-foodiz-black/50 text-[10px] uppercase text-foodiz-gray tracking-wider border-b border-foodiz-gold/10">
                  <tr>
                    <th className="p-4">Bénéficiaire</th>
                    <th className="p-4">Rôle</th>
                    <th className="p-4">Coordonnées Bancaires (IBAN)</th>
                    <th className="p-4 text-right">Solde à Payer</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foodiz-gold/5">
                  {pendingPayouts.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-foodiz-gray">Aucun virement en attente. Tout est à jour !</td></tr>
                  ) : (
                    pendingPayouts.map((user) => (
                      <tr key={user.id} className="hover:bg-foodiz-gold/5 transition-colors">
                        <td className="p-4">
                          <p className="text-foodiz-cream font-medium">{user.full_name}</p>
                          <p className="text-xs text-foodiz-gray">{user.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-1 rounded-full border ${user.role === 'partner' ? 'bg-foodiz-gold/10 text-foodiz-gold border-foodiz-gold/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {user.role === 'partner' ? 'PARTENAIRE' : 'LIVREUR'}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.iban !== 'Non renseigné' ? (
                            <div>
                              <p className="text-foodiz-cream text-sm font-mono">{user.iban}</p>
                              <p className="text-[10px] text-foodiz-gray">{user.holder} ({user.bic})</p>
                            </div>
                          ) : (
                            <span className="text-foodiz-red text-xs flex items-center gap-1"><AlertCircle size={12} /> IBAN manquant</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xl font-serif italic text-foodiz-green">{user.balance.toFixed(2)} €</span>
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handlePay(user.id, user.balance)}
                            disabled={user.iban === 'Non renseigné'}
                            className="px-4 py-2 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 hover:bg-foodiz-green/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-bold mx-auto"
                          >
                            <CheckCircle size={14} /> Payer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}