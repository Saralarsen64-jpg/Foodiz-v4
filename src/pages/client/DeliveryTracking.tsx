import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { ChevronLeft, Phone, MapPin, Clock, CheckCircle, Loader } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import { getClientOrderCourierContact } from "../../lib/orderContacts";

const courierIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const restaurantIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const clientIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function DeliveryTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [courier, setCourier] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [deliveryCode, setDeliveryCode] = useState("");

  // Subscribe to real-time updates
  useEffect(() => {
    if (!orderId) return;

    const loadData = async () => {
      try {
        // Charger la commande
        const { data: orderData } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (!orderData) {
          toast.error("Commande non trouvée");
          navigate("/client/orders");
          return;
        }

        setOrder(orderData);

        // Charger le suivi de livraison
        const { data: trackingData } = await supabase
          .from("delivery_tracking")
          .select("*")
          .eq("order_id", orderId)
          .single();

        if (trackingData) {
          setTracking(trackingData);

          // Charger les infos du livreur
          setCourier(await getClientOrderCourierContact(orderId));
        }

        // Charger le restaurant
        const { data: restaurantData } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", orderData.restaurant_id)
          .single();

        setRestaurant(restaurantData);

        // Charger le client
        const { data: clientData } = await supabase
          .from("profiles")
          .select("id,latitude,longitude")
          .eq("id", orderData.client_id)
          .single();

        setClient(clientData);

        const { data: codeData } = await supabase
          .from("client_delivery_codes")
          .select("code")
          .eq("order_id", orderId)
          .maybeSingle();
        setDeliveryCode(codeData?.code || "");

        setLoading(false);
      } catch (err) {
        console.error("Erreur chargement tracking:", err);
        toast.error("Erreur lors du chargement du suivi");
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel(`delivery_tracking:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_tracking",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setTracking(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, navigate]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "En attente",
      preparing: "En préparation",
      ready: "Prête au restaurant",
      pickup: "Livreur assigné",
      accepted: "Acceptée",
      at_restaurant: "Livreur au restaurant",
      picked_up: "Récupérée",
      in_transit: "En route",
      at_customer: "Livreur arrivé",
      delivered: "Livrée",
      cancelled: "Annulée",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-foodiz-gray",
      preparing: "bg-foodiz-gold",
      ready: "bg-foodiz-gold",
      pickup: "bg-foodiz-gold",
      accepted: "bg-blue-500",
      at_restaurant: "bg-foodiz-gold",
      picked_up: "bg-yellow-500",
      in_transit: "bg-foodiz-gold",
      at_customer: "bg-foodiz-green",
      delivered: "bg-foodiz-green",
      cancelled: "bg-foodiz-red",
    };
    return colors[status] || "bg-foodiz-gray";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-foodiz-black flex items-center justify-center">
        <Loader size={32} className="text-foodiz-gold animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-foodiz-black p-6">
        <div className="max-w-lg mx-auto text-center pt-20">
          <p className="text-foodiz-gray">Commande non trouvée</p>
        </div>
      </div>
    );
  }

  const visualStatus = tracking?.status || order.status || "pending";
  const staticPreparationStatus = ["pending", "preparing", "ready"].includes(order.status);

  return (
    <div className="min-h-screen bg-foodiz-black">
      {/* Header */}
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg flex-1">Suivi de Livraison</h1>
        </div>
      </header>

      {/* Map */}
      <div className="w-full h-96 bg-foodiz-card border-b border-foodiz-gold/10">
        {tracking && restaurant && client && (
          <MapContainer
            center={[
              tracking.current_latitude || restaurant.latitude || 48.8566,
              tracking.current_longitude || restaurant.longitude || 2.3522,
            ]}
            zoom={14}
            className="w-full h-full"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Restaurant */}
            {restaurant.latitude && restaurant.longitude && (
              <Marker position={[restaurant.latitude, restaurant.longitude]} icon={restaurantIcon}>
                <Popup>{restaurant.name}</Popup>
              </Marker>
            )}

            {/* Courier */}
            {tracking.current_latitude && tracking.current_longitude && (
              <Marker position={[tracking.current_latitude, tracking.current_longitude]} icon={courierIcon}>
                <Popup>{courier?.first_name} {courier?.last_name}</Popup>
              </Marker>
            )}

            {/* Client */}
            {client.latitude && client.longitude && (
              <Marker position={[client.latitude, client.longitude]} icon={clientIcon}>
                <Popup>Votre adresse de livraison</Popup>
              </Marker>
            )}
          </MapContainer>
        )}
        {(!tracking || !restaurant || !client) && staticPreparationStatus && (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(216,168,79,.16),transparent_42%),#0a0a0a] p-6 text-center">
            <div className="max-w-sm rounded-[2rem] border border-foodiz-gold/20 bg-black/35 p-6">
              <p className="text-[10px] font-black uppercase tracking-[.24em] text-foodiz-gold">Suivi statique</p>
              <h2 className="foodiz-title mt-3 text-2xl text-foodiz-cream">La commande se prépare</h2>
              <p className="mt-3 text-sm leading-relaxed text-foodiz-gray">
                La carte GPS s’activera après récupération par le livreur.
                Pour l’instant, Foodiz suit l’état restaurant.
              </p>
            </div>
          </div>
        )}
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-20">
        {deliveryCode && tracking?.status !== "delivered" && (
          <div className="foodiz-card p-5 text-center border-foodiz-gold/30 bg-foodiz-gold/5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-foodiz-gold">Code à remettre au livreur</p>
            <p className="text-3xl font-mono tracking-[0.35em] text-foodiz-cream font-bold mt-3">{deliveryCode}</p>
            <p className="text-xs text-foodiz-gray mt-3">Ne communiquez ce code qu’une fois la commande reçue.</p>
          </div>
        )}
        {/* Status */}
        <div className="foodiz-card p-6 text-center">
          <div className={`inline-block ${getStatusColor(visualStatus)} rounded-full px-4 py-2 mb-4`}>
            <p className="text-white text-sm font-bold">{getStatusLabel(visualStatus)}</p>
          </div>
          <h2 className="foodiz-title text-2xl text-foodiz-cream mb-2">Commande #{orderId?.slice(0, 8)}</h2>
          {tracking?.estimated_arrival_at && (
            <p className="text-foodiz-gray text-sm">
              Arrivée estimée: {new Date(tracking.estimated_arrival_at).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Courier Info */}
        {courier && tracking?.status !== "pending" && (
          <div className="foodiz-card p-4 flex items-start gap-4 border-foodiz-gold/20">
            <div className="w-12 h-12 rounded-full bg-foodiz-gold/20 flex items-center justify-center shrink-0">
              <span className="text-foodiz-gold font-bold">{courier.first_name?.[0]}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-foodiz-cream font-bold">{courier.first_name} {courier.last_name}</h3>
              <p className="text-foodiz-gray text-sm mb-3">Votre livreur</p>
              {courier.phone && (
                <a href={`tel:${courier.phone}`} className="flex items-center gap-2 text-foodiz-gold text-sm hover:underline">
                  <Phone size={14} />
                  {courier.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="foodiz-card p-4 space-y-4">
          <h3 className="foodiz-title text-sm">Évolution</h3>

          {[
            { status: "accepted", label: "Acceptée", time: tracking?.pickup_at },
            { status: "picked_up", label: "Récupérée au restaurant", time: tracking?.pickup_at },
            { status: "in_transit", label: "En route vers vous", time: undefined },
            { status: "delivered", label: "Livrée", time: tracking?.actual_delivery_at },
          ].map((step, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    ["pending", "accepted", "picked_up", "in_transit", "delivered"].includes(tracking?.status || "pending") &&
                    ["pending", "accepted", "picked_up", "in_transit", "delivered"].indexOf(tracking?.status || "pending") >=
                      ["pending", "accepted", "picked_up", "in_transit", "delivered"].indexOf(step.status)
                      ? "bg-foodiz-gold border-foodiz-gold"
                      : "border-foodiz-gold/30"
                  }`}
                />
                {idx < 3 && <div className="w-0.5 h-8 bg-foodiz-gold/20 mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-foodiz-cream text-sm font-medium">{step.label}</p>
                {step.time && (
                  <p className="text-foodiz-gray text-xs">
                    {new Date(step.time).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Address */}
        <div className="foodiz-card p-4 flex items-start gap-4">
          <MapPin size={18} className="text-foodiz-gold mt-1 shrink-0" />
          <div>
            <h3 className="text-foodiz-cream font-bold text-sm">Adresse de livraison</h3>
            <p className="text-foodiz-gray text-sm mt-2">{order.delivery_address}</p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="foodiz-card p-4 space-y-2">
          <h3 className="foodiz-title text-sm">Résumé de la commande</h3>
          <div className="flex justify-between text-sm py-2 border-b border-foodiz-gold/10">
            <span className="text-foodiz-gray">Montant total</span>
            <span className="text-foodiz-cream font-bold">{(order.final_client_total_cents / 100).toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm py-2">
            <span className="text-foodiz-gray">Frais de livraison</span>
            <span className="text-foodiz-cream">{(order.delivery_fee_cents / 100).toFixed(2)}€</span>
          </div>
        </div>

        {/* Help */}
        {tracking?.status !== "delivered" && (
          <button className="w-full foodiz-card p-4 text-left hover:bg-foodiz-gold/5 transition-colors">
            <p className="text-foodiz-cream font-bold text-sm">Une question ou un problème ?</p>
            <p className="text-foodiz-gray text-xs mt-1">Contactez notre support 24/7</p>
          </button>
        )}
      </main>
    </div>
  );
}
