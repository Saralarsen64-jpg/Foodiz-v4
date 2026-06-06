import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, MapPin, Loader } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../lib/supabase";
import { createOrder } from "../../lib/orders";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, establishmentId, clearCart, totalPoints } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'review' | 'success'>('review');
  const [userPoints, setUserPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(true);

  const DELIVERY_FEE_CENTS = 250;  // 2.50€
  const SERVICE_FEE_PERCENT = 0.15; // 15%

  const subtotalCents = Math.round(subtotal * 100);
  const serviceFeesCents = Math.round(subtotalCents * SERVICE_FEE_PERCENT);
  const totalBeforePointsCents = subtotalCents + serviceFeesCents + DELIVERY_FEE_CENTS;
  
  // Calcul de la réduction en points (1 point = 0.01€)
  const pointsReductionCents = usePoints ? Math.min(userPoints, totalBeforePointsCents) : 0;
  const finalTotalCents = totalBeforePointsCents - pointsReductionCents;

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
          .select('address, postal_code, city')
          .eq('id', user.id)
          .single();

        if (profile) {
          const addr = [profile.address, profile.postal_code, profile.city]
            .filter(Boolean)
            .join(', ');
          setDeliveryAddress(addr || 'Adresse non enregistrée');
        }

        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement données:', err);
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleConfirmOrder = async () => {
    if (!establishmentId || items.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non trouvé");

      // Créer les items pour la commande
      const orderItems = items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        unitPriceCents: Math.round(item.price * 100),
      }));

      // Créer la commande
      const orderId = await createOrder({
        clientId: user.id,
        restaurantId: establishmentId,
        items: orderItems,
        deliveryAddress: deliveryAddress,
      });

      // Déduire les points si utilisés
      if (usePoints && pointsReductionCents > 0) {
        const newBalance = Math.max(0, userPoints - pointsReductionCents);
        await supabase
          .from('client_wallets')
          .update({ points_balance: newBalance })
          .eq('user_id', user.id);
      }

      // Vider le panier
      clearCart();
      
      // Afficher le succès
      setStep('success');
      
      // Redirection automatique après 3 secondes
      setTimeout(() => navigate(`/client/orders/${orderId}`), 3000);

    } catch (err: any) {
      console.error("Erreur création commande:", err);
      toast.error(err.message || "Erreur lors de la création de la commande");
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

          <div className="space-y-2 pt-3 border-t border-foodiz-gold/10">
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Sous-total</span>
              <span className="text-foodiz-cream">{subtotal.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Frais de service</span>
              <span className="text-foodiz-cream">{(serviceFeesCents / 100).toFixed(2)}€</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-foodiz-gray">Livraison</span>
              <span className="text-foodiz-cream">{(DELIVERY_FEE_CENTS / 100).toFixed(2)}€</span>
            </div>

            {usePoints && pointsReductionCents > 0 && (
              <div className="flex justify-between text-xs text-foodiz-green">
                <span>Réduction points</span>
                <span>-{(pointsReductionCents / 100).toFixed(2)}€</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-bold pt-2 border-t border-foodiz-gold/20">
              <span className="text-foodiz-cream">TOTAL</span>
              <span className="text-foodiz-gold">{(finalTotalCents / 100).toFixed(2)}€</span>
            </div>
          </div>
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
                Réduction: {(pointsReductionCents / 100).toFixed(2)}€
              </p>
            </div>
          </div>
        )}

        {/* Bouton validation */}
        <button
          onClick={handleConfirmOrder}
          disabled={isProcessing}
          className="w-full foodiz-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader size={18} className="animate-spin" />
              Création en cours...
            </>
          ) : (
            `Confirmer ma commande ${(finalTotalCents / 100).toFixed(2)}€`
          )}
        </button>
      </main>
    </div>
  );
}