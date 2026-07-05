import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Cookie,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";

type LegalPageKind = "notice" | "cgu" | "cgv" | "privacy" | "cookies";

const LEGAL_UPDATED_AT = "24 juin 2026";

const WEELLO_LEGAL_IDENTITY = {
  brand: "Weello",
  companyName: "Sara Larsen — Weello",
  legalForm: "Entrepreneur Individuel (EI)",
  entrepreneur: "Sara Larsen",
  shareCapital: "Non applicable — entrepreneur individuel",
  registeredOffice: "9 rue Maubec, 40000 Mont-de-Marsan, France",
  siret: "822 183 364 00014",
  siren: "822 183 364",
  rcs: "Non renseigné / non applicable selon immatriculation",
  vat: "TVA non applicable, article 293 B du Code général des impôts.",
  publicationDirector: "Sara Larsen",
  email: "contact@weello.co",
  host: "Vercel Inc. / Supabase — informations hébergeur exactes à compléter avant lancement",
};

const legalNav = [
  { to: "/mentions-legales", label: "Mentions légales", kind: "notice" },
  { to: "/cgu", label: "CGU", kind: "cgu" },
  { to: "/cgv", label: "CGV", kind: "cgv" },
  { to: "/confidentialite", label: "Confidentialité", kind: "privacy" },
  { to: "/cookies", label: "Cookies", kind: "cookies" },
];

