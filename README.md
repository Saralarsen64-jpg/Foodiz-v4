# Weello

## Pré-lancement

La checklist de recette avant App Store / Google Play est disponible ici :
[`docs/weello-launch-readiness.md`](docs/weello-launch-readiness.md).

## Routage serveur

Weello utilise OpenRouteService comme fournisseur principal pour calculer les
distances routières, les durées et les itinéraires. La clé n'est jamais placée
dans le frontend web ou mobile.

Configuration locale serveur (`.env.local`) et production Vercel :

```env
ROUTING_PROVIDER=openrouteservice
OPENROUTESERVICE_API_KEY=votre_cle_serveur
OPENROUTESERVICE_BASE_URL=https://api.openrouteservice.org
```

Ne jamais créer de variable `VITE_OPENROUTESERVICE_*` ou
`EXPO_PUBLIC_OPENROUTESERVICE_*` : elle deviendrait publique dans l'application.

Le plan gratuit n'est pas illimité. Les quotas par minute et par jour dépendent
du plan affiché dans le compte HeiGIT et peuvent évoluer ; ils doivent être
contrôlés avant le lancement dans la [page officielle des
plans](https://account.heigit.org/info/plans). Les restrictions techniques
officielles incluent notamment 50 points de passage maximum et 6 000 km maximum
pour une route automobile. Voir les [restrictions
OpenRouteService](https://openrouteservice.org/restrictions/) et la
[documentation Directions](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/).

En cas d'indisponibilité, Weello journalise une erreur serveur et utilise
temporairement la distance à vol d'oiseau. Ce secours ne produit aucune ETA
vérifiée et ne peut donc pas déclencher une pénalité livreur.

### Migration future vers OSRM auto-hébergé

La logique métier appelle uniquement `routingProvider.ts`. Pour migrer sans
modifier le checkout, le dispatch ou les pénalités :

```env
ROUTING_PROVIDER=osrm
OSRM_BASE_URL=https://routing.weello.app
```

`OSRM_BASE_URL` doit pointer vers une instance Weello auto-hébergée. Aucun
serveur OSRM public n'est utilisé par défaut.

### Tests

Tests automatisés :

```bash
npm run test:routing
```

Test réel entre l'Hôtel de Ville de Paris et la Tour Eiffel :

```bash
OPENROUTESERVICE_API_KEY=... npm run test:routing:live
```

## Emails automatiques

La suite d'emails transactionnels Weello est documentée dans
[`docs/weello-email-automation.md`](docs/weello-email-automation.md).

Les variables serveur principales sont :

```env
RESEND_API_KEY=...
WEELLO_EMAIL_FROM=Weello <contact@weello.co>
```

Les emails de lancement restent manuels : ils ne partent que depuis l'admin
après validation officielle du lancement.
