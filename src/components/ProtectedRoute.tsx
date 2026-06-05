import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      // 1. On récupère la session actuelle du navigateur
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setStatus('blocked');
        return;
      }

      // 2. VÉRIFICATION DOUBLE SÉCURITÉ :
      // A. Est-ce que l'email est confirmé dans la session Supabase ?
      const isEmailConfirmed = !!session.user.email_confirmed_at;

      // B. Est-ce que le profil est approuvé dans la base de données ?
      let isProfileApproved = false;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', session.user.id)
          .single();
        if (profile?.is_approved) {
          isProfileApproved = true;
        }
      } catch (e) {
        console.warn("Vérification DB ignorée, on se fie à la session.");
      }

      // 3. Si l'un des deux est vrai, on laisse passer !
      if (isEmailConfirmed || isProfileApproved) {
        setStatus('allowed');
      } else {
        // Sinon, on déconnecte proprement et on bloque
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

  // Si bloqué, on renvoie à l'authentification
  if (status === 'blocked') {
    return <Navigate to="/auth" replace />;
  }

  // Si autorisé, on affiche la page demandée (Dashboard, Home, etc.)
  return <Outlet />;
}