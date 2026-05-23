import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Package, Gift, AlertCircle, Sparkles } from "lucide-react";

const DEFAULT_NOTIFS = [
  { id: 1, title: "Commande livrée", desc: "Votre commande #9842 a été livrée.", time: "Il y a 2h", type: "order" },
  { id: 2, title: "Avantage débloqué !", desc: "Vous avez débloqué la livraison offerte.", time: "Hier", type: "gift" },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  useEffect(() => {
    const saved = localStorage.getItem('foodiz_client_notifications');
    if (saved) {
      setNotifs(JSON.parse(saved));
    }
  }, []);

  const getIcon = (type: string) => {
    switch(type) {
      case 'order': return Package;
      case 'gift': return Gift;
      case 'marketing': return Sparkles;
      default: return AlertCircle;
    }
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Retour</button>
      <h1 className="foodiz-title text-2xl mb-6">Notifications</h1>
      <div className="space-y-3">
        {notifs.map((n: any) => {
          const Icon = getIcon(n.type);
          return (
            <div key={n.id} className="foodiz-card p-4 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0">
                <Icon size={18} className="text-foodiz-gold" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-medium text-foodiz-cream">{n.title}</h3>
                  <span className="text-[10px] text-foodiz-gray">{n.time}</span>
                </div>
                <p className="text-xs text-foodiz-gray mt-1">{n.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
