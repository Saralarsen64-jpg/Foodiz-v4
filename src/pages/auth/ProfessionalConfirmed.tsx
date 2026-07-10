import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ProfessionalConfirmed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courier = searchParams.get("role") === "livreur";

  return (
    <div className="min-h-screen bg-weello-black px-5 py-10 text-weello-cream">
      <main className="mx-auto max-w-xl">
        <img
          src="/images/weello-wordmark.png"
          alt="Weello"
          className="mx-auto block w-full max-w-md"
        />
        <section className="weello-card -mt-5 border-weello-gold/30 p-6 text-center sm:p-9">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-weello-green/30 bg-weello-green/10 text-weello-green">
            <CheckCircle2 size={30} />
          </span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.22em] text-weello-gold">
            Dossier transmis
          </p>
          <h1 className="weello-title mt-2 text-3xl">
            Bienvenue chez Weello
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-weello-gray">
            Votre compte {courier ? "livreur" : "partenaire"} et vos justificatifs
            sont enregistrés. L’administration Weello va maintenant contrôler
            votre dossier.
          </p>

          <div className="mt-7 grid gap-3 text-left sm:grid-cols-2">
            <article className="rounded-2xl border border-weello-gold/15 bg-white/[.025] p-4">
              <Mail className="text-weello-gold" size={20} />
              <h2 className="mt-3 font-semibold text-weello-cream">Confirmez votre email</h2>
              <p className="mt-1 text-xs leading-relaxed text-weello-gray">
                Ouvrez le message Weello reçu dans votre boîte mail, y compris le dossier spam.
              </p>
            </article>
            <article className="rounded-2xl border border-weello-gold/15 bg-white/[.025] p-4">
              <ShieldCheck className="text-weello-gold" size={20} />
              <h2 className="mt-3 font-semibold text-weello-cream">Validation administrative</h2>
              <p className="mt-1 text-xs leading-relaxed text-weello-gray">
                Vous serez informé par email après approbation ou si un document doit être remplacé.
              </p>
            </article>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/auth/login?role=${courier ? "courier" : "partner"}`)}
            className="weello-btn mt-7 w-full py-4"
          >
            Aller à la connexion
          </button>
        </section>
      </main>
    </div>
  );
}
