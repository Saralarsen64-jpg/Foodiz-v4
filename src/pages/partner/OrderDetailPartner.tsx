import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Phone, User } from "lucide-react";

const PRODUCTS = [
  { name: "Burger Artisanal", qty: 2, partnerPrice: 8.00 },
  { name: "Frites Maison", qty: 1, partnerPrice: 3.00 },
];

const totalPartner = PRODUCTS.reduce((s, p) => s + p.partnerPrice * p.qty, 0);
const totalClient = 28.60;
const supplement = totalClient - totalPartner;

export default function PartnerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Commande #{id?.slice(0, 6)}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Status */}
        <div className="foodiz-card p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-foodiz-gold text-xs font-medium bg-foodiz-gold/10 px-3 py-1 rounded-full">Livrée</span>
            <span className="text-foodiz-gray text-[10px]">24 mai 2025, 19:30</span>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
              <User size={18} className="text-foodiz-gold" />
            </div>
            <div>
              <p className="text-sm text-foodiz-cream">Alexandre</p>
              <p className="text-[10px] text-foodiz-gray">+33 6 12 34 56 78</p>
            </div>
            <button className="ml-auto w-9 h-9 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center">
              <Phone size={16} className="text-foodiz-gold" />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-foodiz-gold" />
            </div>
            <div>
              <p className="text-sm text-foodiz-cream">12 Rue Oberkampf</p>
              <p className="text-[10px] text-foodiz-gray">75011 Paris</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Produits</h3>
          <div className="space-y-3">
            {PRODUCTS.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-foodiz-gold text-xs font-medium">x{p.qty}</span>
                  <span className="text-sm text-foodiz-cream">{p.name}</span>
                </div>
                <span className="text-foodiz-cream text-sm">{(p.partnerPrice * p.qty).toFixed(2).replace(".", ",")} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* Economic Summary - Partner view */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Récapitulatif économique</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Total payé par le client</span>
              <span className="text-foodiz-cream">{totalClient.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foodiz-gray">Ce qui vous revient</span>
              <span className="text-foodiz-green font-semibold text-base">{totalPartner.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="border-t border-foodiz-gold/10 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-foodiz-gray">Supplément Foodiz global payé par le client</span>
                <span className="text-foodiz-gold">{supplement.toFixed(2).replace(".", ",")} €</span>
              </div>
              <p className="text-[10px] text-foodiz-gray/50 mt-1">Ce supplément couvre les frais de service, de livraison, la commission Foodiz et la fidélité.</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="foodiz-card p-5">
          <h3 className="foodiz-title text-sm mb-4">Suivi</h3>
          <div className="space-y-3">
            {[
              { label: "Commande acceptée", time: "19:32" },
              { label: "En préparation", time: "19:35" },
              { label: "Prête", time: "19:50" },
              { label: "Récupérée par le livreur", time: "19:55" },
              { label: "Livrée", time: "20:10" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-foodiz-green mt-1.5" />
                <div className="flex-1 flex justify-between">
                  <span className="text-xs text-foodiz-cream">{s.label}</span>
                  <span className="text-[10px] text-foodiz-gray">{s.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
