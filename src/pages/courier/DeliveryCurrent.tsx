import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Phone, Bike, CheckCircle, Store, User } from "lucide-react";

export default function DeliveryCurrent() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [codeError, setCodeError] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const next = document.getElementById(`code-${index + 1}`);
      next?.focus();
    }
  };

  const validateCode = () => {
    const entered = code.join("");
    if (entered === "123456") {
      setDeliverySuccess(true);
      setCodeError(false);
      setStep(3);
    } else {
      setCodeError(true);
    }
  };

  const stepLabels = [
    { label: "Acceptée", desc: "Vous avez accepté cette course" },
    { label: "Récupérée", desc: "Vous avez récupéré la commande" },
    { label: "En livraison", desc: "Vous êtes en route vers le client" },
    { label: "Livrée", desc: "Commande livrée avec succès" },
  ];

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/courier")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Livraison en cours</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Progress */}
        <div className="foodiz-card p-5">
          <div className="space-y-4">
            {stepLabels.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  i <= step ? "bg-foodiz-green" : "bg-foodiz-card border border-foodiz-gold/20"
                }`}>
                  {i <= step ? <CheckCircle size={16} className="text-white" /> : <span className="text-foodiz-gold/30 text-xs">{i + 1}</span>}
                </div>
                <div>
                  <p className={`text-sm ${i <= step ? "text-foodiz-cream" : "text-foodiz-gray/50"}`}>{s.label}</p>
                  <p className={`text-[10px] ${i <= step ? "text-foodiz-gray" : "text-foodiz-gray/30"}`}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="foodiz-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center">
              <Store size={18} className="text-foodiz-gold" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foodiz-cream">Maison K</h3>
              <p className="text-[10px] text-foodiz-gray">15 Rue de la Roquette, 75011 Paris</p>
            </div>
            <button className="w-9 h-9 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center">
              <Phone size={16} className="text-foodiz-gold" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center">
              <User size={18} className="text-foodiz-gold" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-foodiz-cream">Alexandre</h3>
              <p className="text-[10px] text-foodiz-gray">12 Rue Oberkampf, 75011 Paris</p>
            </div>
            <button className="w-9 h-9 rounded-xl bg-foodiz-gold/10 border border-foodiz-gold/20 flex items-center justify-center">
              <Phone size={16} className="text-foodiz-gold" />
            </button>
          </div>
        </div>

        {/* Actions */}
        {!deliverySuccess && (
          <div className="space-y-3">
            {step === 0 && (
              <button onClick={() => setStep(1)} className="w-full foodiz-btn flex items-center justify-center gap-2">
                <Bike size={18} /> J'ai récupéré la commande
              </button>
            )}
            {step === 1 && (
              <button onClick={() => setStep(2)} className="w-full foodiz-btn flex items-center justify-center gap-2">
                <MapPin size={18} /> En route vers le client
              </button>
            )}
            {step === 2 && !showCodeInput && (
              <button onClick={() => setShowCodeInput(true)} className="w-full foodiz-btn flex items-center justify-center gap-2">
                <CheckCircle size={18} /> Valider la livraison
              </button>
            )}
            {showCodeInput && (
              <div className="foodiz-card p-5 space-y-4">
                <p className="text-sm text-foodiz-cream text-center">Code de validation client</p>
                <p className="text-[10px] text-foodiz-gray text-center">Demandez le code à 6 chiffres au client</p>
                <div className="flex justify-center gap-2">
                  {code.map((digit, i) => (
                    <input
                      key={i} id={`code-${i}`}
                      type="text" inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      className="w-10 h-12 bg-foodiz-black border border-foodiz-gold/30 rounded-xl text-center text-foodiz-cream text-lg font-bold outline-none focus:border-foodiz-gold focus:ring-1 focus:ring-foodiz-gold/30"
                    />
                  ))}
                </div>
                {codeError && (
                  <p className="text-foodiz-red text-xs text-center">Code incorrect. Veuillez réessayer.</p>
                )}
                <button onClick={validateCode} className="w-full foodiz-btn flex items-center justify-center gap-2"
                  disabled={code.some(d => !d)}>
                  <CheckCircle size={18} /> Confirmer la livraison
                </button>
              </div>
            )}
          </div>
        )}

        {deliverySuccess && (
          <div className="foodiz-card p-8 text-center border-foodiz-green/30 bg-foodiz-green/5">
            <CheckCircle size={48} className="mx-auto text-foodiz-green mb-4" />
            <h2 className="foodiz-title text-xl mb-2">Livraison confirmée !</h2>
            <p className="text-foodiz-gray text-xs mb-4">+4,50 € ont été ajoutés à vos gains du jour</p>
            <button onClick={() => navigate("/courier")} className="foodiz-btn">Retour au tableau de bord</button>
          </div>
        )}
      </main>
    </div>
  );
}
