import { KeyRound, MapPinCheck, PackageCheck, Store, LifeBuoy } from "lucide-react";
import CourierShell from "../../components/CourierShell";

const topics = [
  { icon: Store, title: "Récupération", text: "Vérifiez le numéro de commande et confirmez votre arrivée au restaurant." },
  { icon: PackageCheck, title: "Commande", text: "Contrôlez que le sac est fermé et que tous les éléments annoncés sont présents." },
  { icon: MapPinCheck, title: "Livraison", text: "Mettez à jour chaque étape afin que le client suive votre progression en direct." },
  { icon: KeyRound, title: "Code sécurisé", text: "Demandez le code à six chiffres au client uniquement lors de la remise." },
];

export default function CourierHelpCenter() {
  return <CourierShell title="Centre d'aide" back="/courier">
    <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,0.16),rgba(13,13,13,0.98)_50%)] p-6 text-center"><LifeBuoy size={30} className="mx-auto text-foodiz-gold" /><h2 className="foodiz-title mt-3 text-2xl">Les bons réflexes</h2><p className="mt-2 text-sm text-foodiz-gray">Un parcours simple pour une livraison fluide et rassurante.</p></section>
    <div className="mt-4 space-y-3">{topics.map((topic) => <article key={topic.title} className="foodiz-card flex gap-4 p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-foodiz-gold/20 bg-foodiz-gold/10 text-foodiz-gold"><topic.icon size={20} /></div><div><h3 className="font-semibold text-foodiz-cream">{topic.title}</h3><p className="mt-1 text-xs leading-relaxed text-foodiz-gray">{topic.text}</p></div></article>)}</div>
  </CourierShell>;
}
