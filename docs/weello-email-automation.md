# Weello — emails automatiques

Cette note décrit les emails transactionnels prévus côté serveur. Les clés email ne doivent jamais être exposées côté client.

## Variables serveur nécessaires

À renseigner dans l’environnement de production Netlify/Vercel :

- `RESEND_API_KEY`
- `WEELLO_EMAIL_FROM` — exemple : `Weello <contact@weello.co>`

## Emails envoyés automatiquement

- Confirmation de pré-inscription client, livreur ou partenaire.
- Accusé de réception des documents livreur.
- Accusé de réception des documents partenaire.
- Validation, refus ou demande de remplacement de documents professionnels.
- Réponse/clôture d’un ticket support depuis l’admin.

Chaque email est journalisé dans `public.foodiz_email_events` lorsque la migration 43 est appliquée.

## Emails de lancement

Les emails de lancement ne partent jamais automatiquement.

Ils sont déclenchés uniquement depuis l’admin, après décision officielle de lancement. Pour les partenaires et livreurs, l’envoi est filtré : seuls les dossiers validés/conformes peuvent recevoir l’accès.

## Comportement si Resend n’est pas configuré

- Les emails non critiques sont marqués comme `skipped` et ne bloquent pas l’inscription.
- Les emails de lancement sont critiques : si la configuration email manque, l’envoi échoue explicitement pour éviter un lancement silencieux.

## Sécurité

- Aucun appel Resend côté frontend.
- La clé `RESEND_API_KEY` reste côté fonctions serveur.
- Les liens de lancement utilisent des tokens dédiés.
- Les événements email permettent un audit admin sans exposer les secrets.
