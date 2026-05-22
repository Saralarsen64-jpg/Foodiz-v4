import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Package, Gift, MessageCircle, Megaphone } from "lucide-react";
import { loadClientNotifications, type ClientNotification } from "../../utils/marketingStore";

const STATIC_NOTIFICATIONS: ClientNotification[] = [
  { id: "n1", title: "Votre commande est en préparation", text: "Maison K prépare votre commande.", time: "Il y a 3 min", type: "order" },
  { id: "n2", title: "Nouveaux avantages Foodiz", text: "Votre sélection 48h a été renouvelée.", time: "Aujourd'hui", type: "loyalty" },
  { id: "n3", title: "Support Foodiz", text: "Votre conversation d'aide a été mise à jour.", time: "Hier", type: "support" },
];

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ClientNotification[]>(STATIC_NOTIFICATIONS);

  useEffect(() => {
    const refresh = () => {
      const dynamic = loadClientNotifications();
      setNotifications([...dynamic, ...STATIC_NOTIFICATIONS]);
    };

    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const iconFor = (type: string) => {
    if (type === "order") return Package;
    if (type === "loyalty") return Gift;
    if (type === "campaign") return Megaphone;
    return MessageCircle;
  };

  const handleNotificationClick = (item: ClientNotification) => {
    if (item.deepLink) {
      navigate(item.deepLink);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Bell size={20} className="text-foodiz-gold" />
        <h1 className="foodiz-title text-2xl">Notifications</h1>
      </div>

      <div className="space-y-3">
        {notifications.map((item) => {
          const Icon = iconFor(item.type);
          return (
            <button
              key={item.id}
              onClick={() => handleNotificationClick(item)}
              className="w-full foodiz-card p-4 text-left hover:border-foodiz-gold/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/15 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-foodiz-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foodiz-cream font-medium">{item.title}</p>
                  <p className="text-xs text-foodiz-gray mt-1">{item.text}</p>
                  <p className="text-[10px] text-foodiz-gray/60 mt-2">{item.time}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
