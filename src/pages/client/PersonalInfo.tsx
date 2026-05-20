import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, User, Mail, Phone, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";

export default function PersonalInfoPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("Alexandre");
  const [lastName, setLastName] = useState("Moreau");
  const [email, setEmail] = useState("alexandre@email.com");
  const [phone, setPhone] = useState("+33 6 12 34 56 78");
  const [city, setCity] = useState("Paris");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6">
        <ChevronLeft size={18} /> Retour
      </button>

      <h1 className="foodiz-title text-2xl mb-6">Informations personnelles</h1>

      <div className="space-y-4">
        <div className="foodiz-card p-5">
          <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Prénom</label>
          <div className="flex items-center gap-3 mt-2">
            <GoldIcon icon={User} size={16} />
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none border-b border-foodiz-gold/10 pb-1 focus:border-foodiz-gold/40" />
          </div>
        </div>

        <div className="foodiz-card p-5">
          <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Nom</label>
          <div className="flex items-center gap-3 mt-2">
            <GoldIcon icon={User} size={16} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none border-b border-foodiz-gold/10 pb-1 focus:border-foodiz-gold/40" />
          </div>
        </div>

        <div className="foodiz-card p-5">
          <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">E-mail</label>
          <div className="flex items-center gap-3 mt-2">
            <GoldIcon icon={Mail} size={16} />
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none border-b border-foodiz-gold/10 pb-1 focus:border-foodiz-gold/40" />
          </div>
        </div>

        <div className="foodiz-card p-5">
          <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Téléphone</label>
          <div className="flex items-center gap-3 mt-2">
            <GoldIcon icon={Phone} size={16} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none border-b border-foodiz-gold/10 pb-1 focus:border-foodiz-gold/40" />
          </div>
        </div>

        <div className="foodiz-card p-5">
          <label className="text-[10px] font-semibold text-foodiz-gray uppercase tracking-widest">Ville</label>
          <div className="flex items-center gap-3 mt-2">
            <GoldIcon icon={MapPin} size={16} />
            <input value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 bg-transparent text-foodiz-cream text-sm outline-none border-b border-foodiz-gold/10 pb-1 focus:border-foodiz-gold/40" />
          </div>
        </div>

        <button onClick={handleSave} className="w-full foodiz-btn mt-4">{saved ? "Modifications enregistrées" : "Enregistrer les modifications"}</button>
      </div>
    </div>
  );
}
