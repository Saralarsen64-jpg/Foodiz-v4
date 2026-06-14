import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Send, ChefHat, Bike, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function OrderReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("orders").select("id, client_id, courier_id, status, restaurant:restaurants(name)").eq("id", id).single().then(({ data }) => setOrder(data));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restaurantRating === 0 || (order?.courier_id && courierRating === 0)) {
      alert(order?.courier_id ? "Veuillez noter le restaurant et le livreur." : "Veuillez noter le restaurant.");
      return;
    }

    if (!order || order.status !== "delivered") {
      setError("Cette commande ne peut pas encore être notée.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== order.client_id) {
      setError("Commande introuvable.");
      return;
    }

    const { error: insertError } = await supabase.from("reviews").insert({
      order_id: id,
      client_id: user.id,
      restaurant_rating: restaurantRating,
      courier_rating: order.courier_id ? courierRating : null,
      comment: comment.trim() || null,
    });
    if (insertError) {
      setError(insertError.code === "23505" ? "Vous avez déjà noté cette commande." : "Impossible d'enregistrer votre avis.");
      return;
    }

    setSubmitted(true);
    setTimeout(() => navigate("/client/orders"), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
        <div className="w-20 h-20 bg-foodiz-green/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={48} className="text-foodiz-green" />
        </div>
        <h1 className="foodiz-title text-2xl mb-2">Merci !</h1>
        <p className="text-foodiz-gray">Votre avis a été transmis au restaurant et au livreur.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <h1 className="foodiz-title text-2xl mb-2">Noter ma commande</h1>
      <p className="text-foodiz-gray text-xs mb-8">{order?.restaurant?.name || "Restaurant"}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="foodiz-card p-3 text-foodiz-red border-foodiz-red/20">{error}</div>}
        {/* Restaurant Rating */}
        {order?.courier_id && <div className="foodiz-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 flex items-center justify-center">
              <ChefHat size={20} className="text-foodiz-gold" />
            </div>
            <div>
              <h2 className="foodiz-title text-sm">Le restaurant</h2>
              <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Qualité & Préparation</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRestaurantRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={32}
                  className={star <= restaurantRating ? "text-foodiz-gold fill-foodiz-gold" : "text-foodiz-gray/20"}
                />
              </button>
            ))}
          </div>
        </div>}

        {/* Courier Rating */}
        <div className="foodiz-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gold/10 flex items-center justify-center">
              <Bike size={20} className="text-foodiz-gold" />
            </div>
            <div>
              <h2 className="foodiz-title text-sm">Le livreur</h2>
              <p className="text-[10px] text-foodiz-gray uppercase tracking-widest">Politesse & Rapidité</p>
            </div>
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setCourierRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={32}
                  className={star <= courierRating ? "text-foodiz-gold fill-foodiz-gold" : "text-foodiz-gray/20"}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="foodiz-card p-6">
          <h2 className="foodiz-title text-sm mb-4">Un commentaire ?</h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Laissez un message (optionnel)..."
            className="w-full min-h-[100px] bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl p-4 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold/30 transition-all resize-none"
          />
        </div>

        <button type="submit" className="w-full foodiz-btn py-4 flex items-center justify-center gap-2">
          <Send size={18} />
          Envoyer mon avis
        </button>
      </form>
    </div>
  );
}
