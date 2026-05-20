import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Send, ChefHat, Bike, CheckCircle2 } from "lucide-react";

const STORAGE_REVIEWS = "foodiz_reviews_v1";

export default function OrderReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("foodiz_client_orders_v1");
    if (saved) {
      const orders = JSON.parse(saved);
      const found = orders.find((o: any) => o.id === id);
      setOrder(found);
    }
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (restaurantRating === 0 || courierRating === 0) {
      alert("Veuillez noter le restaurant et le livreur.");
      return;
    }

    const review = {
      orderId: id,
      restaurantId: order?.restaurantId || "r1", // Fallback to Maison K for demo
      courierId: order?.courierId || "c1",
      restaurantRating,
      courierRating,
      comment,
      date: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem(STORAGE_REVIEWS) || "[]");
    localStorage.setItem(STORAGE_REVIEWS, JSON.stringify([...existing, review]));

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
      <p className="text-foodiz-gray text-xs mb-8">{order?.restaurant || "Maison K"}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Rating */}
        <div className="foodiz-card p-6">
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
        </div>

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
