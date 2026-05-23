import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  Bike,
  Store,
  Home,
  Copy,
  Check,
} from "lucide-react";

type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "picked_up" | "delivering" | "delivered";

function generateDeliveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const STATUS_STEPS: { key: OrderStatus; label: string; icon: any }[] = [
  { key: "pending", label: "En attente", icon: Clock },
  { key: "accepted", label: "Confirmée", icon: CheckCircle },
  { key: "preparing", label: "En préparation", icon: Store },
  { key: "ready", label: "Prête", icon: CheckCircle },
  { key: "picked_up", label: "Récupérée", icon: Bike },
  { key: "delivering", label: "En livraison", icon: Bike },
  { key: "delivered", label: "Livrée", icon: Home },
];

export default function OrderTrackingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [status, setStatus] = useState<OrderStatus>("preparing");
  const [eta, setEta] = useState(25);
  const [deliveryCode] = useState(() => {
    const saved = localStorage.getItem(`order_${id}_code`);
    return saved || generateDeliveryCode();
  });
  const [codeCopied, setCodeCopied] = useState(false);
  const [courier] = useState({
    name: "Karim B.",
    phone: "+33 6 12 34 56 78",
    rating: 4.9,
    vehicle: "Scooter",
  });

  useEffect(() => {
    if (!localStorage.getItem(`order_${id}_code`)) {
      localStorage.setItem(`order_${id}_code`, deliveryCode);
    }
  }, [id, deliveryCode]);

  useEffect(() => {
    const statusSequence: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "picked_up", "delivering", "delivered"];
    let currentIndex = 2;

    const statusInterval = setInterval(() => {
      if (currentIndex < statusSequence.length - 1) {
        currentIndex++;
        setStatus(statusSequence[currentIndex]);
      }
    }, 8000);

    const etaInterval = setInterval(() => {
      setEta((prev) => Math.max(5, prev - 1));
    }, 60000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(etaInterval);
    };
  }, []);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="animate-fade-in-up pb-24">
      <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="mb-6">
        <h1 className="foodiz-title text-2xl mb-2">Suivi de commande</h1>
        <p className="text-foodiz-gray text-xs">Commande #{id?.slice(0, 8)}</p>
      </div>

      {/* Live Map */}
      <div className="foodiz-card mb-6 overflow-hidden relative h-64 bg-foodiz-card border-foodiz-gold/20">
        <div className="absolute inset-0 bg-gradient-to-br from-foodiz-black via-foodiz-dark to-foodiz-black" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-foodiz-gold" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-foodiz-gold" />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-foodiz-gold" />
          <div className="absolute left-1/4 top-0 bottom-0 w-px bg-foodiz-gold" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-foodiz-gold" />
          <div className="absolute left-3/4 top-0 bottom-0 w-px bg-foodiz-gold" />
        </div>
        <div className="absolute top-1/3 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/20 border-2 border-foodiz-gold flex items-center justify-center">
            <Store size={18} className="text-foodiz-gold" />
          </div>
        </div>
        <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/20 border-2 border-foodiz-gold flex items-center justify-center">
            <Home size={18} className="text-foodiz-gold" />
          </div>
        </div>
        <div className={`absolute transition-all duration-1000 ease-in-out ${status === "delivering" ? "top-1/2 left-1/2" : "top-1/3 left-1/4"}`}>
          <div className="w-12 h-12 rounded-full bg-foodiz-gold border-2 border-foodiz-cream flex items-center justify-center shadow-lg shadow-foodiz-gold/40 animate-pulse">
            <Bike size={20} className="text-foodiz-black" />
          </div>
        </div>
        <div className="absolute top-4 right-4 foodiz-card px-4 py-2 border-foodiz-gold/30">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-foodiz-gold" />
            <span className="text-foodiz-gold font-bold">{eta} min</span>
          </div>
        </div>
      </div>

      {/* Delivery Code */}
      <div className="foodiz-card p-5 mb-6 border-foodiz-gold/30 bg-gradient-to-br from-foodiz-gold/10 to-foodiz-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="foodiz-title text-sm">Code de livraison</h2>
          <span className="text-[10px] text-foodiz-gray">À donner au livreur</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-foodiz-gold/20 border-2 border-foodiz-gold flex items-center justify-center">
              <CheckCircle size={20} className="text-foodiz-gold" />
            </div>
            <div>
              <p className="text-[10px] text-foodiz-gray">Votre code unique</p>
              <p className="text-2xl font-bold font-mono text-foodiz-gold tracking-wider">{deliveryCode}</p>
            </div>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(deliveryCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }} className="w-12 h-12 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-gold/20 transition-all">
            {codeCopied ? <Check size={18} className="text-foodiz-green" /> : <Copy size={18} className="text-foodiz-gold" />}
          </button>
        </div>
      </div>

      {/* Courier Info */}
      <div className="foodiz-card p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-foodiz-gradient-gold border-2 border-foodiz-gold/30 flex items-center justify-center">
            <span className="text-foodiz-gold font-serif font-bold text-lg">{courier.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">{courier.name}</h3>
            <p className="text-[11px] text-foodiz-gray">{courier.vehicle} · ⭐ {courier.rating}</p>
          </div>
          <div className="flex gap-2">
            <a href={`tel:${courier.phone}`} className="w-10 h-10 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-gold/20 transition-all"><Phone size={16} className="text-foodiz-gold" /></a>
            <a href={`sms:${courier.phone}`} className="w-10 h-10 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/30 flex items-center justify-center hover:bg-foodiz-gold/20 transition-all"><MessageCircle size={16} className="text-foodiz-gold" /></a>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="foodiz-card p-5 mb-6">
        <h2 className="foodiz-title text-sm mb-4">Statut de la commande</h2>
        <div className="space-y-4">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isCompleted ? "bg-foodiz-green" : isCurrent ? "bg-foodiz-gold" : "bg-foodiz-card border border-foodiz-gold/20"}`}>
                  <Icon size={14} className={isCompleted ? "text-white" : isCurrent ? "text-foodiz-black" : "text-foodiz-gold/30"} />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className={`text-sm ${isCompleted || isCurrent ? "text-foodiz-cream" : "text-foodiz-gray/50"}`}>{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
