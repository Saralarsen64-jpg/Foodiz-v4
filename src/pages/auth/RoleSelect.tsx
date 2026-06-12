import { useNavigate } from "react-router-dom";
import { User, Briefcase, Bike, ChevronRight } from "lucide-react";
import Logo from "../../components/Logo";

export default function RoleSelectPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Effets de bordure dorée */}
      <div className="pointer-events-none fixed top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />
      <div className="pointer-events-none fixed top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-foodiz-gold/20 to-transparent z-50" />

      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>
        
        <h1 className="foodiz-title text-3xl text-foodiz-cream text-center mb-2">Bienvenue sur Foodiz</h1>
        <p className="text-foodiz-gray text-center mb-10 text-sm">L'excellence de la livraison gastronomique. Choisissez votre espace.</p>

        <div className="space-y-4">
          
          {/* Carte CLIENT */}
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/20 rounded-2xl hover:border-foodiz-gold/50 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <User size={24} />
              </div>
              <div>
                <h2 className="foodiz-title text-xl text-foodiz-cream">Espace Client</h2>
                <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Commandez vos plats préférés</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/auth/login?role=client')} className="py-3 rounded-xl border border-foodiz-gold/30 text-foodiz-gold text-xs font-bold hover:bg-foodiz-gold/10 transition-colors">
                Se connecter
              </button>
              <button onClick={() => navigate('/auth/signup?role=client')} className="py-3 rounded-xl bg-foodiz-gold text-foodiz-black text-xs font-bold hover:bg-foodiz-gold/90 transition-colors flex items-center justify-center gap-1">
                S'inscrire <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Carte PARTENAIRE */}
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/20 rounded-2xl hover:border-foodiz-gold/50 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <Briefcase size={24} />
              </div>
              <div>
                <h2 className="foodiz-title text-xl text-foodiz-cream">Espace Partenaire</h2>
                <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Gérez votre restaurant</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/auth/login?role=partner')} className="py-3 rounded-xl border border-foodiz-gold/30 text-foodiz-gold text-xs font-bold hover:bg-foodiz-gold/10 transition-colors">
                Se connecter
              </button>
              <button onClick={() => navigate('/auth/signup?role=partner')} className="py-3 rounded-xl bg-foodiz-gold text-foodiz-black text-xs font-bold hover:bg-foodiz-gold/90 transition-colors flex items-center justify-center gap-1">
                S'inscrire <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Carte LIVREUR */}
          <div className="foodiz-card p-5 bg-[#0A0A0A] border-foodiz-gold/20 rounded-2xl hover:border-foodiz-gold/50 transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold group-hover:bg-foodiz-gold group-hover:text-foodiz-black transition-colors">
                <Bike size={24} />
              </div>
              <div>
                <h2 className="foodiz-title text-xl text-foodiz-cream">Espace Livreur</h2>
                <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Rejoignez la flotte Foodiz</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/auth/login?role=courier')} className="py-3 rounded-xl border border-foodiz-gold/30 text-foodiz-gold text-xs font-bold hover:bg-foodiz-gold/10 transition-colors">
                Se connecter
              </button>
              <button onClick={() => navigate('/auth/signup?role=courier')} className="py-3 rounded-xl bg-foodiz-gold text-foodiz-black text-xs font-bold hover:bg-foodiz-gold/90 transition-colors flex items-center justify-center gap-1">
                S'inscrire <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>
        
        <p className="text-center text-[10px] text-foodiz-gray/40 mt-12">© 2026 Foodiz. Tous droits réservés.</p>
      </div>
    </div>
  );
}