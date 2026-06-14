import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Package, Gift, AlertCircle, Sparkles, Bell } from "lucide-react";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Récupère les VRAIES notifications de la base de données au lieu du localStorage
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) setNotifs(data);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, []);

  const handleRead = async (id: string, link: string) => {
    // Marque la notification comme lue dans la base de données
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch('/api/track-marketing-notification', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` }, body: JSON.stringify({ notificationId: id }) }).catch(() => null);
    if (link) navigate(link);
  };

  const getIcon = (type: string, isRead: boolean) => {
    if (!isRead) return Bell; // Affiche une cloche si non lu pour attirer l'attention
    switch(type) {
      case 'order': return Package;
      case 'gift': return Gift;
      case 'marketing': return Sparkles;
      case 'support_reply': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <div className="animate-fade-in-up min-h-screen bg-foodiz-black pb-24">
      <div className="max-w-lg mx-auto px-6 pt-12">
        <button onClick={() => navigate("/client")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Retour</button>
        <h1 className="foodiz-title text-2xl mb-6 text-foodiz-cream">Notifications</h1>
        
        {loading ? (
          <div className="text-center py-10 text-foodiz-gray animate-pulse">Chargement...</div>
        ) : notifs.length === 0 ? (
          <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
            <Bell size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
            <p className="text-foodiz-cream text-lg font-medium mb-2">Tout est calme</p>
            <p className="text-foodiz-gray text-sm">Aucune nouvelle notification.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifs.map((n: any) => {
              const Icon = getIcon(n.type, n.is_read);
              return (
                <div 
                  key={n.id} 
                  onClick={() => n.link && handleRead(n.id, n.link)}
                  className={`foodiz-card p-4 flex gap-4 items-start cursor-pointer transition-all ${n.is_read ? 'bg-[#0A0A0A] opacity-70' : 'bg-foodiz-gold/5 border-foodiz-gold/30'}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? 'bg-foodiz-black text-foodiz-gray' : 'bg-foodiz-gold text-foodiz-black'}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className={`text-sm font-medium ${n.is_read ? 'text-foodiz-gray' : 'text-foodiz-cream'}`}>{n.title}</h3>
                      <span className="text-[10px] text-foodiz-gray">{formatTime(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-foodiz-gray mt-1">{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
