import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Save, 
  Image as ImageIcon,
  Upload,
  Clock,
  MapPin,
  Store
} from "lucide-react";

export default function PartnerSettings() {
  const navigate = useNavigate();
  const [bannerImage, setBannerImage] = useState<string | null>("/images/auth-restaurant.jpg");
  const [hours, setHours] = useState("11:00 - 23:00");
  const [location, setLocation] = useState("15 Rue de la Roquette, 75011 Paris");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBannerImage(url);
    }
  };

  return (
    <div className="min-h-screen bg-foodiz-black pb-24 relative border-x-2 border-foodiz-gold/20">
      {/* Golden Side Borders */}
      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />
      <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-foodiz-gold/40 to-transparent z-50" />

      <header className="bg-foodiz-card border-b border-foodiz-gold/10 px-4 py-3 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/partner")} className="text-foodiz-gold">
            <ChevronLeft size={24} />
          </button>
          <h1 className="foodiz-title text-lg">Paramètres Établissement</h1>
          <button className="text-foodiz-gold font-bold text-sm flex items-center gap-2 hover:text-foodiz-cream transition-colors">
            <Save size={16} /> Enregistrer
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        
        {/* Banner Upload */}
        <div>
          <h2 className="foodiz-title text-base text-foodiz-gold mb-2 flex items-center gap-2">
            <ImageIcon size={18} /> Photo de la Carte Fiche Établissement
          </h2>
          <p className="text-xs text-foodiz-gray mb-4 italic">Insérez ici la photo principale qui apparaîtra en haut de votre fiche restaurant côté client.</p>
          
          <div className="foodiz-card p-1 border-dashed border-2 border-foodiz-gold/20 hover:border-foodiz-gold/40 transition-all rounded-2xl overflow-hidden relative group bg-foodiz-black/50">
            <div className="absolute top-2 left-2 z-10 bg-foodiz-gold text-foodiz-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
              Bannière Fiche Client
            </div>
            {bannerImage ? (
              <div className="relative aspect-[21/9]">
                <img src={bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-foodiz-cream text-xs mb-2">Bannière actuelle</p>
                  <label className="cursor-pointer bg-foodiz-gold text-foodiz-black px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
                    <Upload size={16} /> Changer la photo de la fiche
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-[21/9] cursor-pointer bg-foodiz-gold/5">
                <div className="w-20 h-20 rounded-full bg-foodiz-gold/10 flex items-center justify-center mb-4 border border-foodiz-gold/30">
                  <ImageIcon size={40} className="text-foodiz-gold" />
                </div>
                <p className="text-lg text-foodiz-cream font-serif italic font-bold mb-2">Insérer la photo de votre établissement</p>
                <p className="text-[10px] text-foodiz-gray mb-4 text-center px-4 max-w-md">Cette image servira de carte de visite visuelle en haut de votre page Foodiz.</p>
                <span className="text-[10px] text-foodiz-black bg-foodiz-gold px-6 py-3 rounded-full font-bold uppercase tracking-wider shadow-lg shadow-foodiz-gold/20">Cliquez pour uploader la bannière</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Info Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="foodiz-card p-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold flex items-center gap-2 mb-3">
              <Clock size={14} /> Horaires d'ouverture
            </label>
            <input 
              type="text" 
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full bg-foodiz-black/50 border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold/50 transition-all"
            />
          </div>

          <div className="foodiz-card p-5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold flex items-center gap-2 mb-3">
              <MapPin size={14} /> Adresse
            </label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-foodiz-black/50 border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold/50 transition-all"
            />
          </div>
        </div>

        {/* Establishment Details */}
        <div className="foodiz-card p-5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-foodiz-gold flex items-center gap-2 mb-3">
            <Store size={14} /> Nom de l'établissement
          </label>
          <input 
            type="text" 
            defaultValue="Maison K"
            className="w-full bg-foodiz-black/50 border border-foodiz-gold/20 rounded-xl px-4 py-3 text-foodiz-cream outline-none focus:border-foodiz-gold/50 transition-all font-serif italic text-lg"
          />
        </div>

      </main>
    </div>
  );
}
