import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔒 ProtectedRoute: Je vérifie si tu es connecté...");
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔒 Résultat de la vérification :", session ? "Session trouvée !" : "AUCUNE SESSION (NULL)");
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔒 Changement détecté :", session ? "Tu es connecté !" : "Tu es déconnecté.");
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
        <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
        <p className="text-sm animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  if (!session) {
    console.log("🚫 ACCÈS REFUSÉ : Je te renvoie vers la page de connexion car je ne vois pas de session.");
    return <Navigate to="/auth" replace />;
  }

  console.log("✅ ACCÈS AUTORISÉ : Bienvenue dans ton espace !");
  return <Outlet />;
}