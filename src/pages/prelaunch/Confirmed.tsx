import { Clock3, MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../../components/Logo";

export default function PrelaunchConfirmed() {
  return (
    <main className="min-h-screen kraft-paper-bg px-5 py-10 flex items-center justify-center text-foodiz-black">
      <section className="w-full max-w-xl rounded-[2rem] border border-black/15 bg-[#f8ead2]/90 shadow-[0_30px_100px_rgba(0,0,0,.28)] backdrop-blur p-7 sm:p-10 text-center">
        <div className="flex justify-center mb-8"><Logo size="lg" /></div>
        <div className="mx-auto w-20 h-20 rounded-[1.7rem] bg-black text-foodiz-gold flex items-center justify-center shadow-xl">
          <MailCheck size={36} />
        </div>
        <p className="mt-7 text-[11px] uppercase tracking-[.28em] font-bold text-black/55">Pré-inscription confirmée</p>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight mt-3">Votre compte Foodiz est prêt.</h1>
        <p className="mt-5 text-black/65 leading-relaxed">
          L’accès sera ouvert dès le lancement officiel. Vous recevrez votre lien personnel d’activation par email.
        </p>
        <div className="mt-8 rounded-2xl bg-black/[.06] border border-black/10 p-4 flex items-center gap-3 text-left">
          <Clock3 size={20} className="shrink-0" />
          <p className="text-sm text-black/65">Aucune action supplémentaire n’est nécessaire pour le moment.</p>
        </div>
        <Link to="/waitlist" className="inline-block mt-8 text-sm font-bold underline underline-offset-4">
          Retour à la page d’attente
        </Link>
      </section>
    </main>
  );
}
