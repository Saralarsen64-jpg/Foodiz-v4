# Foodiz — pilote fermé Mont-de-Marsan

Ce scénario doit être exécuté uniquement sur un projet Supabase de test. Le
script refuse explicitement la référence du projet Foodiz Production.

## Préconditions

- migrations 42, 43, 44 et 45 appliquées sur le projet de test ;
- variables Supabase, Stripe Test, Resend et OpenRouteService configurées sur
  l’environnement Preview/test ;
- webhook Stripe Test dirigé vers l’URL Preview correspondante ;
- trois adresses email de test contrôlées par Foodiz ;
- aucun secret enregistré dans Git.

## Initialisation sécurisée

Configurer localement, sans les coller dans un ticket ou dans Git :

- `PILOT_SUPABASE_URL`
- `PILOT_SUPABASE_SERVICE_ROLE_KEY`
- `PILOT_CLIENT_EMAIL` et `PILOT_CLIENT_PASSWORD`
- `PILOT_PARTNER_EMAIL` et `PILOT_PARTNER_PASSWORD`
- `PILOT_COURIER_EMAIL` et `PILOT_COURIER_PASSWORD`
- `PILOT_CONFIRM=MONT-DE-MARSAN-CLOSED-PILOT`

Puis exécuter :

```bash
node scripts/seed-closed-pilot.ts
```

Le script crée ou prépare :

- une zone pilote Mont-de-Marsan de 12 km ;
- un client test et son adresse vérifiée ;
- un partenaire test validé ;
- un livreur test validé ;
- un restaurant actif ;
- trois produits couvrant les tranches T1, T2 et T3.

Il ne crée pas artificiellement une commande payée. La commande doit être
effectuée dans l’application afin de tester réellement Stripe et le webhook.

## Parcours de recette obligatoire

1. Le client se connecte et voit le restaurant pilote.
2. Il ajoute au panier au moins un produit de chaque tranche.
3. Le serveur recalcule les prix, la distance OpenRouteService et les frais.
4. Le paiement est réalisé avec un moyen de paiement Stripe Test officiel.
5. Le webhook passe la commande en paiement confirmé.
6. Le partenaire reçoit, accepte et prépare la commande.
7. Le partenaire marque la commande prête.
8. Le livreur se met en ligne, reçoit puis accepte la course.
9. Le livreur présente le numéro de commande et confirme la récupération.
10. Le client suit la livraison et communique son code uniquement à la remise.
11. Le livreur valide le code et termine la livraison.
12. Les points, écritures économiques et gains sont vérifiés.
13. L’admin contrôle la commande, le support et le bordereau manuel.

## Scénarios complémentaires

- abandon du Payment Sheet puis annulation de la commande provisoire ;
- paiement refusé ;
- refus partenaire et remboursement Stripe Test ;
- annulation admin avec motif et remboursement ;
- webhook reçu deux fois pour vérifier l’idempotence ;
- indisponibilité OpenRouteService et fallback temporaire ;
- retard supérieur à 10, 15 puis 20 minutes ;
- document partenaire refusé puis remplacé ;
- email de confirmation, réponse support et mot de passe oublié.
