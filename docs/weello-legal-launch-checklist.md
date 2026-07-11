# Weello — validation juridique avant lancement

État au 6 juillet 2026. Ce document est une checklist opérationnelle et ne remplace pas une consultation juridique.

## Éléments déjà intégrés aux pages

- identité de Sara Larsen, entrepreneur individuel, nom commercial Weello ;
- SIREN, SIRET, adresse professionnelle, TVA non applicable et contact ;
- rôle de plateforme et responsabilités respectives client / partenaire / livreur ;
- prix final, frais de service et frais de livraison affichés avant paiement, sans publier le modèle économique interne ;
- paiement Stripe, commande, livraison, annulation, remboursement et droit de rétractation ;
- fidélité, parrainage, compensations de retard et abonnements Weello+ ;
- référencement par disponibilité et proximité ;
- données de compte, documents professionnels, géolocalisation, destinataires, droits RGPD et cookies ;
- distinction entre communications transactionnelles et marketing.

## Blocants à compléter avant paiements réels

1. Ajouter le numéro de téléphone professionnel de l’éditeur.
2. Souscrire à un médiateur de la consommation et ajouter son nom, son adresse et son site.
3. Relever dans le contrat Vercel l’entité d’hébergement exacte et son adresse postale.
4. Faire confirmer par Stripe et un juriste le rôle de Weello dans l’encaissement :
   - simple intermédiaire ;
   - mandataire d’encaissement ;
   - ou vendeur / merchant of record.
5. Vérifier que chaque fiche partenaire affiche avant paiement son identité légale, ses coordonnées et ses informations alimentaires obligatoires.
6. Vérifier le traitement des produits non périssables pouvant bénéficier du droit de rétractation.
7. Interdire ou encadrer techniquement la vente d’alcool tant que le contrôle d’âge n’est pas complet.
8. Mettre en œuvre et tester le calendrier de suppression / archivage annoncé dans la politique de confidentialité.
9. Vérifier la région d’hébergement Supabase et les garanties de transfert de chaque sous-traitant.
10. Faire relire les CGU, CGV, la politique de confidentialité et les contrats professionnels par un avocat français.

## Sources officielles utilisées

- [DGCCRF, obligations des plateformes numériques](https://www.economie.gouv.fr/dgccrf/laction-de-la-dgccrf/les-enquetes-et-les-controles/les-obligations-dinformation-des-plateformes-numeriques)
- [DGCCRF, CGV et mentions obligatoires](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/conditions-generales-de-vente-quelles-mentions-sont-obligatoires)
- [Code de la consommation, article L.221-28](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032226820)
- [Code de la consommation, article L.612-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032224805)
- [DGCCRF, informations alimentaires et vente à distance](https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/etiquetage-des-denrees-alimentaires-les-regles-connaitre)
- [CNIL, information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence)
- [CNIL, recommandations pour les applications mobiles](https://www.cnil.fr/fr/recommandations-applications-mobiles)
- [CNIL, durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees)
- [CNIL, paiement à distance](https://www.cnil.fr/fr/le-paiement-distance-par-carte-bancaire)
- [CNIL, communications électroniques](https://www.cnil.fr/fr/communication-electronique-quelles-regles)
- [Service-Public, conservation des documents d’entreprise](https://entreprendre.service-public.fr/vosdroits/F10029)
