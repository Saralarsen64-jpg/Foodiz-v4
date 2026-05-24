import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, Home, Briefcase, Star, Trash2 } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

const INITIAL_ADDRESSES = [
  { id: "a1", label: "Domicile", address: "12 Rue Oberkampf", city: "75011 Paris", icon: Home, isDefault: true },
  { id: "a2", label: "Bureau", address: "45 Avenue des Champs-Élysées", city: "75008 Paris", icon: Briefcase, isDefault: false },
];

export default function AddressesPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);

  const addAddress = () => {
    setAddresses((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        label: `Adresse ${prev.length + 1}`,
        address: "Nouvelle adresse",
        city: "Paris",
        icon: Home,
        isDefault: false,
      },
    ]);
  };

  const removeAddress = (id: string) => {
    setAddresses((prev) => prev.filter((addr) => addr.id !== id));
  };

  const setDefault = (id: string) => {
    setAddresses((prev) => prev.map((addr) => ({ ...addr, isDefault: addr.id === id })));
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="foodiz-title text-2xl">Mes adresses</h1>
        <button onClick={addAddress} className="w-9 h-9 rounded-full bg-foodiz-gold text-foodiz-black flex items-center justify-center">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className="foodiz-card p-4 hover:border-foodiz-gold/30 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-foodiz-gradient-gold flex items-center justify-center shrink-0">
                <GoldIcon icon={addr.icon} size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foodiz-cream">{addr.label}</h3>
                  {addr.isDefault && <Star size={12} className="text-foodiz-gold" />}
                </div>
                <p className="text-xs text-foodiz-gray mt-0.5">{addr.address}</p>
                <p className="text-[10px] text-foodiz-gray/50">{addr.city}</p>
                {!addr.isDefault && (
                  <button onClick={() => setDefault(addr.id)} className="mt-2 text-[10px] text-foodiz-gold hover:underline">
                    Définir comme principale
                  </button>
                )}
              </div>
              <button onClick={() => removeAddress(addr.id)} className="text-foodiz-red/50 hover:text-foodiz-red transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
