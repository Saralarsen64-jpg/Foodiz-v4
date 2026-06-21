# Foodiz Mobile

Application React Native/Expo destinée aux clients et livreurs Foodiz.

## Configuration locale

1. Copier `.env.example` vers `.env`.
2. Renseigner l’URL Supabase, la clé publique Supabase et l’URL publique du backend Foodiz.
3. Depuis la racine du dépôt :

```bash
npm run mobile:start
```

Puis utiliser `i` pour le simulateur iOS ou `a` pour Android.

## Vérifications

```bash
npm run mobile:typecheck
npm --prefix mobile run lint
```

## Builds stores

Après création et connexion au compte Expo :

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
```

Les identifiants provisoires sont `com.foodiz.app` pour iOS et Android. Ils doivent être
confirmés avant la création des fiches App Store Connect et Google Play Console.
