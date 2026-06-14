import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, CircleUserRound, Headphones, History, House, Navigation, WalletCards } from "lucide-react";
import Logo from "./Logo";

const NAV = [
  { label: "Accueil", path: "/courier", icon: House },
  { label: "Courses", path: "/courier/deliveries/available", icon: Navigation },
  { label: "Historique", path: "/courier/deliveries/history", icon: History },
  { label: "Gains", path: "/courier/revenues", icon: WalletCards },
];

export default function CourierShell({ children, title, back }: { children: ReactNode; title?: string; back?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-foodiz-black pb-28 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(216,168,79,0.14),transparent_30%),radial-gradient(circle_at_90%_30%,rgba(63,167,109,0.08),transparent_28%)]" />
      <div className="fixed inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-foodiz-gold/30 to-transparent" />
      <div className="fixed inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-foodiz-gold/30 to-transparent" />
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-foodiz-black/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          {back ? <button onClick={() => navigate(back)} className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-foodiz-gold"><ChevronLeft size={19} /></button> : <Logo size="sm" />}
          {title && <div className="text-center"><p className="text-[9px] uppercase tracking-[0.25em] text-foodiz-gold">Espace livreur</p><h1 className="foodiz-title text-lg">{title}</h1></div>}
          <button onClick={() => navigate("/courier/profile")} className="w-10 h-10 rounded-2xl border border-foodiz-gold/15 bg-foodiz-gold/10 flex items-center justify-center text-foodiz-gold"><CircleUserRound size={19} /></button>
        </div>
      </header>
      <main className="relative max-w-lg mx-auto px-4 py-6">{children}</main>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg rounded-[1.6rem] border border-foodiz-gold/15 bg-[#0b0b0b]/92 backdrop-blur-xl p-2 shadow-[0_20px_60px_rgba(0,0,0,0.65)]">
        <div className="grid grid-cols-4 gap-1">{NAV.map((item) => { const active = location.pathname === item.path || (item.path !== "/courier" && location.pathname.startsWith(item.path)); return <button key={item.path} onClick={() => navigate(item.path)} className={`rounded-2xl py-2.5 flex flex-col items-center gap-1 transition-all ${active ? "bg-foodiz-gold text-foodiz-black shadow-[0_8px_25px_rgba(216,168,79,0.22)]" : "text-foodiz-gray hover:text-foodiz-gold"}`}><item.icon size={17} /><span className="text-[9px] font-semibold">{item.label}</span></button>; })}</div>
      </nav>
      <button onClick={() => navigate("/courier/support")} className="fixed right-4 bottom-24 z-40 w-11 h-11 rounded-2xl bg-foodiz-card border border-foodiz-gold/20 text-foodiz-gold flex items-center justify-center shadow-lg"><Headphones size={18} /></button>
    </div>
  );
}
