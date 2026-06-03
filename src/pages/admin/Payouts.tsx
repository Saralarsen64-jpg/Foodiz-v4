import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { CheckCircle, Clock, AlertCircle, Euro } from "lucide-react";

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayouts = async () => {
      // Ici, on récupérera plus tard les vraies demandes de virement des partenaires
      // Pour l'instant, la liste est vide car nous avons nettoyé la base de données.
      setPayouts([]); 
      setLoading(false);
    };
    fetchPayouts();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Virements & Paiements</h1>
          <p className="text-foodiz-gray text-sm">Gestion des reversions aux partenaires et livreurs.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20 text-foodiz-gold">
          <Euro size={18} />
          <span className="font-bold">Connecté en tant que Admin</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-foodiz-gray animate-pulse">Chargement des virements...</div>
      ) : payouts.length === 0 ? (
        <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
          <CheckCircle size={48} className="mx-auto text-foodiz-green/20 mb-4" />
          <h3 className="text-foodiz-cream text-lg font-medium mb-2">Tout est à jour !</h3>
          <p className="text-foodiz-gray text-sm">Aucun virement en attente de traitement pour le moment.</p>
        </div>
      ) : (
        <div className="foodiz-card bg-[#0A0A0A] border-foodiz-gold/10 overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm text-foodiz-gray">
            <thead className="bg-foodiz-black text-foodiz-gold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Bénéficiaire</th>
                <th className="px-6 py-4">Montant</th>
                <th className="px-6 py-4">Date de demande</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foodiz-gold/10">
              {/* Les vraies données s'afficheront ici */}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}