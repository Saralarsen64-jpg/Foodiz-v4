import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle,
  Home,
  Store,
  X,
} from "lucide-react";

type DeliveryStep = "accepted" | "at_restaurant" | "picked_up" | "at_customer" | "delivered";

export default function DeliveryTrackingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState<DeliveryStep>("accepted");
  const [location, setLocation] = useState({ lat: 48.8656, lng: 2.3633 });
  const [isNavigating, setIsNavigating] = useState(false);
  const [enteredCode, setEnteredCode] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState(false);

  const delivery = {
    id: id || "d1",
    restaurant: { name: "Maison K", address: "15 Rue de la Roquette, 75011 Paris" },
    customer: { name: "Alexandre", address: "12 Rue Oberkampf, 75011 Paris", phone: "+33 6 12 34 56 78" },
    items: ["Burger Artisanal x2", "Limonade Maison x1"],
    earnings: 4.50,
    distance: "1.2 km",
  };

  useEffect(() => {
    const locationInterval = setInterval(() => {
      setLocation((prev) => ({
        lat: prev.lat + (Math.random() - 0.5) * 0.001,
        lng: prev.lng + (Math.random() - 0.5) * 0.001,
      }));
    }, 3000);
    return () => clearInterval(locationInterval);
  }, []);

  const handleNextStep = () => {
    const steps: DeliveryStep[] = ["accepted", "at_restaurant", "picked_up", "at_customer", "delivered"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...enteredCode];
    newCode[index] = value;
    setEnteredCode(newCode);
    setCodeError(false);
    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
    if (index === 5 && value) {
      const fullCode = newCode.join("");
      const expectedCode = localStorage.getItem(`order_${id}_code`) || "123456";
      if (fullCode === expectedCode) {
        setCodeSuccess(true);
        setTimeout(() => { setStep("delivered"); }, 1000);
      } else {
        setCodeError(true);
        setEnteredCode(["", "", "", "", "", ""]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-32">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Livraison en cours</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="foodiz-card overflow-hidden relative h-56 bg-foodiz-card border-foodiz-gold/20">
          <div className="absolute inset-0 bg-gradient-to-br from-foodiz-black via-foodiz-dark to-foodiz-black" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/3 left-0 right-0 h-px bg-foodiz-gold" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-foodiz-gold" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-foodiz-gold" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-foodiz-gold" />
          </div>
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 rounded-full bg-foodiz-gold/20 border-2 border-foodiz-gold flex items-center justify-center"><Store size={14} className="text-foodiz-gold" /></div>
          </div>
          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
            <div className="w-8 h-8 rounded-full bg-foodiz-gold/20 border-2 border-foodiz-gold flex items-center justify-center"><Home size={14} className="text-foodiz-gold" /></div>
          </div>
          <div className="absolute transition-all duration-1000 ease-in-out" style={{ top: `${30 + (location.lat - 48.8656) * 1000}%`, left: `${30 + (location.lng - 2.3633) * 1000}%` }}>
            <div className="w-10 h-10 rounded-full bg-foodiz-gold border-2 border-foodiz-cream flex items-center justify-center shadow-lg shadow-foodiz-gold/40 animate-pulse"><Navigation size={16} className="text-foodiz-black" /></div>
          </div>
          <button onClick={() => setIsNavigating(!isNavigating)} className="absolute bottom-4 right-4 foodiz-btn !py-2 !px-4 text-xs flex items-center gap-2"><Navigation size={14} /> {isNavigating ? "Arrêter" : "GPS"}</button>
        </div>
        <div className="foodiz-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="foodiz-title text-sm">Course en cours</h2>
            <span className="text-[10px] text-foodiz-gold bg-foodiz-gold/10 px-2 py-1 rounded-full">{delivery.distance}</span>
          </div>
          <div className="h-1.5 bg-foodiz-gold/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-foodiz-gold/50 to-foodiz-gold transition-all duration-500" style={{ width: `${(["accepted", "at_restaurant", "picked_up", "at_customer", "delivered"].indexOf(step) + 1) * 20}%` }} />
          </div>
        </div>
        <div className="foodiz-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0"><Store size={18} className="text-foodiz-gold" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foodiz-cream">{delivery.restaurant.name}</h3>
              <p className="text-[11px] text-foodiz-gray mt-0.5">{delivery.restaurant.address}</p>
            </div>
            {step === "accepted" && <button onClick={handleNextStep} className="text-[10px] text-foodiz-gold border border-foodiz-gold/30 px-3 py-1.5 rounded-lg hover:bg-foodiz-gold/5">Arrivé</button>}
          </div>
        </div>
        <div className="foodiz-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0"><Home size={18} className="text-foodiz-gold" /></div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foodiz-cream">{delivery.customer.name}</h3>
              <p className="text-[11px] text-foodiz-gray mt-0.5">{delivery.customer.address}</p>
              <p className="text-[10px] text-foodiz-gray mt-1">Demandez le code au client</p>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/30 flex items-center justify-center"><Phone size={16} className="text-foodiz-gold" /></button>
              <button className="w-9 h-9 rounded-full bg-foodiz-gold/10 border border-foodiz-gold/30 flex items-center justify-center"><MessageCircle size={16} className="text-foodiz-gold" /></button>
            </div>
            {step === "picked_up" && <button onClick={handleNextStep} className="text-[10px] text-foodiz-gold border border-foodiz-gold/30 px-3 py-1.5 rounded-lg hover:bg-foodiz-gold/5">En route</button>}
          </div>
        </div>
        {step === "at_customer" && !codeSuccess && (
          <div className="foodiz-card p-5 border-foodiz-gold/30">
            <h3 className="foodiz-title text-sm mb-3 text-center">Valider la livraison</h3>
            <p className="text-[11px] text-foodiz-gray text-center mb-4">Demandez le code à 6 chiffres au client</p>
            <div className="flex justify-center gap-2 mb-4">
              {enteredCode.map((digit, i) => (
                <input key={i} id={`code-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleCodeChange(i, e.target.value)} className={`w-10 h-12 bg-foodiz-black border rounded-xl text-center text-foodiz-cream text-lg font-bold outline-none focus:border-foodiz-gold focus:ring-1 focus:ring-foodiz-gold/30 ${codeError ? "border-foodiz-red" : "border-foodiz-gold/30"}`} />
              ))}
            </div>
            {codeError && <p className="text-foodiz-red text-xs text-center mb-3 flex items-center justify-center gap-1"><X size={12} /> Code incorrect</p>}
            {codeSuccess && <p className="text-foodiz-green text-xs text-center mb-3 flex items-center justify-center gap-1"><CheckCircle size={12} /> Code validé !</p>}
          </div>
        )}
        {step === "delivered" && (
          <div className="foodiz-card p-5 border-foodiz-green/30 bg-foodiz-green/5 text-center">
            <CheckCircle size={40} className="mx-auto text-foodiz-green mb-3" />
            <h3 className="foodiz-title text-lg mb-2">Livraison terminée !</h3>
            <p className="text-foodiz-gray text-sm mb-1">+{delivery.earnings.toFixed(2).replace(".", ",")} € ajoutés à vos gains</p>
            <button onClick={() => navigate("/courier")} className="foodiz-btn mt-4">Retour au tableau de bord</button>
          </div>
        )}
      </main>
      {step !== "delivered" && step !== "at_customer" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4 bg-foodiz-black/90 backdrop-blur-sm border-t border-foodiz-gold/20">
          <button onClick={handleNextStep} className="w-full foodiz-btn py-4 text-base flex items-center justify-center gap-2"><Navigation size={18} /> {step === "accepted" ? "Arrivé au restaurant" : step === "at_restaurant" ? "Commande récupérée" : "Arrivé chez le client"}</button>
        </div>
      )}
    </div>
  );
}
