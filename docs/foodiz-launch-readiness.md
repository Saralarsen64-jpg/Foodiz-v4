# Foodiz — recette pré-lancement

Ce document sert de checklist avant une publication App Store / Google Play.
Il ne déclenche aucun email, aucune migration et aucune action de production.

## 1. Parcours commande complet

À tester sur une build mobile installée sur téléphone :

1. créer ou utiliser un client test ;
2. ajouter une adresse dans la ville pilote ;
3. choisir un établissement actif ;
4. ajouter des produits au panier ;
5. payer avec Stripe en mode test ;
6. vérifier la commande côté partenaire ;
7. passer la commande en préparation puis prête ;
8. affecter / récupérer côté livreur ;
9. vérifier que le suivi client reste statique pendant la préparation ;
10. vérifier que le suivi live démarre après récupération par le livreur ;
11. livrer avec le code client ;
12. vérifier les écritures économiques, points et éventuelles pénalités.

## 2. Interface partenaire

Le partenaire doit pouvoir :

- voir ses commandes actives ;
- comprendre si son établissement est visible ;
- gérer sa carte et ses produits ;
- consulter son chiffre partenaire livré ;
- ouvrir un support guidé avec diagnostic ;
- suivre ses documents et son statut.

## 3. Interface livreur

Le livreur doit pouvoir :

- voir son statut de validation ;
- passer en ligne uniquement si son dossier est validé ;
- voir les courses disponibles ;
- présenter le numéro de commande au restaurant ;
- confirmer la récupération ;
- voir le chrono réglementé, le gain max et le gain mini ;
- finaliser avec le code client ;
- ouvrir le support guidé si une étape bloque.

## 4. Interface admin

L’admin doit piloter :

- pré-inscriptions par rôle et par ville ;
- villes pilotes ;
- dossiers partenaires ;
- dossiers livreurs ;
- documents à valider ;
- tickets support ;
- commandes ;
- journal économique ;
- virements manuels.

L’accès admin doit rester uniquement derrière `/admin/auth`.

## 5. Help center

Le help center doit toujours privilégier :

- diagnostic automatique avant ticket ;
- contexte de commande quand disponible ;
- priorité claire ;
- historique des réponses ;
- réponse humaine depuis admin ;
- email transactionnel de résolution quand configuré.

## 6. Builds mobile

Expo Go n’est pas suffisant pour Foodiz si le projet exige un development build.

Commandes utiles depuis `mobile/` :

```bash
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Pour une prévisualisation avant publication :

```bash
npx eas-cli@latest build --profile preview --platform ios
npx eas-cli@latest build --profile preview --platform android
```

Pour publication, uniquement après validation réelle :

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest build --profile production --platform android
```

## Vérifications locales avant commit

Depuis la racine du projet :

```bash
npm run typecheck
npm run mobile:typecheck
npm run test
npm run build
```

