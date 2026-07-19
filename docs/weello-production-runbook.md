# Weello — ouverture de production

Cette procédure sépare les contrôles effectués dans le dépôt des opérations à
faire dans les consoles externes. Ne basculer le lancement public qu'après la
validation du parcours complet en environnement réel.

## État vérifié le 19 juillet 2026

- TypeScript web, fonctions et mobile : OK.
- Lint mobile : OK.
- Tests automatisés : 93 réussites sur 93.
- Build web : OK.
- `https://weello.app` et `https://www.weello.app` répondent en HTTPS sur
  Vercel.
- `GET /api/launch-status` répond correctement mais retourne `launched: false`.
  L'application est donc volontairement fermée au public.
- Le déploiement actuellement servi ne fournit pas encore les en-têtes de
  sécurité déclarés dans `vercel.json` sur la page publique. Le contrôle
  `npm run check:production-deployment` doit réussir après le prochain
  déploiement avant toute ouverture.

## 1. Supabase — à faire dans la console

1. Sauvegarder la base de production.
2. Exécuter et contrôler les migrations `42` à `47`, dans cet ordre.
3. Exécuter `npx supabase migration list` avec le projet lié : les versions
   locales et distantes doivent être identiques.
4. Dans **Authentication > URL Configuration**, définir le Site URL
   `https://weello.app` et ajouter les redirections web et mobiles :
   `https://weello.app/auth/callback`,
   `https://weello.app/auth/reset-password`,
   `weello://login` et `weello://reset-password`.
5. Créer un client, un partenaire et un livreur de test. Valider les deux
   dossiers professionnels et vérifier que leur ville passe en pilote.

## 2. Vercel — à faire dans la console

1. Ajouter les variables de production listées dans `.env.example`, y compris
   les six `STRIPE_PLAN_*`, `WEELLO_ALLOWED_ORIGINS` et
   `ALLOW_LIVE_PAYMENTS=true` uniquement au moment du passage Stripe Live.
2. Télécharger les variables dans un fichier temporaire, puis lancer :

   ```bash
   npm run check:production-env
   ```

3. Déployer le commit validé et vérifier les en-têtes réels avec :

   ```bash
   npm run check:production-deployment
   ```

   La page web doit notamment servir CSP, `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff` et la politique de permissions déclarées
   dans `vercel.json`. Si ce contrôle échoue, le bon projet Vercel ou le bon
   commit n'est pas encore déployé : ne pas ouvrir l'application.

## 3. Stripe — à faire dans le Dashboard

1. Créer les six prix live Weello+ et renseigner leurs identifiants dans
   Vercel.
2. Créer le webhook live `https://weello.app/api/stripe-webhook`, renseigner
   `STRIPE_WEBHOOK_SECRET`, puis vérifier sa réception.
3. Dans une fenêtre de lancement contrôlée, utiliser les clés live web et
   mobile, définir `ALLOW_LIVE_PAYMENTS=true`, effectuer une commande réelle
   de faible montant puis un remboursement admin.
4. Vérifier commande, règlement partenaire, gain livreur, fidélité, reçu et
   journal économique. Repasser les clés test si un contrôle échoue.

## 4. Expo, Apple et Google — à faire dans les comptes concernés

1. Transférer/renommer le projet Expo distant encore associé à `foodiz`. Ne
   modifier le `slug` local qu'après ce transfert et conserver le Project ID
   actuel.
2. Ajouter `GOOGLE_MAPS_API_KEY` à l'environnement EAS Production et la
   restreindre au package `app.weello` et à la signature EAS.
3. Publier les fichiers Apple Universal Links et Android App Links sur le
   domaine après réception du Team ID Apple et de l'empreinte Android.
4. Produire des builds preview iOS/Android, puis tester le parcours complet
   sur deux appareils physiques avant de créer les builds de production.

## 5. Décision d'ouverture

Conserver `launched: false` tant que les étapes précédentes ne sont pas
validées. Après recette signée, activer le lancement dans l'interface admin,
puis lancer `npm run check:production-deployment -- --expect-open` et faire
une commande réelle surveillée.
