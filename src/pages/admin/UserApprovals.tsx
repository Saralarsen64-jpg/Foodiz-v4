import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, CheckCircle, XCircle, UserCheck } from "lucide-react";

export default function UserApprovals() {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .neq('role', 'client');
    
    if (data) setPendingUsers(data);
    setLoading(false);
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    await supabase
      .from('profiles')
      .update({ is_approved: approve })
      .eq('id', userId);
    
    fetchPendingUsers();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFF8EA] relative border-x-2 border-foodiz-gold/20 p-6">
      <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-foodiz-gold mb-8 hover:underline">
        <ChevronLeft size={20} /> Retour au Dashboard Admin
      </button>

      <h1 className="foodiz-title text-3xl mb-2 flex items-center gap-3">
        <UserCheck className="text-foodiz-gold" /> Validations en attente
      </h1>
      <p className="text-foodiz-gray mb-8">Ces partenaires et livreurs attendent votre approbation.</p>

      {loading ? <p className="text-foodiz-gray">Chargement...</p> : (
        <div className="grid gap-4">
          {pendingUsers.length === 0 ? (
            <div className="foodiz-card p-8 text-center text-foodiz-gray">Aucune demande en attente.</div>
          ) : (
            pendingUsers.map((user) => (
              <div key={user.id} className="foodiz-card p-6 bg-[#0A0A0A] border border-foodiz-gold/10 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foodiz-cream">{user.full_name || "Utilisateur sans nom"}</h3>
                  <p className="text-sm text-foodiz-gray">{user.email} · {user.phone}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase font-bold px-2 py-1 rounded bg-foodiz-gold/10 text-foodiz-gold border border-foodiz-gold/20">
                    {user.role === 'partner' ? 'Restaurateur / Market' : 'Livreur'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleApproval(user.id, false)} className="p-3 rounded-xl bg-foodiz-red/10 text-foodiz-red border border-foodiz-red/20 hover:bg-foodiz-red/20">
                    <XCircle size={24} />
                  </button>
                  <button onClick={() => handleApproval(user.id, true)} className="p-3 rounded-xl bg-foodiz-green/10 text-foodiz-green border border-foodiz-green/20 hover:bg-foodiz-green/20">
                    <CheckCircle size={24} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
