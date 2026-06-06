import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // On vérifie simplement si une session active existe
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si une session existe, l'utilisateur est connecté et son email est confirmé (géré par Supabase Auth au login)
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, []);

  // Pendant la vérification (quelques millisecondes), on affiche un chargement
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  // Si pas de session, on renvoie à la page de connexion
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Si connecté, on affiche la page (Dashboard, Home, etc.)
  return <Outlet />;
}