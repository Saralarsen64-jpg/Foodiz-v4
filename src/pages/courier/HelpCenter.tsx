import { KeyRound, MapPinCheck, PackageCheck, Store, LifeBuoy, ArrowRight, Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CourierShell from "../../components/CourierShell";

const topics = [
  { icon: Store, title: "Récupération", text: "Vérifiez le numéro de commande et confirmez votre arrivée au restaurant." },
  { icon: PackageCheck, title: "Commande", text: "Contrôlez que le sac est fermé et que tous les éléments annoncés sont présents." },
  { icon: MapPinCheck, title: "Livraison", text: "Mettez à jour chaque étape afin que le client suive votre progression en direct." },
  { icon: KeyRound, title: "Code sécurisé", text: "Demandez le code à six chiffres au client uniquement lors de la remise." },
  { icon: Clock3, title: "Retard", text: "À partir de la récupération, Foodiz compare l’estimation GPS et le temps réel pour protéger le client." },
  { icon: FileCheck2, title: "Dossier", text: "Gardez vos justificatifs lisibles et à jour pour conserver votre accès aux courses." },
];

export default function CourierHelpCenter() {
  const navigate = useNavigate();
  return <CourierShell title="Centre d'aide" back="/courier">
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(13,13,13,0.98)_50%)] p-6 text-center">
      <LifeBuoy size={30} className="mx-auto text-foodiz-gold" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-[.25em] text-foodiz-gold">Support livreur</p>
      <h2 className="foodiz-title mt-2 text-2xl">Les bons réflexes Foodiz</h2>
      <p className="mt-2 text-sm leading-relaxed text-foodiz-gray">
        Un parcours clair pour livrer vite, proprement, et garder une relation de confiance avec le client.
      </p>
      <div className="mt-5 rounded-2xl border border-foodiz-gold/15 bg-black/25 p-4 text-left">
        <div className="flex gap-3">
          <ShieldCheck size={19} className="shrink-0 text-foodiz-gold" />
          <p className="text-xs leading-relaxed text-foodiz-gray">
            Si une situation semble anormale, ne prenez pas de risque : contactez le support avant de forcer une étape.
          </p>
        </div>
      </div>
    </section>
    <div className="mt-4 space-y-3">{topics.map((topic) => <article key={topic.title} className="foodiz-card flex gap-4 p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"><topic.icon size={20} /></div><div><h3 className="font-semibold text-foodiz-cream">{topic.title}</h3><p className="mt-1 text-xs leading-relaxed text-foodiz-gray">{topic.text}</p></div></article>)}</div>
    <button onClick={() => navigate("/courier/support")} className="foodiz-btn mt-4 flex w-full items-center justify-center gap-2 py-4">Analyser un problème<ArrowRight size={17}/></button>
  </CourierShell>;
}
