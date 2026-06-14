import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, MapPin, Loader } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";
import { calculateDistance } from "../../lib/orders";
import { calculateFoodizOrder } from "../../lib/engines/foodizEconomicEngine";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, establishmentId, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'success'>('review');
  const [userPoints, setUserPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [distanceKm, setDistanceKm] = useState(2.0);
  const [orderBreakdown, setOrderBreakdown] = useState<any>(null);
  const [restaurantData, setRestaurantData] = useState<any>(null);
  const pointsReductionCents =
    orderBreakdown && usePoints
      ? Math.min(userPoints, orderBreakdown.finalClientTotalCents)
      : 0;

  // Charger les données et calculer les montants
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Veuillez vous connecter");
          navigate("/auth/login?role=client");
          return;
        }

        // Récupérer la wallet et les points
        const { data: wallet } = await supabase
          .from('client_wallets')
          .select('points_balance')
          .eq('user_id', user.id)
          .single();
        setUserPoints(wallet?.points_balance || 0);

        // Récupérer l'adresse de livraison
        const { data: profile } = await supabase
          .from('profiles')
          .select('address, postal_code, city, latitude, longitude')
          .eq('id', user.id)
          .single();

        if (profile) {
          const addr = [profile.address, profile.postal_code, profile.city]
            .filter(Boolean)
            .join(', ');
          setDeliveryAddress(addr || 'Adresse non enregistrée');

          // Récupérer les données du restaurant pour distance
          if (establishmentId) {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('id, name, latitude, longitude, owner_id')
              .eq('id', establishmentId)
              .single();

            if (restaurant) {
              setRestaurantData(restaurant);
              
              // Calculer la distance
              if (profile.latitude && profile.longitude && restaurant.latitude && restaurant.longitude) {
                const distance = calculateDistance(
                  profile.latitude,
                  profile.longitude,
                  restaurant.latitude,
                  restaurant.longitude
                );
                setDistanceKm(distance);
              }
            }
          }
        }

        // Récupérer les vrais prix des produits pour le calcul
        if (items.length > 0 && establishmentId) {
          const productIds = items.map(item => item.id);
          const { data: products } = await supabase
            .from('products')
            .select('id, partner_price_cents')
            .in('id', productIds)
            .eq('restaurant_id', establishmentId);

          if (products) {
            // Construire les items pour le calcul avec les vrais prix partenaire
            const itemsForCalculation = items.flatMap(cartItem => {
              const product = products.find(p => p.id === cartItem.id);
              return Array(cartItem.quantity).fill({
                partnerPriceCents: product?.partner_price_cents || Math.round(cartItem.price * 100),
              });
            });

            // Calculer le breakdown économique
            const breakdown = calculateFoodizOrder(itemsForCalculation, distanceKm);
            setOrderBreakdown(breakdown);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement données:', err);
        toast.error('Erreur lors du chargement des données');
        setLoading(false);
      }
    };

    loadData();
  }, [establishmentId, items, navigate, distanceKm]);

  const handleConfirmOrder = async () => {
    if (!establishmentId || items.length === 0 || !orderBreakdown) {
      toast.error("Le panier est vide ou les données ne sont pas chargées");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Utilisateur non trouvé");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          restaurantId: establishmentId,
          deliveryAddress,
          usePoints,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const checkout = await response.json();
      if (!response.ok) {
        throw new Error(checkout.error || "Impossible de créer le paiement");
      }

      clearCart();
      window.location.assign(checkout.url);

    } catch (err: any) {
      console.error("Erreur création commande:", err);
      toast.error(err.message || "Erreur lors de la création du paiement");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-foodiz-black flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="text-foodiz-gold animate-spin mx-auto mb-4" />
          <p className="text-foodiz-gray">Chargement...</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-foodiz-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-foodiz-green/10 flex items-center justify-center mb-6 border border-foodiz-green/30">
          <CheckCircle size={48} className="text-foodiz-green" />
        </div>
        <h1 className="foodiz-title text-3xl text-foodiz-cream mb-2">Commande Confirmée !</h1>
        <p className="text-foodiz-gray mb-8">Le restaurant prépare votre commande. Un livreur sera assigné sous peu.</p>
        <p className="text-foodiz-gold text-sm">Redirection vers le suivi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-foodiz-black pb-24">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg flex-1">Paiement</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Adresse de livraison */}
        <div className="foodiz-card p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-foodiz-gold/10 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-foodiz-gold" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foodiz-cream">Adresse de livraison</h3>
            <p className="text-xs text-foodiz-gray mt-2">{deliveryAddress}</p>
            <button 
              onClick={() => navigate("/client/account/addresses")}
              className="text-[10px] text-foodiz-gold mt-2 hover:underline"
            >
              Modifier l'adresse
            </button>
          </div>
        </div>

        {/* Résumé commande */}
        <div className="foodiz-card p-4 space-y-3 border-foodiz-gold/20">
          <h3 className="foodiz-title text-sm">Résumé de votre commande</h3>
          
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-xs text-foodiz-gray py-2 border-b border-foodiz-gold/10">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-foodiz-cream">{(item.price * item.quantity).toFixed(2)}€</span>
            </div>
          ))}

          {orderBreakdown && (
            <div className="space-y-2 pt-3 border-t border-foodiz-gold/10">
              <div className="flex justify-between text-xs">
                <span className="text-foodiz-gray">Prix articles</span>
                <span className="text-foodiz-cream">{(orderBreakdown.partnerTotalCents / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-foodiz-gray">Frais de service</span>
                <span className="text-foodiz-cream">{(orderBreakdown.serviceFeeCents / 100).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-foodiz-gray">Livraison ({distanceKm.toFixed(1)}km)</span>
                <span className="text-foodiz-cream">{(orderBreakdown.deliveryFeeCents / 100).toFixed(2)}€</span>
              </div>

              {usePoints && userPoints > 0 && (
                <div className="flex justify-between text-xs text-foodiz-green">
                  <span>Réduction points</span>
                  <span>-{Math.min(userPoints, orderBreakdown.finalClientTotalCents) / 100}€</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold pt-2 border-t border-foodiz-gold/20">
                <span className="text-foodiz-cream">TOTAL</span>
                <span className="text-foodiz-gold">
                  {((orderBreakdown.finalClientTotalCents - pointsReductionCents) / 100).toFixed(2)}€
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Points */}
        {userPoints > 0 && (
          <div className="foodiz-card p-4 flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={usePoints}
              onChange={(e) => setUsePoints(e.target.checked)}
              className="w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-black text-foodiz-gold"
            />
            <div className="flex-1">
              <p className="text-xs text-foodiz-cream">Utiliser mes points ({userPoints} points)</p>
              <p className="text-[10px] text-foodiz-gray mt-1">
                Réduction disponible: {(pointsReductionCents / 100).toFixed(2)}€
              </p>
            </div>
          </div>
        )}

        {/* Bouton validation */}
        <button
          onClick={handleConfirmOrder}
          disabled={isProcessing || !orderBreakdown}
          className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader size={18} className="animate-spin" />
              Paiement en cours...
            </>
          ) : orderBreakdown ? (
            `Payer ma commande ${((orderBreakdown.finalClientTotalCents - pointsReductionCents) / 100).toFixed(2)}€`
          ) : (
            'Chargement...'
          )}
        </button>
      </main>
    </div>
  );
}
