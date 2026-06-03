import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase traite automatiquement le hash de l'URL (#access_token=...)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        navigate('/auth/login');
        return;
      }

      // Récupérer le rôle pour rediriger vers le bon dashboard
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const role = profile?.role || 'client';

      if (role === 'admin') navigate('/admin');
      else if (role === 'partner') navigate('/partner');
      else if (role === 'courier') navigate('/courier');
      else navigate('/client');
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center text-foodiz-gold">
      <div className="w-16 h-16 rounded-full border-2 border-foodiz-gold/20 border-t-foodiz-gold animate-spin mb-4"></div>
      <p className="text-sm animate-pulse">Confirmation de votre compte Foodiz...</p>
    </div>
  );
}