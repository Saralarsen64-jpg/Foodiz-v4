# Weello — checklist App Store et Google Play

Dernière vérification technique : 10 juillet 2026.

## État automatisé

- Expo Doctor : 21/21.
- TypeScript web, fonctions et mobile : OK.
- ESLint mobile : OK.
- Tests sécurité, économie et routage : 93/93.
- Build web : OK.
- Export Metro iOS et Android : OK.
- Bundle ID iOS et package Android : `app.weello`.
- Icône Weello sans transparence : configurée sur iOS et Android.
- Suppression/anonymisation du compte : disponible dans chaque espace.
- Page publique de demande de suppression : `https://weello.app/suppression-compte`.
- CGU : case explicite obligatoire à l’inscription mobile.
- Mot de passe oublié et lien profond de récupération : implémentés.
- Suivi GPS : premier plan et arrière-plan pendant une course active.
- Carte client : carte native avec restaurant, livreur et destination.
- Produits et offres partenaires : création, modification, activation et calcul
  financier serveur.
- Centre d’aide : création et suivi des tickets dans l’application.

## Actions obligatoires avant les builds stores

1. Tester puis appliquer dans l’ordre les migrations Supabase `42` à `47`.
   Les migrations `46` (inscriptions professionnelles et activation des villes)
   et `47` (demandes de rappel assurance livreur) sont requises en plus de la
   migration de marque `45`. Vérifier ensuite que la liste des migrations
   locales et distantes est strictement identique.
2. Ajouter dans Supabase Auth > URL Configuration :
   - Site URL : `https://weello.app`
   - `weello://login`
   - `weello://reset-password`
   - `https://weello.app/**`
3. Ajouter `GOOGLE_MAPS_API_KEY` dans l’environnement EAS `production`.
   Restreindre cette clé à l’application Android `app.weello` et aux
   empreintes SHA de signature EAS.
4. Faire un build interne après ajout de la clé :

   ```bash
   cd mobile
   npx eas-cli@latest build --profile preview --platform all
   ```

5. Tester sur un vrai iPhone et un vrai Android :
   - création et confirmation du compte client ;
   - adresse et position ;
   - affichage des restaurants et épiciers à 10 km maximum ;
   - demande de déploiement lorsque la zone est vide ;
   - produit normal et produit en offre ;
   - paiement Stripe Test ;
   - préparation partenaire ;
   - acceptation et géolocalisation livreur ;
   - carte live client avec application livreur en arrière-plan ;
   - code de remise, points et reçu ;
   - création d’un ticket support ;
   - suppression de chaque type de compte test.
6. Renommer ou transférer le projet Expo distant `@foodiz.co/foodiz` vers
   le futur compte Weello depuis le
   tableau de bord Expo, puis seulement après remplacer le `slug` local.
   Conserver impérativement le Project ID existant.
7. Publier les fichiers Universal Links/App Links sur `weello.app` après
   obtention du Team ID Apple et de l’empreinte Android EAS.

## App Store Connect

- Souscrire au programme Apple Developer.
- Créer l’app avec le Bundle ID `app.weello`.
- Ajouter politique de confidentialité et URL d’assistance.
- Compléter les réponses App Privacy : identité, coordonnées, adresse,
  localisation précise pendant une livraison, achats, contenu support et
  identifiants.
- Déclarer la localisation en arrière-plan comme fonctionnalité réservée aux
  livreurs pendant une course active.
- Fournir à Apple un compte client, un compte partenaire validé et un compte
  livreur validé, avec les instructions de test.
- Préparer les captures iPhone demandées dans App Store Connect.
- Lancer d’abord TestFlight interne puis externe.

## Google Play Console

- Créer l’application `app.weello`.
- Effectuer le premier envoi Android manuellement.
- Compléter Data safety et fournir la politique de confidentialité.
- Compléter la déclaration de localisation en arrière-plan avec une vidéo
  montrant : course active, information préalable, autorisation et suivi client.
- Préparer icône, bannière, captures téléphone et textes de fiche.
- Utiliser d’abord le test interne, puis le test fermé.

## Paiements

L’environnement EAS Production utilise encore Stripe Test. C’est volontaire
pour les tests fermés. Pour ouvrir les paiements réels, effectuer dans une même
fenêtre contrôlée :

1. remplacer les clés Stripe côté mobile et serveur par les clés Live ;
2. créer et vérifier le webhook Live ;
3. définir `ALLOW_LIVE_PAYMENTS=true` côté serveur ;
4. exécuter un paiement réel de faible montant puis un remboursement ;
5. vérifier commande, règlement partenaire, gain livreur et fidélité.

Ne jamais mélanger une clé publique Test avec une clé secrète Live.

## Commandes finales

Après validation sur appareils réels :

```bash
cd mobile
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest build --profile production --platform ios
```

Première soumission Android : manuelle dans Play Console. Soumission iOS :
TestFlight avant l’envoi en revue.
