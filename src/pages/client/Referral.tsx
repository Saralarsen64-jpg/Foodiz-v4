import { useNavigate } from "react-router-dom";
import { ChevronLeft, Gift, Share2, Copy } from "lucide-react";

export default function ReferralPage() {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in-up">
      <button onClick={() => navigate("/client/account")} className="flex items-center gap-1 text-foodiz-gold text-sm mb-6"><ChevronLeft size={18} /> Compte</button>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-foodiz-gradient-gold flex items-center justify-center mb-4"><Gift size={32} className="text-foodiz-black" /></div>
        <h1 className="foodiz-title text-2xl mb-2">Parrainez vos amis</h1>
        <p className="text-sm text-foodiz-gray">Offrez 500 points à vos amis et recevez 500 points pour chaque inscription.</p>
      </div>
      <div className="foodiz-card p-6 text-center mb-6 border-foodiz-gold/30">
        <p className="text-[10px] text-foodiz-gray uppercase tracking-widest mb-2">Votre code unique</p>
        <p className="text-3xl font-serif italic text-foodiz-gold font-bold tracking-widest mb-4">ALEX2024</p>
        <button className="w-full foodiz-btn py-3 text-sm flex items-center justify-center gap-2"><Copy size={16} /> Copier le code</button>
      </div>
      <button className="w-full foodiz-btn-outline py-4 text-sm flex items-center justify-center gap-2"><Share2 size={16} /> Partager via SMS / WhatsApp</button>
    </div>
  );
}
