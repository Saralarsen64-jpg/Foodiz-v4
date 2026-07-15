import { Link } from "react-router-dom";
import { ShieldCheck, Trash2 } from "lucide-react";

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-weello-black px-5 py-12 text-weello-cream">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-weello-gold/20 bg-weello-card p-7 sm:p-10">
        <div className="flex items-center gap-3 text-weello-gold">
          <Trash2 size={28} />
          <h1 className="font-serif text-3xl font-bold">Supprimer un compte Weello</h1>
        </div>
        <p className="mt-6 text-sm leading-7 text-weello-gray">
          Vous pouvez supprimer votre compte directement dans l’application Weello depuis
          votre espace Compte, puis « Supprimer définitivement mon compte ». L’application
          demande une confirmation avant toute suppression.
        </p>
        <div className="mt-6 rounded-2xl border border-weello-gold/15 bg-black/20 p-5">
          <div className="flex items-center gap-2 text-weello-gold">
            <ShieldCheck size={18} />
            <h2 className="font-semibold">Si vous ne pouvez plus vous connecter</h2>
          </div>
          <p className="mt-3 text-sm leading-7 text-weello-gray">
            Envoyez votre demande depuis l’adresse liée au compte à
            {" "}<a className="text-weello-gold underline" href="mailto:contact@weello.co?subject=Suppression%20de%20mon%20compte%20Weello">contact@weello.co</a>.
            Nous pourrons demander une vérification d’identité proportionnée avant de traiter
            la demande.
          </p>
        </div>
        <p className="mt-6 text-xs leading-6 text-weello-gray/80">
          Les données personnelles sont supprimées ou anonymisées. Certaines écritures peuvent
          être conservées pendant la durée imposée par les obligations comptables, fiscales ou
          la gestion d’un litige, conformément à notre politique de confidentialité.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="weello-btn px-5 py-3" to="/auth/login">Se connecter</Link>
          <Link className="rounded-xl border border-weello-gold/25 px-5 py-3 text-sm text-weello-gold" to="/confidentialite">
            Politique de confidentialité
          </Link>
        </div>
      </section>
    </main>
  );
}