function LegalShell({
  kind,
  eyebrow,
  title,
  intro,
  icon,
  children,
}: {
  kind: LegalPageKind;
  eyebrow: string;
  title: string;
  intro: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050504] text-foodiz-cream">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,168,79,.16),transparent_28%),linear-gradient(180deg,#11100d_0%,#050505_34%,#060604_100%)]" />
      <header className="border-b border-foodiz-gold/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-foodiz-gold/20 px-3 py-2 text-xs font-semibold text-foodiz-gold transition hover:bg-foodiz-gold/10"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
          <Link to="/waitlist" className="text-sm font-black italic text-foodiz-gold">
            Weello
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <section className="rounded-[2rem] border border-foodiz-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,.13),rgba(13,13,13,.98)_42%,rgba(5,5,5,.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.32em] text-foodiz-gold">{eyebrow}</p>
              <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-foodiz-gray sm:text-base">
                {intro}
              </p>
              <p className="mt-4 text-xs text-foodiz-gray/70">Dernière mise à jour : {LEGAL_UPDATED_AT}</p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-foodiz-gold/30 bg-foodiz-gold/10 text-foodiz-gold shadow-[0_0_35px_rgba(216,168,79,.18)]">
              {icon}
            </div>
          </div>
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {legalNav.map((item) => {
            const active = item.kind === kind;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-foodiz-gold bg-foodiz-gold text-foodiz-black"
                    : "border-foodiz-gold/20 text-foodiz-gold hover:bg-foodiz-gold/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <section className="mt-6 space-y-4">{children}</section>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-[1.5rem] border border-foodiz-gold/12 bg-white/[0.025] p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-foodiz-cream">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-foodiz-gray">{children}</div>
    </article>
  );
}

function WarningBlock() {
  return (
    <div className="rounded-[1.4rem] border border-amber-300/25 bg-amber-300/[0.06] p-4 text-xs leading-6 text-amber-100/90">
      Ces documents constituent une base opérationnelle Weello. Les informations d’identité de la société, de l’hébergement,
      de l’hébergement, du médiateur de la consommation et les conditions tarifaires définitives doivent être complétées puis validées avant
      le lancement public.
    </div>
  );
}

export function LegalNoticePage() {
  return (
    <LegalShell
      kind="notice"
      eyebrow="Transparence"
      title="Mentions légales"
      intro="Les informations officielles permettant d’identifier l’éditeur du service Weello."
      icon={<Scale size={28} />}
    >
      <WarningBlock />
      <Block title="Éditeur du service">
        <p>Nom commercial : {WEELLO_LEGAL_IDENTITY.brand}</p>
        <p>Identité professionnelle : {WEELLO_LEGAL_IDENTITY.companyName}</p>
        <p>Forme juridique : {WEELLO_LEGAL_IDENTITY.legalForm}</p>
        <p>Entrepreneur individuel : {WEELLO_LEGAL_IDENTITY.entrepreneur}</p>
        <p>Capital social : {WEELLO_LEGAL_IDENTITY.shareCapital}</p>
        <p>Adresse professionnelle : {WEELLO_LEGAL_IDENTITY.registeredOffice}</p>
        <p>SIRET : {WEELLO_LEGAL_IDENTITY.siret}</p>
        <p>SIREN : {WEELLO_LEGAL_IDENTITY.siren}</p>
        <p>RCS/RM : {WEELLO_LEGAL_IDENTITY.rcs}</p>
        <p>TVA : {WEELLO_LEGAL_IDENTITY.vat}</p>
      </Block>
      <Block title="Responsable de publication et contact">
        <p>Directeur ou directrice de la publication : {WEELLO_LEGAL_IDENTITY.publicationDirector}</p>
        <p>Contact : <a className="text-foodiz-gold" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>{WEELLO_LEGAL_IDENTITY.email}</a></p>
      </Block>
      <Block title="Hébergement">
        <p>{WEELLO_LEGAL_IDENTITY.host}</p>
        <p>
          L’application utilise également Supabase pour l’authentification, la base de données et le stockage sécurisé de
          certains documents nécessaires à la validation des partenaires et livreurs.
        </p>
      </Block>
    </LegalShell>
  );
}

export function TermsOfUsePage() {
  return (
    <LegalShell
      kind="cgu"
      eyebrow="Conditions d’utilisation"
      title="CGU Weello"
      intro="Les règles d’accès et d’utilisation du site, de l’application mobile et des espaces client, partenaire, livreur et administrateur."
      icon={<FileCheck2 size={28} />}
    >
      <WarningBlock />
      <Block title="Objet">
        <p>
          Weello est une plateforme de mise en relation permettant aux clients de commander auprès de commerces locaux,
          restaurants ou enseignes partenaires, avec une livraison réalisée par des livreurs indépendants validés par Weello.
        </p>
      </Block>
      <Block title="Accès avant lancement">
        <p>
          Tant que Weello n’est pas officiellement lancé dans une ville, les clients peuvent se préinscrire et seront informés
          par email du lancement. Les livreurs et partenaires peuvent déposer un dossier, mais aucun accès opérationnel,
          aucune course et aucun revenu ne sont ouverts sans validation préalable par Weello.
        </p>
      </Block>
      <Block title="Compte utilisateur">
        <p>
          Chaque utilisateur doit fournir des informations exactes et maintenir la confidentialité de ses identifiants. Weello
          peut suspendre un compte en cas d’usage frauduleux, de fausse déclaration, d’usurpation d’identité ou de non-respect
          des règles de la plateforme.
        </p>
      </Block>
      <Block title="Partenaires et livreurs">
        <p>
          Les partenaires et livreurs restent responsables de leurs obligations professionnelles, fiscales, sociales,
          assurantielles et réglementaires. Les documents transmis à Weello servent à vérifier l’éligibilité opérationnelle
          avant activation.
        </p>
      </Block>
      <Block title="Support et réclamations">
        <p>
          Les demandes doivent être transmises via le centre d’aide Weello. Les utilisateurs s’engagent à fournir des
          informations utiles, sincères et non abusives afin de faciliter le traitement du dossier.
        </p>
      </Block>
    </LegalShell>
  );
}

export function TermsOfSalePage() {
  return (
    <LegalShell
      kind="cgv"
      eyebrow="Vente en ligne"
      title="CGV Weello"
      intro="Les conditions de commande, paiement, livraison, annulation, remboursement et avantages Weello applicables aux clients."
      icon={<ShieldCheck size={28} />}
    >
      <WarningBlock />
      <Block title="Commande">
        <p>
          Le client sélectionne les produits proposés par un établissement partenaire, vérifie le panier, les frais applicables
          et confirme la commande avec paiement sécurisé. La commande devient ferme après confirmation du paiement et acceptation
          par les systèmes Weello et/ou l’établissement concerné.
        </p>
      </Block>
      <Block title="Prix et frais">
        <p>
          Les prix des produits sont indiqués en euros toutes taxes comprises lorsque cela est applicable. Weello peut appliquer
          des frais de service et des frais de livraison, notamment selon la distance réelle calculée par le fournisseur de
          routage serveur. Les éventuelles promotions ou points de fidélité sont affichés avant paiement.
        </p>
      </Block>
      <Block title="Livraison">
        <p>
          Les estimations de livraison sont indicatives et peuvent varier selon la préparation, la circulation, la météo, la
          disponibilité des livreurs et les informations d’adresse fournies par le client. Le client doit être joignable et
          renseigner une adresse complète.
        </p>
      </Block>
      <Block title="Annulation, remboursement et avoirs">
        <p>
          Les conditions d’annulation dépendent de l’avancement de la commande. En cas d’incident confirmé, Weello peut proposer
          un remboursement, un geste commercial ou une compensation en points Weello selon le cas traité par le support.
        </p>
      </Block>
      <Block title="Droit de rétractation">
        <p>
          Les produits alimentaires préparés ou périssables peuvent être exclus du droit de rétractation dans les conditions
          prévues par le droit applicable. Les cas spécifiques doivent être analysés par le support Weello.
        </p>
      </Block>
      <Block title="Médiation de la consommation">
        <p>
          Les coordonnées du médiateur de la consommation choisi par Weello doivent être ajoutées avant le lancement public.
          Cette information est obligatoire pour les litiges non résolus avec un consommateur.
        </p>
      </Block>
    </LegalShell>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalShell
      kind="privacy"
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      intro="Une explication claire des données collectées, des finalités, de la durée de conservation et des droits des utilisateurs."
      icon={<LockKeyhole size={28} />}
    >
      <WarningBlock />
      <Block title="Données collectées">
        <p>
          Weello peut collecter les données d’identification, de contact, d’adresse, de commande, de paiement, de support,
          de localisation nécessaire à la livraison, ainsi que les documents professionnels transmis par les partenaires et
          livreurs pour validation.
        </p>
      </Block>
      <Block title="Finalités">
        <p>
          Les données sont utilisées pour créer et sécuriser les comptes, gérer les préinscriptions, traiter les commandes,
          calculer les frais et estimations de livraison, assurer le support, prévenir la fraude, gérer les obligations
          comptables, administrer les validations professionnelles et informer les utilisateurs du lancement Weello.
        </p>
      </Block>
      <Block title="Bases légales">
        <p>
          Selon le traitement, Weello s’appuie sur l’exécution du contrat ou de mesures précontractuelles, le respect
          d’obligations légales, l’intérêt légitime de sécurité et de prévention de la fraude, et le consentement lorsque
          celui-ci est requis.
        </p>
      </Block>
      <Block title="Destinataires et sous-traitants">
        <p>
          Les données peuvent être transmises uniquement aux personnes habilitées chez Weello, aux prestataires techniques
          nécessaires au service, aux prestataires de paiement, d’emailing, d’hébergement et, lorsque nécessaire, aux partenaires
          ou livreurs strictement concernés par une commande.
        </p>
      </Block>
      <Block title="Durées de conservation">
        <p>
          Les données sont conservées pendant la durée nécessaire aux finalités décrites, puis archivées ou supprimées selon
          les obligations légales applicables. Les documents justificatifs professionnels doivent faire l’objet d’une durée
          de conservation limitée et contrôlée.
        </p>
      </Block>
      <Block title="Droits des personnes">
        <p>
          Les utilisateurs peuvent demander l’accès, la rectification, l’effacement, la limitation, l’opposition ou la portabilité
          de leurs données lorsque ces droits s’appliquent. Contact :{" "}
          <a className="text-foodiz-gold" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>{WEELLO_LEGAL_IDENTITY.email}</a>.
        </p>
      </Block>
    </LegalShell>
  );
}

export function CookiesPolicyPage() {
  return (
    <LegalShell
      kind="cookies"
      eyebrow="Traceurs"
      title="Politique cookies"
      intro="Les règles d’utilisation des cookies et traceurs nécessaires au fonctionnement, à la sécurité et à la mesure d’audience."
      icon={<Cookie size={28} />}
    >
      <WarningBlock />
      <Block title="Cookies nécessaires">
        <p>
          Weello peut utiliser des traceurs nécessaires au fonctionnement du service : session, sécurité, authentification,
          panier, préférences essentielles et prévention de la fraude. Ces traceurs ne nécessitent pas toujours un consentement.
        </p>
      </Block>
      <Block title="Mesure d’audience et marketing">
        <p>
          Les traceurs de mesure d’audience non strictement nécessaires, de personnalisation ou de publicité ne doivent être
          déposés qu’après consentement lorsque la réglementation l’exige. Le choix de l’utilisateur doit pouvoir être retiré.
        </p>
      </Block>
      <Block title="Gestion du consentement">
        <p>
          Avant d’ajouter des outils marketing ou analytics avancés, Weello devra intégrer un bandeau ou panneau de préférences
          permettant d’accepter, refuser ou paramétrer les cookies concernés.
        </p>
      </Block>
    </LegalShell>
  );
}
