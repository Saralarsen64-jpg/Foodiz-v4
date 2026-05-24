import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, CheckCircle, Trash2 } from "lucide-react";

const INITIAL_PAYMENT_METHODS = [
  { id: "pm1", type: "Visa", last4: "4242", exp: "06/27", isDefault: true },
  { id: "pm2", type: "Mastercard", last4: "1234", exp: "09/26", isDefault: false },
];

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState(INITIAL_PAYMENT_METHODS);

  const addPaymentMethod = () => {
    const next = {
      id: `pm-${Date.now()}`,
      type: "Visa",
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      exp: "12/28",
      isDefault: false,
    };
    setPaymentMethods((prev) => [...prev, next]);
  };

  const setDefault = (id: string) => {
    setPaymentMethods((prev) => prev.map((pm) => ({ ...pm, isDefault: pm.id === id })));
  };

  const removeMethod = (id: string) => {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="foodiz-title text-2xl">Moyens de paiement</h1>
        <button onClick={addPaymentMethod} className="w-9 h-9 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-3">
        {paymentMethods.map((pm) => (
          <div key={pm.id} className="foodiz-card p-4 hover:border-foodiz-gold/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-8 rounded-lg bg-foodiz-gradient-gold flex items-center justify-center text-[10px] font-bold text-foodiz-gold border border-foodiz-gold/20">
                {pm.type}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foodiz-cream">•••• {pm.last4}</p>
                <p className="text-[10px] text-foodiz-gray">Expire le {pm.exp}</p>
              </div>
              <div className="flex items-center gap-2">
                {!pm.isDefault && (
                  <button onClick={() => setDefault(pm.id)} className="text-[10px] text-foodiz-gold border border-foodiz-gold/20 rounded-full px-2 py-1 hover:border-foodiz-gold/40 transition-all">
                    Définir
                  </button>
                )}
                {pm.isDefault && (
                  <span className="text-[10px] text-foodiz-green bg-foodiz-green/10 px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Par défaut
                  </span>
                )}
                <button onClick={() => removeMethod(pm.id)} className="text-foodiz-red/50 hover:text-foodiz-red transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-foodiz-gray/50 mt-6 text-center">
        Vos informations de paiement sont sécurisées par Stripe
      </p>
    </div>
  );
}
