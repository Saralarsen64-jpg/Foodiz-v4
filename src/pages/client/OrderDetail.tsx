import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Star,
  MapPin,
  CheckCircle,
  RotateCcw,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type StoredOrder = {
  id: string;
  restaurant: string;
  date: string;
  time: string;
  status: "in_progress" | "delivered" | "cancelled" | "pending" | "preparing";
  total: number;
  items: number;
  loyaltyPoints: number;
  image: string;
  restaurantCoords?: [number, number];
  clientCoords?: [number, number];
  courier?: { name: string; phone: string };
  deliveryCode?: string;
};

const STORAGE_KEY = "foodiz_client_orders_v1";

function loadOrder(id?: string): StoredOrder | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const orders = JSON.parse(raw) as StoredOrder[];
    return orders.find((o) => o.id === id) || null;
  } catch {
    return null;
  }
}

function formatCoords(coords?: [number, number]): [number, number] {
  return coords && coords.length === 2 ? coords : [48.8566, 2.3522];
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<StoredOrder | null>(() => loadOrder(id));
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    setOrder(loadOrder(id));
  }, [id]);

  const isInProgress = order?.status === "in_progress" || order?.status === "pending" || order?.status === "preparing";

  const statuses = useMemo(() => {
    const base = [
      { key: "confirmed", label: "Confirmée", done: true },
      { key: "preparing", label: "En préparation", done: true },
      { key: "ready", label: "Prête", done: isInProgress },
      { key: "picked_up", label: "Récupérée par le livreur", done: isInProgress },
      { key: "delivering", label: "En livraison", done: isInProgress },
      { key: "delivered", label: "Livrée", done: order?.status === "delivered" },
    ];
    return base;
  }, [isInProgress, order?.status]);

  // Live GPS simulation for courier
  useEffect(() => {
    if (!isInProgress || !mapRef.current || !order) return;

    if (!mapInstanceRef.current) {
      const restaurant = formatCoords(order.restaurantCoords);
      const client = formatCoords(order.clientCoords);
      const center: [number, number] = [(restaurant[0] + client[0]) / 2, (restaurant[1] + client[1]) / 2];

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const restaurantIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#111;border:2px solid #D8A84F;display:flex;align-items:center;justify-content:center;color:#D8A84F;font-size:12px">R</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const clientIcon = L.divIcon({
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#111;border:2px solid #3FA76D;display:flex;align-items:center;justify-content:center;color:#3FA76D;font-size:12px">C</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const courierIcon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#D8A84F;border:2px solid #111;display:flex;align-items:center;justify-content:center;color:#111;font-weight:700">L</div>`,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker(restaurant, { icon: restaurantIcon }).addTo(map).bindPopup(order.restaurant);
      L.marker(client, { icon: clientIcon }).addTo(map).bindPopup("Votre adresse");

      const courier = L.marker(restaurant, { icon: courierIcon }).addTo(map);
      courierMarkerRef.current = courier;

      mapInstanceRef.current = map;
    }

    const restaurant = formatCoords(order.restaurantCoords);
    const client = formatCoords(order.clientCoords);

    let progress = 0;
    const interval = window.setInterval(() => {
      progress = Math.min(1, progress + 0.015);
      const lat = restaurant[0] + (client[0] - restaurant[0]) * progress;
      const lng = restaurant[1] + (client[1] - restaurant[1]) * progress;
      courierMarkerRef.current?.setLatLng([lat, lng]);
      if (progress >= 1) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isInProgress, order]);

  if (!order) {
    return (
      <div className="animate-fade-in-up">
        <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
          <ChevronLeft size={18} /> Mes commandes
        </button>
        <div className="foodiz-card p-6 text-center">
          <p className="text-foodiz-gray">Commande introuvable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/orders")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} />
        Mes commandes
      </button>

      {/* Status */}
      <div className="foodiz-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="foodiz-title text-lg">{order.restaurant}</h1>
            <p className="text-foodiz-gray text-xs mt-0.5">
              Commandé le {order.date} à {order.time}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              order.status === "delivered"
                ? "text-foodiz-green bg-foodiz-green/10"
                : order.status === "cancelled"
                ? "text-red-400 bg-red-400/10"
                : "text-foodiz-gold bg-foodiz-gold/10"
            }`}
          >
            {order.status === "delivered" ? "Livrée" : order.status === "cancelled" ? "Annulée" : "En cours"}
          </span>
        </div>

        <div className="space-y-3">
          {statuses.map((s, i) => (
            <div key={s.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.done ? "bg-foodiz-green" : "bg-foodiz-card border border-foodiz-gold/20"}`}>
                  {s.done ? <CheckCircle size={14} className="text-white" /> : <div className="w-2 h-2 rounded-full bg-foodiz-gold/30" />}
                </div>
                {i < statuses.length - 1 && (
                  <div className={`w-0.5 h-8 ${s.done ? "bg-foodiz-green/30" : "bg-foodiz-gold/10"}`} />
                )}
              </div>
              <div className="flex-1 pb-2">
                <p className={`text-sm ${s.done ? "text-foodiz-cream" : "text-foodiz-gray"}`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Map - only for in-progress */}
      {isInProgress && (
        <div className="foodiz-card p-0 mb-6 overflow-hidden">
          <div className="p-4 border-b border-foodiz-gold/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoldIcon icon={MapPin} size={16} />
              <h3 className="foodiz-title text-sm">Suivi en direct</h3>
            </div>
            <span className="text-[10px] text-foodiz-gold bg-foodiz-gold/10 px-2 py-1 rounded-full">LIVE GPS</span>
          </div>
          <div ref={mapRef} className="w-full h-56" />
          <div className="p-4 flex items-center justify-between">
            <div className="text-xs text-foodiz-gray">
              Livreur : <span className="text-foodiz-cream">{order.courier?.name || "En cours d'attribution"}</span>
            </div>
            {order.courier?.phone && (
              <a
                href={`tel:${order.courier.phone}`}
                className="text-foodiz-gold text-xs font-medium border border-foodiz-gold/30 rounded-full px-3 py-1.5 hover:border-foodiz-gold/50 transition-all flex items-center gap-1"
              >
                <Phone size={12} /> Appeler le livreur
              </a>
            )}
          </div>
        </div>
      )}

      {/* Delivery code (client only) */}
      {isInProgress && order.deliveryCode && (
        <div className="foodiz-card p-5 mb-6 border-foodiz-gold/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gold/15 border border-foodiz-gold/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-foodiz-gold" />
            </div>
            <div className="flex-1">
              <h3 className="foodiz-title text-sm">Code de livraison</h3>
              <p className="text-foodiz-gray text-xs mt-1">
                Communiquez ce code uniquement au livreur à l’arrivée pour valider la remise.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-foodiz-gold/25">
                <span className="tracking-[0.35em] text-foodiz-gold font-mono text-lg">{order.deliveryCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="foodiz-card p-5 mb-6">
        <h3 className="foodiz-title text-sm mb-4">Articles</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foodiz-cream">Commande #{order.id}</span>
            <span className="text-sm text-foodiz-gold">{order.total.toFixed(2).replace(".", ",")} €</span>
          </div>
        </div>
        <div className="border-t border-foodiz-gold/10 mt-4 pt-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-foodiz-cream">Total</span>
          <span className="text-foodiz-gold font-bold">{order.total.toFixed(2).replace(".", ",")} €</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-foodiz-gold/60 text-[10px]">
          <Star size={10} />
          <span>+{order.loyaltyPoints} points Foodiz gagnés</span>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="foodiz-card p-5 mb-6">
        <h3 className="foodiz-title text-sm mb-4">Livraison</h3>
        <div className="flex items-start gap-3">
          <GoldIcon icon={MapPin} size={16} />
          <div>
            <p className="text-sm text-foodiz-cream">Adresse de livraison</p>
            <p className="text-[10px] text-foodiz-gray">Suivi GPS disponible pendant la livraison</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/client/restaurants")}
          className="flex-1 foodiz-btn-outline !py-3 text-xs flex items-center justify-center gap-2"
        >
          <RotateCcw size={14} /> Recommander
        </button>
        <button
          onClick={() => navigate(`/client/orders/${order.id}/review`)}
          className="flex-1 foodiz-btn-outline !py-3 text-xs flex items-center justify-center gap-2"
        >
          <MessageCircle size={14} /> Noter
        </button>
      </div>
    </div>
  );
}
