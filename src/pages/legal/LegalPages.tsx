import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Cookie,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from "lucide-react";

type LegalPageKind = "notice" | "cgu" | "cgv" | "privacy" | "cookies";

const LEGAL_UPDATED_AT = "6 juillet 2026";

const WEELLO_LEGAL_IDENTITY = {
  brand: "Weello",
  legalName: "Sara Larsen, entrepreneur individuel",
  legalForm: "Entrepreneur individuel (EI)",
  entrepreneur: "Sara Larsen",
  businessName: "Weello",
  registeredOffice: "9 rue Maubec, 40000 Mont-de-Marsan, France",
  siret: "822 183 364 00014",
  siren: "822 183 364",
  vat: "TVA non applicable, article 293 B du Code général des impôts",
  publicationDirector: "Sara Larsen",
  email: "contact@weello.co",
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
    <div className="min-h-screen bg-[#050504] text-weello-cream">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(216,168,79,.16),transparent_28%),linear-gradient(180deg,#11100d_0%,#050505_34%,#060604_100%)]" />
      <header className="border-b border-weello-gold/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-full border border-weello-gold/20 px-3 py-2 text-xs font-semibold text-weello-gold transition hover:bg-weello-gold/10"
          >
            <ArrowLeft size={15} />
            Retour
          </button>
          <Link to="/auth" className="font-serif text-xl font-bold italic text-weello-gold">
            Weello
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <section className="rounded-[2rem] border border-weello-gold/20 bg-[linear-gradient(145deg,rgba(216,168,79,.13),rgba(13,13,13,.98)_42%,rgba(5,5,5,.98))] p-6 shadow-[0_30px_90px_rgba(0,0,0,.45)] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.32em] text-weello-gold">{eyebrow}</p>
              <h1 className="mt-4 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-weello-gray sm:text-base">
                {intro}
              </p>
              <p className="mt-4 text-xs text-weello-gray/70">Version du {LEGAL_UPDATED_AT}</p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-weello-gold/30 bg-weello-gold/10 text-weello-gold shadow-[0_0_35px_rgba(216,168,79,.18)]">
              {icon}
            </div>
          </div>
        </section>

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Documents juridiques">
          {legalNav.map((item) => {
            const active = item.kind === kind;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-weello-gold bg-weello-gold text-weello-black"
                    : "border-weello-gold/20 text-weello-gold hover:bg-weello-gold/10"
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
    <article className="rounded-[1.5rem] border border-weello-gold/12 bg-white/[0.025] p-5 sm:p-6">
      <h2 className="font-serif text-2xl font-semibold text-weello-cream">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-weello-gray">{children}</div>
    </article>
  );
}

function BulletList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-weello-gold">{children}</ul>;
}

function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-weello-gold underline decoration-weello-gold/35 underline-offset-4 hover:text-weello-gold-light"
    >
      {children}
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function PrelaunchLegalNotice() {
  return (
    <div className="rounded-[1.4rem] border border-amber-300/25 bg-amber-300/[0.06] p-4 text-xs leading-6 text-amber-100/90">
      <strong>Version juridique pré-lancement.</strong> Le modèle opérationnel Weello est décrit ci-dessous.
      Avant l’ouverture des paiements réels, le numéro de téléphone professionnel, l’identité postale exacte de
      l’hébergeur contractuel et les coordonnées du médiateur de la consommation devront être ajoutés. Le rôle
      juridique de Weello dans l’encaissement marketplace devra également être confirmé avec le prestataire de
      paiement et un professionnel du droit.
    </div>
  );
}

export function LegalNoticePage() {
  return (
    <LegalShell
      kind="notice"
      eyebrow="Transparence"
      title="Mentions légales"
      intro="L’identité de l’éditeur des services web et mobiles Weello et les principales informations réglementaires."
      icon={<Scale size={28} />}
    >
      <PrelaunchLegalNotice />

      <Block title="Éditeur">
        <p>Nom commercial : {WEELLO_LEGAL_IDENTITY.businessName}</p>
        <p>Éditeur : {WEELLO_LEGAL_IDENTITY.legalName}</p>
        <p>Forme juridique : {WEELLO_LEGAL_IDENTITY.legalForm}</p>
        <p>Adresse professionnelle : {WEELLO_LEGAL_IDENTITY.registeredOffice}</p>
        <p>SIREN : {WEELLO_LEGAL_IDENTITY.siren}</p>
        <p>SIRET : {WEELLO_LEGAL_IDENTITY.siret}</p>
        <p>{WEELLO_LEGAL_IDENTITY.vat}.</p>
      </Block>

      <Block title="Publication et contact">
        <p>Directrice de la publication : {WEELLO_LEGAL_IDENTITY.publicationDirector}</p>
        <p>
          Contact général et données personnelles :{" "}
          <a className="text-weello-gold underline underline-offset-4" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>
            {WEELLO_LEGAL_IDENTITY.email}
          </a>
        </p>
        <p>Numéro de téléphone professionnel : à renseigner avant le lancement public.</p>
      </Block>

      <Block title="Hébergement et infrastructure">
        <p>
          Le site et les fonctions web sont déployés au moyen de Vercel. Les mentions contractuelles actualisées
          du prestataire sont disponibles dans son{" "}
          <LegalLink href="https://vercel.com/legal">centre juridique officiel</LegalLink>.
        </p>
        <p>
          L’authentification, la base de données et le stockage privé de justificatifs s’appuient sur Supabase.
          Les paiements sont traités par Stripe ; Weello ne reçoit pas le cryptogramme de la carte bancaire.
        </p>
        <p>
          L’entité d’hébergement contractuellement responsable et son adresse postale doivent être recopiées
          depuis le contrat Vercel actif avant publication définitive de ces mentions.
        </p>
      </Block>

      <Block title="Propriété intellectuelle">
        <p>
          La marque, le nom, les interfaces, textes, éléments graphiques et contenus propres à Weello sont protégés.
          Les partenaires restent titulaires ou responsables des droits sur leurs marques, photographies, cartes,
          descriptions et autres contenus transmis à la plateforme.
        </p>
        <p>
          Toute reproduction ou exploitation non autorisée d’un élément protégé est interdite, sauf exception
          légale ou autorisation écrite du titulaire concerné.
        </p>
      </Block>

      <Block title="Signalement">
        <p>
          Un contenu illicite, trompeur, portant atteinte à un droit ou présentant un risque pour la sécurité peut
          être signalé à {WEELLO_LEGAL_IDENTITY.email}, avec l’URL ou l’écran concerné, le motif et les justificatifs utiles.
        </p>
      </Block>
    </LegalShell>
  );
}

export function TermsOfUsePage() {
  return (
    <LegalShell
      kind="cgu"
      eyebrow="Utilisation de la plateforme"
      title="Conditions générales d’utilisation"
      intro="Les règles communes aux clients, partenaires et livreurs utilisant le site ou l’application Weello."
      icon={<FileCheck2 size={28} />}
    >
      <PrelaunchLegalNotice />

      <Block title="1. Objet et acceptation">
        <p>
          Weello fournit une plateforme numérique permettant à des clients de découvrir et commander des produits
          auprès de partenaires professionnels, et d’organiser leur livraison par des livreurs professionnels validés.
        </p>
        <p>
          La création d’un compte ou l’utilisation d’un espace authentifié implique l’acceptation des présentes CGU.
          Les CGV s’appliquent en complément lors d’une commande ou de la souscription à un service payant.
        </p>
      </Block>

      <Block title="2. Comptes et sécurité">
        <BulletList>
          <li>Les informations fournies doivent être exactes, complètes et maintenues à jour.</li>
          <li>Un compte est personnel ; les identifiants ne doivent pas être partagés.</li>
          <li>L’utilisateur doit signaler rapidement tout accès suspect ou toute usurpation.</li>
          <li>Weello peut demander une vérification proportionnée lorsqu’un risque de fraude est identifié.</li>
          <li>Le rôle attribué au compte dépend du parcours choisi et ne peut pas être modifié librement.</li>
        </BulletList>
        <p>
          L’utilisateur doit disposer de la capacité juridique nécessaire. Un mineur ne peut utiliser le service que
          dans les conditions permises par la loi et sous la responsabilité de son représentant légal. Les produits
          soumis à une restriction d’âge restent interdits aux personnes qui ne remplissent pas cette condition.
        </p>
      </Block>

      <Block title="3. Espace client">
        <p>
          Le client peut gérer ses adresses, consulter les partenaires disponibles dans sa zone, commander, suivre
          une livraison, utiliser ses avantages et contacter l’assistance. Si aucun partenaire n’est disponible, il
          peut demander à être informé du déploiement de Weello dans sa ville.
        </p>
        <p>
          Le client est responsable de l’exactitude de son adresse, des indications d’accès, de sa disponibilité à
          la remise et du code de livraison confidentiel affiché dans son espace.
        </p>
      </Block>

      <Block title="4. Espace partenaire">
        <p>
          Un partenaire doit justifier de son activité, fournir les documents réglementaires adaptés à celle-ci et
          attendre la validation de Weello avant toute activation commerciale. La validation ne transfère pas à
          Weello les obligations sanitaires, fiscales, sociales, assurantielles ou d’information du vendeur.
        </p>
        <p>
          Le partenaire est responsable de sa carte, de ses prix de référence, disponibilités, photographies,
          ingrédients, allergènes, licences, délais de préparation et conformité des produits remis au livreur.
          Les offres et contenus promotionnels doivent être loyaux et vérifiables.
        </p>
      </Block>

      <Block title="5. Espace livreur">
        <p>
          Un livreur doit exercer légalement, transmettre une pièce d’identité et un justificatif d’activité lisibles,
          disposer des assurances et équipements nécessaires, puis obtenir la validation de Weello. Tant que le dossier
          n’est pas approuvé, aucune course ni rémunération n’est proposée.
        </p>
        <p>
          Le livreur demeure responsable de ses obligations professionnelles. Il doit préserver l’intégrité des produits,
          respecter les consignes de retrait et de remise, utiliser le numéro de commande prévu au retrait et ne jamais
          demander au client son mot de passe ou ses données de paiement.
        </p>
      </Block>

      <Block title="6. Géolocalisation et suivi">
        <p>
          La géolocalisation du livreur est utilisée lorsqu’il se déclare disponible et pendant une livraison pour le
          dispatch, l’itinéraire, l’estimation d’arrivée, le suivi client, la sécurité et le traitement des incidents.
          Le partage doit cesser lorsque ces finalités ne le justifient plus.
        </p>
        <p>
          Le client voit uniquement la position utile au suivi de sa commande active. Le partenaire et le livreur
          n’accèdent qu’aux informations nécessaires à la commande qui les concerne. Le refus d’une permission peut
          rendre indisponible une fonctionnalité nécessitant techniquement la position.
        </p>
      </Block>

      <Block title="7. Référencement et classement">
        <p>
          Seuls les établissements validés et actifs peuvent être proposés aux clients. Le classement par défaut tient
          principalement compte de l’éligibilité à la livraison, de la distance avec l’adresse choisie, des filtres saisis,
          de la disponibilité et de la correspondance avec la recherche. Les produits peuvent ensuite être présentés par
          catégorie et par nom.
        </p>
        <p>
          Weello entretient une relation contractuelle et peut percevoir une rémunération liée aux commandes ou aux
          services professionnels. Une campagne ou mise en avant payante doit être identifiable comme telle et ne doit
          pas modifier silencieusement le classement naturel.
        </p>
      </Block>

      <Block title="8. Avis, messages et contenus">
        <p>
          Les contenus publiés doivent être sincères, pertinents, licites et respectueux. Sont interdits les faux avis,
          contenus discriminatoires ou menaçants, atteintes à la vie privée, publicités trompeuses et messages non sollicités.
          Weello peut modérer ou retirer un contenu manifestement illicite ou contraire aux présentes règles.
        </p>
      </Block>

      <Block title="9. Usages interdits et lutte contre la fraude">
        <BulletList>
          <li>Créer des comptes multiples pour détourner des offres, points ou parrainages.</li>
          <li>Falsifier une identité, un SIRET, un justificatif, une position ou un statut de commande.</li>
          <li>Contourner les contrôles d’accès, explorer des données d’autrui ou perturber le service.</li>
          <li>Organiser hors plateforme une transaction issue de Weello afin d’éluder les règles applicables.</li>
          <li>Utiliser les coordonnées reçues pour une finalité étrangère à la commande.</li>
        </BulletList>
      </Block>

      <Block title="10. Suspension, validation et clôture">
        <p>
          Weello peut limiter, suspendre ou fermer un compte en cas de dossier invalide, fraude, risque de sécurité,
          obligation légale, incident grave ou manquement contractuel. Lorsque la situation le permet, l’utilisateur
          est informé du motif et peut transmettre ses observations au support.
        </p>
        <p>
          La suppression d’un compte peut être demandée depuis l’espace prévu ou par email. Certaines informations
          restent archivées lorsqu’une obligation légale, comptable ou la défense d’un droit l’exige.
        </p>
      </Block>

      <Block title="11. Disponibilité et évolution">
        <p>
          Weello met en œuvre des moyens raisonnables pour maintenir le service, sans garantir une disponibilité
          ininterrompue. Des maintenances, incidents réseau, indisponibilités de prestataires ou cas de force majeure
          peuvent affecter temporairement certaines fonctions.
        </p>
        <p>
          Les CGU peuvent évoluer pour refléter une modification légale ou fonctionnelle. Une modification substantielle
          est portée à la connaissance des utilisateurs par un moyen approprié avant son entrée en vigueur lorsque la loi l’exige.
        </p>
      </Block>

      <Block title="12. Droit applicable et réclamations">
        <p>
          Les présentes CGU sont soumises au droit français, sans priver un consommateur des règles impératives qui lui
          sont applicables. Une réclamation doit d’abord être adressée à{" "}
          <a className="text-weello-gold" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>
            {WEELLO_LEGAL_IDENTITY.email}
          </a>.
        </p>
      </Block>
    </LegalShell>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span>{label}</span>
      <strong className="text-right text-weello-cream">{value}</strong>
    </div>
  );
}

export function TermsOfSalePage() {
  return (
    <LegalShell
      kind="cgv"
      eyebrow="Commandes et services payants"
      title="Conditions générales de vente"
      intro="Les conditions applicables aux commandes clients et, lorsque cela est précisé, aux abonnements professionnels Weello+."
      icon={<ShieldCheck size={28} />}
    >
      <PrelaunchLegalNotice />

      <Block title="1. Champ d’application et intervenants">
        <p>
          Les présentes CGV encadrent les commandes passées à distance sur Weello. Le partenaire identifié sur sa fiche
          est le professionnel qui propose, prépare et vend ses produits, sauf indication contraire affichée avant paiement.
          Weello fournit le service d’intermédiation, calcule le prix final, organise le paiement et la livraison.
        </p>
        <p>
          Le récapitulatif de commande identifie l’établissement, les produits, quantités, prix, réductions, frais,
          adresse et estimation avant toute obligation de payer.
        </p>
      </Block>

      <Block title="2. Informations sur les produits">
        <p>
          Le partenaire renseigne les caractéristiques essentielles, disponibilités et informations réglementaires.
          Pour les denrées alimentaires, il doit notamment fournir les informations relatives aux allergènes et, selon
          la nature du produit, les mentions d’origine, de composition ou d’usage exigées avant la vente à distance.
        </p>
        <p>
          Les photographies sont illustratives, mais la nature et la quantité du produit livré doivent correspondre à
          la commande. Une demande particulière ne vaut acceptation qu’après confirmation explicite du partenaire.
        </p>
      </Block>

      <Block title="3. Prix des produits et modèle tarifaire">
        <p>
          Tous les montants dus par le client sont affichés en euros avant paiement. Le prix public d’un article est
          calculé à partir du prix partenaire effectif, auquel s’ajoute le supplément Weello correspondant à sa tranche :
        </p>
        <div className="rounded-2xl border border-weello-gold/15 bg-black/30 px-4 py-2">
          <PriceRow label="Prix partenaire de 0,50 € à 3,50 €" value="+ 1,50 € par article" />
          <PriceRow label="Prix partenaire de 3,51 € à 8,49 €" value="+ 2,90 € par article" />
          <PriceRow label="Prix partenaire à partir de 8,50 €" value="+ 4,10 € par article" />
        </div>
        <p>
          Une promotion partenaire réduit d’abord le prix partenaire de référence ; le prix public est ensuite recalculé
          selon la tranche correspondante. Le prix affiché au panier et confirmé par le serveur au moment du paiement prévaut.
        </p>
      </Block>

      <Block title="4. Frais de service et de livraison">
        <p>Les frais de service sont calculés selon le nombre total d’articles dans la commande :</p>
        <div className="rounded-2xl border border-weello-gold/15 bg-black/30 px-4 py-2">
          <PriceRow label="1 article" value="1,99 €" />
          <PriceRow label="2 articles" value="1,49 €" />
          <PriceRow label="3 articles" value="1,19 €" />
          <PriceRow label="4 articles ou plus" value="0,99 €" />
        </div>
        <p>
          La livraison coûte 3,50 € jusqu’à 5 kilomètres. Au-delà, 0,60 € est ajouté par kilomètre commencé.
          La distance routière est calculée côté serveur entre le partenaire et l’adresse de livraison. Une distance
          supérieure à 25 kilomètres est actuellement hors zone technique de commande.
        </p>
        <p>
          Une estimation peut utiliser temporairement une distance de secours lorsque le fournisseur d’itinéraire est
          indisponible. Le montant total définitif reste présenté avant paiement.
        </p>
      </Block>

      <Block title="5. Formation de la commande">
        <p>
          Le client vérifie son panier, son adresse et le prix total, puis confirme le bouton indiquant l’obligation de
          paiement. Une commande n’est transmise comme payée qu’après confirmation du prestataire de paiement.
        </p>
        <p>
          Le partenaire peut accepter ou refuser une commande selon la disponibilité réelle. Une commande refusée après
          paiement donne lieu à l’annulation et au remboursement des sommes encaissées selon le moyen de paiement initial,
          ainsi qu’à la restitution des avantages réservés lorsque cela s’applique.
        </p>
      </Block>

      <Block title="6. Paiement">
        <p>
          Le paiement par carte est sécurisé par Stripe. Weello conserve des références de transaction utiles au suivi,
          mais ne stocke ni le numéro complet de carte ni son cryptogramme. Une authentification renforcée peut être
          demandée par l’établissement bancaire.
        </p>
        <p>
          En cas de refus, expiration ou suspicion de fraude, la commande n’est pas confirmée. Le client ne doit jamais
          transmettre ses informations bancaires par email, téléphone ou messagerie à un partenaire ou à un livreur.
        </p>
      </Block>

      <Block title="7. Préparation, livraison et suivi">
        <p>
          L’estimation résulte du délai de préparation annoncé, de la distance et de l’itinéraire. Elle reste indicative
          et peut évoluer en raison de la circulation, de la météo, d’un accès difficile, d’un incident ou d’un cas de force majeure.
        </p>
        <p>
          Le suivi devient disponible selon l’avancement de la commande. Lorsque le livreur a récupéré les produits, sa
          position utile à la livraison peut être affichée en temps réel au client. La remise est sécurisée par le code
          ou le mécanisme de confirmation prévu dans l’application.
        </p>
      </Block>

      <Block title="8. Obligations du client lors de la remise">
        <BulletList>
          <li>Fournir une adresse complète, accessible et située dans la zone annoncée.</li>
          <li>Rester joignable avec le numéro associé au compte.</li>
          <li>Être présent ou désigner une personne autorisée à réceptionner.</li>
          <li>Ne communiquer le code de livraison qu’au moment de la remise effective.</li>
          <li>Contrôler rapidement l’état apparent de la commande et signaler l’incident avec des éléments utiles.</li>
        </BulletList>
        <p>
          Un échec de remise imputable à une adresse erronée, à l’absence prolongée ou à l’impossibilité de joindre le
          client peut limiter le remboursement, sous réserve des règles impératives applicables.
        </p>
      </Block>

      <Block title="9. Annulation et remboursement">
        <p>
          Avant la confirmation du paiement, le client peut abandonner ou annuler le parcours. Après paiement, la
          possibilité d’annuler dépend de l’état réel de préparation et des produits ; elle n’est donc pas garantie.
          Le client doit utiliser le centre d’aide dès qu’un incident survient.
        </p>
        <p>
          En cas de non-livraison, commande refusée, produit manquant, erreur ou non-conformité confirmée, Weello et le
          partenaire examinent les preuves disponibles. La solution peut être un remboursement total ou partiel sur le
          moyen d’origine, la restitution de points ou un geste commercial, sans réduire les droits légaux du consommateur.
        </p>
      </Block>

      <Block title="10. Droit de rétractation">
        <p>
          Le droit de rétractation de quatorze jours ne s’applique notamment pas aux biens susceptibles de se détériorer
          ou de se périmer rapidement, ni aux biens confectionnés selon les spécifications du client. Il est donc en
          principe exclu pour les repas préparés et de nombreuses denrées périssables, conformément à l’article L.221-28
          du Code de la consommation.
        </p>
        <p>
          Pour un produit non périssable ne relevant d’aucune exception, le droit de rétractation légal demeure applicable.
          Le client peut contacter Weello afin d’obtenir les instructions adaptées au vendeur et au produit concerné.
        </p>
      </Block>

      <Block title="11. Garanties et réclamations">
        <p>
          Les garanties légales applicables aux produits non alimentaires ne sont pas écartées par les présentes CGV.
          Pour une denrée, le partenaire demeure responsable de sa sécurité, de sa conformité et des informations
          alimentaires obligatoires. Weello reste responsable de ses propres obligations de plateforme et de service.
        </p>
        <p>
          Une réclamation doit indiquer le numéro de commande, le problème, les produits concernés et, si utile, des
          photographies. Elle peut être adressée depuis le centre d’aide ou à {WEELLO_LEGAL_IDENTITY.email}.
        </p>
      </Block>

      <Block title="12. Fidélité, parrainage et compensations">
        <p>
          Les points Weello sont des unités promotionnelles personnelles, non cessibles, sans valeur monétaire autonome
          et non convertibles en espèces. Leur valeur dépend de l’avantage affiché lors de leur utilisation. Les conditions
          d’éligibilité, minimums de commande, catégories et dates de validité sont présentés dans l’espace Avantages.
        </p>
        <p>
          Un parrainage n’est crédité qu’après une première commande effectivement payée et acceptée selon les règles du
          programme. Une fraude, annulation ou remboursement peut entraîner l’annulation des points correspondants.
        </p>
        <p>
          Lorsqu’une estimation d’arrivée vérifiée est dépassée après retrait chez le partenaire, le programme peut créditer
          50 points pour un retard de 10 à 15 minutes, 100 points au-delà de 15 et jusqu’à 20 minutes, puis 200 points au-delà
          de 20 minutes. Les cas de force majeure, informations GPS insuffisantes ou décision administrative peuvent rendre
          la règle inapplicable ou justifier une correction auditée.
        </p>
      </Block>

      <Block title="13. Abonnements professionnels Weello+">
        <p>
          Les partenaires validés peuvent souscrire un abonnement mensuel ou annuel donnant accès à un quota de campagnes
          et aux fonctions affichées dans leur espace. Le prix, la périodicité, les limites et l’éventuelle économie annuelle
          sont présentés avant paiement et prévalent sur toute présentation antérieure.
        </p>
        <p>
          Les abonnements sont gérés par Stripe. Le partenaire peut consulter la facturation et demander l’annulation depuis
          le portail prévu. La date d’effet de l’annulation et l’accès restant sont ceux indiqués dans le portail au moment
          de la confirmation. Sauf disposition impérative contraire, les services déjà consommés ne sont pas remboursés.
        </p>
        <p>
          Pour les retards de paiement entre professionnels, les documents contractuels ou factures doivent préciser les
          pénalités applicables et l’indemnité forfaitaire légale de 40 € pour frais de recouvrement.
        </p>
      </Block>

      <Block title="14. Médiation et droit applicable">
        <p>
          Après une réclamation écrite préalable restée sans solution, le consommateur peut recourir gratuitement au
          médiateur de la consommation dont les coordonnées seront renseignées ici avant le lancement public. Cette
          démarche n’empêche pas de saisir la juridiction compétente.
        </p>
        <p>
          Les présentes CGV sont soumises au droit français. Pour un consommateur, les règles impératives de compétence
          et de protection restent applicables.
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
      intro="Les données utilisées par Weello, leurs finalités, leurs destinataires, leur conservation et vos droits."
      icon={<LockKeyhole size={28} />}
    >
      <PrelaunchLegalNotice />

      <Block title="1. Responsable du traitement">
        <p>
          Le responsable des traitements décrits dans cette politique est {WEELLO_LEGAL_IDENTITY.legalName},
          nom commercial {WEELLO_LEGAL_IDENTITY.brand}, située {WEELLO_LEGAL_IDENTITY.registeredOffice}.
        </p>
        <p>
          Pour toute question ou demande relative aux données :{" "}
          <a className="text-weello-gold" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>
            {WEELLO_LEGAL_IDENTITY.email}
          </a>.
        </p>
      </Block>

      <Block title="2. Données traitées">
        <BulletList>
          <li>Compte : identité, rôle, email, téléphone, mot de passe chiffré par le service d’authentification et consentements.</li>
          <li>Adresse : adresse postale, ville, code postal et coordonnées géographiques calculées pour la zone et la livraison.</li>
          <li>Commande : panier, produits, établissement, montants, statuts, code de remise, incidents, avis et historique.</li>
          <li>Paiement : montant, statut et références Stripe ; Weello ne stocke pas le numéro complet ni le cryptogramme.</li>
          <li>Fidélité : solde, avantages, parrainage, compensations et historique des opérations.</li>
          <li>Support : messages, pièces jointes, diagnostics et actions prises pour traiter une demande.</li>
          <li>Professionnels : SIRET, activité, disponibilités, assurances, justificatifs réglementaires et décisions de validation.</li>
          <li>Livreurs : position en ligne, parcours de livraison, précision GPS, horaires, performance, rémunérations et incidents.</li>
          <li>Technique : adresse IP, appareil, journaux de sécurité, erreurs, tentatives d’accès et événements nécessaires au service.</li>
          <li>Communication : préférences marketing, notifications envoyées et interactions utiles à la preuve du consentement ou du désabonnement.</li>
        </BulletList>
      </Block>

      <Block title="3. Finalités et bases légales">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="text-weello-gold">
              <tr>
                <th className="border-b border-weello-gold/15 px-3 py-3">Finalité</th>
                <th className="border-b border-weello-gold/15 px-3 py-3">Base principale</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border-b border-white/5 px-3 py-3">Créer le compte, traiter une commande, livrer, assister et facturer</td><td className="border-b border-white/5 px-3 py-3">Contrat ou mesures précontractuelles</td></tr>
              <tr><td className="border-b border-white/5 px-3 py-3">Vérifier et administrer les dossiers partenaires et livreurs</td><td className="border-b border-white/5 px-3 py-3">Contrat, obligations légales et intérêt légitime de sécurité</td></tr>
              <tr><td className="border-b border-white/5 px-3 py-3">Calculer les distances, dispatcher et afficher le suivi de livraison</td><td className="border-b border-white/5 px-3 py-3">Exécution du service ; permission technique du téléphone lorsqu’elle est nécessaire</td></tr>
              <tr><td className="border-b border-white/5 px-3 py-3">Prévenir la fraude, protéger les comptes et défendre des droits</td><td className="border-b border-white/5 px-3 py-3">Intérêt légitime et, selon le cas, obligation légale</td></tr>
              <tr><td className="border-b border-white/5 px-3 py-3">Tenir la comptabilité et répondre aux autorités compétentes</td><td className="border-b border-white/5 px-3 py-3">Obligation légale</td></tr>
              <tr><td className="px-3 py-3">Envoyer des offres et campagnes commerciales</td><td className="px-3 py-3">Consentement lorsque requis, avec retrait possible à tout moment</td></tr>
            </tbody>
          </table>
        </div>
      </Block>

      <Block title="4. Géolocalisation">
        <p>
          L’adresse du client et du partenaire est géocodée côté serveur pour rechercher une zone, calculer la route,
          le tarif et l’estimation. La position précise du livreur est utilisée lorsqu’il choisit d’être en ligne et
          pendant la course. Elle n’a pas vocation à suivre sa vie privée hors disponibilité ou hors livraison.
        </p>
        <p>
          Pendant une commande active, le client concerné peut recevoir la position nécessaire au suivi. Le livreur
          reçoit l’adresse du client uniquement lorsqu’elle est nécessaire à sa mission. La permission peut être
          désactivée dans les réglages du téléphone, mais les fonctionnalités dépendantes deviennent alors indisponibles.
        </p>
      </Block>

      <Block title="5. Destinataires">
        <BulletList>
          <li>Personnel Weello habilité, selon ses missions et avec des accès limités.</li>
          <li>Partenaire concerné : informations nécessaires à la préparation et à la remise de sa commande.</li>
          <li>Livreur affecté : adresse, prénom, téléphone utile et instructions nécessaires à la livraison.</li>
          <li>Client concerné : identité d’affichage et position utile du livreur pendant le suivi.</li>
          <li>Prestataires techniques : Supabase, Vercel, Stripe, Resend et OpenRouteService, dans la mesure nécessaire.</li>
          <li>Conseils, assureurs, autorités ou juridictions lorsqu’une obligation légale ou la défense d’un droit le justifie.</li>
        </BulletList>
        <p>
          Les partenaires n’obtiennent pas un fichier exportable des clients pour leur propre prospection. Les campagnes
          Weello+ sont adressées par la plateforme aux audiences éligibles et doivent respecter les préférences applicables.
        </p>
      </Block>

      <Block title="6. Transferts hors Espace économique européen">
        <p>
          Certains prestataires internationaux peuvent traiter des données en dehors de l’Espace économique européen.
          Weello doit vérifier les localisations configurées et encadrer les transferts par une décision d’adéquation,
          les clauses contractuelles types de la Commission européenne ou tout autre mécanisme légal approprié.
        </p>
        <p>
          Les informations de paiement sont également traitées selon la politique de confidentialité de{" "}
          <LegalLink href="https://stripe.com/fr/privacy">Stripe</LegalLink>.
        </p>
      </Block>

      <Block title="7. Durées de conservation">
        <BulletList>
          <li>Compte et données opérationnelles : pendant la relation active, puis suppression ou archivage limité selon les obligations et litiges en cours.</li>
          <li>Données utilisées pour la prospection : relation commerciale puis trois ans après sa fin ; prospect, trois ans après la collecte ou le dernier contact.</li>
          <li>Commandes, contrats, réclamations et preuves commerciales : jusqu’à cinq ans, sauf durée légale différente.</li>
          <li>Factures et pièces comptables : dix ans à compter de la clôture de l’exercice concerné.</li>
          <li>Références de paiement utiles à une contestation : treize mois après le débit, ou quinze mois pour une carte à débit différé.</li>
          <li>Documents professionnels : pendant l’instruction et la relation, puis uniquement pendant la durée nécessaire à la conformité, au renouvellement ou à la défense d’un droit.</li>
          <li>Position en temps réel : pendant la disponibilité et la livraison ; les éléments de preuve associés à un incident sont archivés pour la durée nécessaire à son traitement.</li>
          <li>Choix d’opposition marketing : au moins trois ans afin de respecter la demande.</li>
        </BulletList>
        <p>
          À l’expiration de la durée applicable, les données sont supprimées, anonymisées ou placées en archivage
          intermédiaire avec des accès restreints. Le calendrier technique de purge doit être vérifié avant lancement.
        </p>
      </Block>

      <Block title="8. Sécurité">
        <p>
          Weello applique des contrôles d’accès par rôle, des politiques de sécurité en base, des communications chiffrées,
          des stockages privés pour les justificatifs, des liens temporaires, une journalisation des actions sensibles et
          une authentification renforcée de l’administration. Aucun système ne peut cependant garantir un risque nul.
        </p>
        <p>
          Une violation susceptible d’engendrer un risque est traitée conformément aux obligations de notification à la
          CNIL et, lorsqu’un risque élevé existe, d’information des personnes concernées.
        </p>
      </Block>

      <Block title="9. Vos droits">
        <p>
          Selon la base légale et les exceptions applicables, vous pouvez demander l’accès, la rectification, l’effacement,
          la limitation, l’opposition et la portabilité de vos données, ou retirer un consentement sans remettre en cause
          les traitements antérieurs.
        </p>
        <p>
          Adressez votre demande à {WEELLO_LEGAL_IDENTITY.email}. Weello répond en principe dans un délai d’un mois et peut
          demander un justificatif proportionné en cas de doute raisonnable sur l’identité. Vous pouvez également introduire
          une réclamation auprès de la{" "}
          <LegalLink href="https://www.cnil.fr/fr/plaintes">CNIL</LegalLink>.
        </p>
      </Block>

      <Block title="10. Décisions et scores">
        <p>
          Le dispatch peut utiliser la distance, la fraîcheur de la position, la disponibilité et un indicateur de priorité.
          Les retards vérifiés peuvent influencer cet indicateur. Un utilisateur peut demander au support une explication,
          signaler une donnée inexacte et solliciter un réexamen humain d’une décision qui affecte significativement son accès.
        </p>
      </Block>

      <Block title="11. Mise à jour de la politique">
        <p>
          Cette politique peut être modifiée en cas d’évolution du service, des prestataires ou du droit. La date de version
          est indiquée en tête. Une évolution substantielle est portée à la connaissance des personnes concernées lorsqu’une
          information ou un nouveau consentement est requis.
        </p>
      </Block>
    </LegalShell>
  );
}

export function CookiesPolicyPage() {
  return (
    <LegalShell
      kind="cookies"
      eyebrow="Traceurs et stockage local"
      title="Politique cookies"
      intro="Les stockages techniques actuellement utilisés par Weello et les règles applicables aux futurs traceurs optionnels."
      icon={<Cookie size={28} />}
    >
      <Block title="1. Situation actuelle">
        <p>
          Dans la version auditée au {LEGAL_UPDATED_AT}, Weello n’intègre pas d’outil publicitaire ni de mesure d’audience
          non essentielle. Le site et l’application utilisent uniquement des mécanismes techniques nécessaires à
          l’authentification, la sécurité, la conservation temporaire du panier, du parcours de paiement et de préférences utiles.
        </p>
      </Block>

      <Block title="2. Stockages strictement nécessaires">
        <BulletList>
          <li>Session d’authentification et renouvellement sécurisé de l’accès.</li>
          <li>Autorisation administrative temporaire et protection contre les tentatives répétées.</li>
          <li>Panier, commande en cours et retour depuis le prestataire de paiement.</li>
          <li>Préférences indispensables au fonctionnement demandé par l’utilisateur.</li>
          <li>Session temporaire de dépôt sécurisé de documents professionnels.</li>
        </BulletList>
        <p>
          Ces mécanismes sont utilisés pour fournir le service demandé ou assurer sa sécurité. Leur blocage dans le
          navigateur peut empêcher la connexion, le panier, le paiement ou certaines fonctionnalités.
        </p>
      </Block>

      <Block title="3. Traceurs optionnels">
        <p>
          Si Weello ajoute ultérieurement une mesure d’audience non exemptée, de la personnalisation publicitaire ou un
          traceur marketing, aucun dépôt ne devra intervenir avant un choix valable lorsque le consentement est requis.
          L’interface devra permettre d’accepter, refuser ou personnaliser avec la même simplicité.
        </p>
        <p>
          Un consentement optionnel pourra être retiré à tout moment depuis un panneau de préférences. Le refus ne devra
          pas empêcher l’utilisation des fonctions essentielles.
        </p>
      </Block>

      <Block title="4. Durée et réglages">
        <p>
          Les sessions temporaires expirent ou sont supprimées après leur finalité. Les préférences persistantes sont
          conservées pour une durée proportionnée. L’utilisateur peut effacer les données du site depuis son navigateur
          ou les données de l’application depuis les réglages de son appareil, au risque de devoir se reconnecter.
        </p>
      </Block>

      <Block title="5. Contact">
        <p>
          Toute question relative aux traceurs peut être adressée à{" "}
          <a className="text-weello-gold" href={`mailto:${WEELLO_LEGAL_IDENTITY.email}`}>
            {WEELLO_LEGAL_IDENTITY.email}
          </a>.
        </p>
      </Block>
    </LegalShell>
  );
}
