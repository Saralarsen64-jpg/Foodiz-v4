import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { ChevronLeft, Star, MapPin, ShoppingCart } from "lucide-react";
import CityExpansionCard from "../../components/CityExpansionCard";

export default function MarketPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<any[]>([]);
  const [cityName, setCityName] = useState("votre position");
  const [loading, setLoading] = useState(true);
  const [coverageStatus, setCoverageStatus] = useState<"available" | "coming_soon" | "address_required">("address_required");
  const [expansionRequested, setExpansionRequested] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch("/api/client-catalog", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          setCoverageStatus(payload.coverage?.status || "address_required");
          setExpansionRequested(Boolean(payload.expansionRequest));
          setCityName(payload.coverage?.city || "votre adresse");
          setMarkets((payload.restaurants || [])
            .filter((restaurant: any) => /market|épicerie|epicerie|grocery|supermarché/i.test(restaurant.cuisine_type || ""))
            .map((market: any) => ({ ...market, rating: "Nouveau" })));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 animate-fade-in-up border-x-2 border-foodiz-gold/20 relative">
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/client")} className="text-foodiz-gold"><ChevronLeft size={24} /></button>
          <h1 className="foodiz-title text-lg">Market Foodiz</h1>
          <div className="w-6" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-foodiz-gray text-xs mb-6">
          <MapPin size={14} className="text-foodiz-gold" />
          <span>Autour de {cityName} (10km max)</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-foodiz-gray animate-pulse">Recherche des marchés...</div>
        ) : markets.length === 0 ? (
          coverageStatus !== "available" ? (
            <CityExpansionCard
              status={coverageStatus}
              city={cityName}
              alreadyRequested={expansionRequested}
              onRequested={() => setExpansionRequested(true)}
            />
          ) : (
            <div className="foodiz-card p-12 text-center bg-[#0A0A0A] border-foodiz-gold/10">
              <ShoppingCart size={48} className="mx-auto text-foodiz-gray/20 mb-4" />
              <h3 className="text-foodiz-cream text-lg font-medium mb-2">Le Market se prépare</h3>
              <p className="text-foodiz-gray text-sm">Des restaurants sont déjà disponibles, mais aucun commerce Market n’est encore référencé autour de {cityName}.</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {markets.map((m) => (
              <button key={m.id} onClick={() => navigate(`/client/establishments/${m.id}`)} className="foodiz-card p-3 text-left hover:border-foodiz-gold/30 transition-all">
                <div className="w-full h-24 rounded-xl overflow-hidden mb-3 bg-foodiz-card">
                  {m.cover_image ? <img src={m.cover_image} alt={m.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>}
                </div>
                <h3 className="foodiz-title text-sm">{m.name}</h3>
                <div className="flex items-center gap-2 mt-1 text-foodiz-gray text-[10px]">
                  <span className="flex items-center gap-0.5"><Star size={9} className="text-foodiz-gold" /> {m.rating}</span>
                  <span>• Délai à confirmer</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
