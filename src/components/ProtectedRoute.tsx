import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      // 1. On récupère la session du navigateur
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus('blocked');
        return;
      }

      // 2. VÉRIFICATION ROBUSTE : On va chercher l'info directement dans la base de données
      // Cela contourne le problème de "vieux badge" (JWT cache) du navigateur
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', session.user.id)
        .single();

      // 3. Si le profil existe et est approuvé (is_approved = true), on laisse passer
      if (profile?.is_approved) {
        setStatus('allowed');
      } else {
        // Sinon, on déconnecte et on bloque
        await supabase.auth.signOut();
        setStatus('blocked');
      }
    };
    checkAuth();
  }, []);

  // Pendant la vérification, on affiche un chargement
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Sécurisation de l'accès...</p>
      </div>
    );
  }

  // Si bloqué (pas de session ou compte non approuvé), on renvoie à l'authentification
  if (status === 'blocked') {
    return <Navigate to="/auth" replace />;
  }

  // Si autorisé, on affiche la page demandée (Dashboard, Home, etc.)
  return <Outlet />;
}