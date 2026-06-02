import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Users, Crown, AlertTriangle } from "lucide-react";

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [topReferrers, setTopReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Récupérer les parrainages avec les emails
      const { data: refData } = await supabase
        .from('referrals')
        .select('parrain_id, filleul_id, created_at, profiles_parrain:profiles!referrals_parrain_id_fkey(full_name, email), profiles_filleul:profiles!referrals_filleul_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });
      
      if (refData) setReferrals(refData);

      // Récupérer les top parrains (ceux qui ont 1000+)
      const { data: topData } = await supabase
        .from('profiles')
        .select('full_name, email, referral_count')
        .gte('referral_count', 1000)
        .order('referral_count', { ascending: false });
      
      if (topData) setTopReferrers(topData);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Parrainages & VIP</h1>
      <p className="text-foodiz-gray text-sm mb-8">Suivi des ambassadeurs Foodiz.</p>

      {/* Alerte VIP 1000 Parrainages */}
      {topReferrers.length > 0 && (
        <div className="mb-10 foodiz-card p-6 bg-gradient-to-r from-foodiz-gold/20 to-foodiz-card border border-foodiz-gold/40">
          <div className="flex items-center gap-4 mb-4 text-foodiz-gold">
            <Crown size={32} />
            <h2 className="text-xl font-bold">Ambassadeurs VIP Détectés (1000+ Parrainages)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topReferrers.map((user, idx) => (
              <div key={idx} className="bg-foodiz-black p-4 rounded-xl border border-foodiz-gold/20 flex items-center justify-between">
                <div>
                  <p className="text-foodiz-cream font-bold">{user.full_name}</p>
                  <p className="text-foodiz-gray text-xs">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-foodiz-gold font-bold text-lg">{user.referral_count}</p>
                  <p className="text-[10px] text-foodiz-gray uppercase">Parrainages</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-foodiz-gold text-xs mt-4 flex items-center gap-2"><AlertTriangle size={14} /> Action requise : Contacter ces utilisateurs pour l'Expérience VIP Exclusive.</p>
        </div>
      )}

      <h2 className="foodiz-title text-xl text-foodiz-cream mb-4">Historique des Parrainages</h2>
      {loading ? <div className="text-foodiz-gray animate-pulse">Chargement...</div> : (
        <div className="foodiz-card bg-[#0A0A0A] border-foodiz-gold/10 overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm text-foodiz-gray">
            <thead className="bg-foodiz-black text-foodiz-gold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Parrain</th>
                <th className="px-6 py-4">Filleul</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foodiz-gold/10">
              {referrals.map((ref, idx) => (
                <tr key={idx} className="hover:bg-foodiz-gold/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-foodiz-cream font-medium">{ref.profiles_parrain?.full_name}</p>
                    <p className="text-[10px]">{ref.profiles_parrain?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-foodiz-cream font-medium">{ref.profiles_filleul?.full_name}</p>
                    <p className="text-[10px]">{ref.profiles_filleul?.email}</p>
                  </td>
                  <td className="px-6 py-4">{new Date(ref.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-6 py-4"><span className="text-foodiz-green text-xs font-bold">Validé (+500pts)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}