import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Clock, Calendar, Truck, Image as ImageIcon, MapPin } from "lucide-react";
import GoldIcon from "../../components/GoldIcon";
import { fileToBase64, loadPartnerProfile, updatePartnerProfile } from "../../utils/partnerStore";

export default function PartnerSettings() {
  const navigate = useNavigate();
  const profile = useMemo(() => loadPartnerProfile(), []);
  const [open24h, setOpen24h] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [hours, setHours] = useState(profile.hours);
  const [location, setLocation] = useState(profile.location);
  const [coverImage, setCoverImage] = useState(profile.coverImage);
  const [closures, setClosures] = useState<string[]>([]);

  const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setCoverImage(base64);
  };

  const handleSave = () => {
    updatePartnerProfile({ hours, location, coverImage });
  };

  return (
    <div className="min-h-screen bg-foodiz-black">
      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold"><ChevronLeft size={20} /></button>
          <h1 className="foodiz-title text-lg">Paramètres</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Cover image */}
        <label className="foodiz-card h-48 overflow-hidden flex flex-col items-center justify-center border-dashed border-2 border-foodiz-gold/20 hover:border-foodiz-gold/35 transition-all cursor-pointer">
          {coverImage ? (
            <img src={coverImage} alt="Couverture établissement" className="w-full h-full object-cover" />
          ) : (
            <>
              <ImageIcon size={32} className="text-foodiz-gold/40 mb-2" />
              <p className="text-xs text-foodiz-gray">Ajouter la photo de couverture de la fiche établissement</p>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />
        </label>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <GoldIcon icon={MapPin} size={18} />
            <h3 className="foodiz-title text-sm">Géolocalisation & adresse affichée</h3>
          </div>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold/30"
          />
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <GoldIcon icon={Clock} size={18} />
            <h3 className="foodiz-title text-sm">Horaires d'ouverture</h3>
          </div>

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input type="checkbox" checked={open24h} onChange={(e) => setOpen24h(e.target.checked)}
              className="w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-card accent-foodiz-gold"
            />
            <span className="text-sm text-foodiz-cream">Ouvert 24h/24</span>
          </label>

          {!open24h && (
            <>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full bg-white/[0.03] border border-foodiz-gold/10 rounded-2xl px-4 py-3 text-sm text-foodiz-cream outline-none focus:border-foodiz-gold/30 mb-4"
              />
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-foodiz-gold/5 last:border-0">
                    <span className="text-sm text-foodiz-cream">{day}</span>
                    <div className="flex items-center gap-2">
                      <select className="bg-foodiz-card text-foodiz-cream text-xs rounded-lg border border-foodiz-gold/15 px-2 py-1 outline-none">
                        <option>11:00</option><option>12:00</option>
                      </select>
                      <span className="text-foodiz-gray text-[10px]">à</span>
                      <select className="bg-foodiz-card text-foodiz-cream text-xs rounded-lg border border-foodiz-gold/15 px-2 py-1 outline-none">
                        <option>22:00</option><option>23:00</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <GoldIcon icon={Calendar} size={18} />
            <h3 className="foodiz-title text-sm">Fermeture exceptionnelle</h3>
          </div>
          <button
            onClick={() => setClosures((prev) => [...prev, `Fermeture exceptionnelle ajoutée le ${new Date().toLocaleDateString("fr-FR")}`])}
            className="foodiz-btn-outline !py-2 text-xs"
          >
            Ajouter une fermeture
          </button>
          {closures.length > 0 && (
            <div className="mt-3 space-y-2">
              {closures.map((closure, index) => (
                <div key={`${closure}-${index}`} className="text-[10px] text-foodiz-gray bg-white/[0.03] border border-foodiz-gold/10 rounded-xl px-3 py-2">
                  {closure}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="foodiz-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <GoldIcon icon={Truck} size={18} />
            <h3 className="foodiz-title text-sm">Services</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-card accent-foodiz-gold"
              />
              <span className="text-sm text-foodiz-cream">Livraison</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-foodiz-gold/30 bg-foodiz-card accent-foodiz-gold"
              />
              <span className="text-sm text-foodiz-cream">Retrait sur place</span>
            </label>
          </div>
        </div>

        <button onClick={handleSave} className="w-full foodiz-btn mt-4">Enregistrer les paramètres</button>
      </main>
    </div>
  );
}
