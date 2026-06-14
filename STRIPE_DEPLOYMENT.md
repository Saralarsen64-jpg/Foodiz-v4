# 💳 Guide de Déploiement Stripe - Foodiz

## 1️⃣ Configuration Stripe

### 1.1 Créer un compte Stripe
1. Allez à https://stripe.com
2. Créez un compte Stripe français
3. Activez les paiements en ligne

### 1.2 Récupérer vos clés API
1. Allez à https://dashboard.stripe.com/apikeys
2. Copiez:
   - **Publishable Key** (pk_*) → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret Key** (sk_*) → `STRIPE_SECRET_KEY`

### 1.3 Créer les plans d'abonnement Foodiz+
1. Allez à https://dashboard.stripe.com/products
2. Créez 4 prix pour les plans:

```
Plan Basic (Mensuel)
├─ Prix: 19.99€/mois
├─ ID du prix: price_basic_monthly_xxx
└─ Features: 50 commandes/mois, Analytics basique

Plan Basic (Annuel)
├─ Prix: 199.99€/an
├─ ID du prix: price_basic_yearly_xxx
└─ Économies: 20%

Plan Pro (Mensuel)
├─ Prix: 49.99€/mois
├─ ID du prix: price_pro_monthly_xxx
└─ Features: Commandes illimitées, Analytics avancé

Plan Pro (Annuel)
├─ Prix: 499.99€/an
├─ ID du prix: price_pro_yearly_xxx
└─ Économies: 17%
```

### 1.4 Configurer le Webhook
1. Allez à https://dashboard.stripe.com/webhooks
2. Cliquez sur "Add endpoint"
3. URL: `https://your-domain.netlify.app/.netlify/functions/stripe-webhook`
4. Sélectionnez les événements:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copiez le **Webhook Secret** (whsec_*) → `STRIPE_WEBHOOK_SECRET`

---

## 2️⃣ Configuration Netlify

### 2.1 Variables d'environnement
Allez à **Site Settings > Build & deploy > Environment**

Ajoutez:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PLAN_DISCOVERY_MONTHLY=price_discovery_monthly_xxx
STRIPE_PLAN_DISCOVERY_YEARLY=price_discovery_yearly_xxx
STRIPE_PLAN_BOOST_MONTHLY=price_boost_monthly_xxx
STRIPE_PLAN_BOOST_YEARLY=price_boost_yearly_xxx
STRIPE_PLAN_DOMINATION_MONTHLY=price_domination_monthly_xxx
STRIPE_PLAN_DOMINATION_YEARLY=price_domination_yearly_xxx
```

### 2.2 Permettre les imports Stripe dans Functions
Le fichier `package.json` doit avoir les dépendances nécessaires. Les Netlify Functions utilisent Node.js, donc `stripe` doit être disponible.

Vérifiez que `stripe` est installé:
```bash
npm install stripe
```

---

## 3️⃣ Déployer sur Netlify

### 3.1 Connexion au repo
```bash
# Connectez votre repo GitHub à Netlify
# Allez à https://netlify.com > New site from Git
```

### 3.2 Configuration build
Netlify détecte automatiquement:
- **Build command**: `npm run build`
- **Functions directory**: `netlify/functions`
- **Publish directory**: `dist`

### 3.3 Pousser le code
```bash
git add .
git commit -m "feat: Stripe integration Phase 2"
git push origin main
```

Netlify déploiera automatiquement et vos Netlify Functions seront disponibles à `/.netlify/functions/...`

---

## 4️⃣ Flux de Paiement

### 4.1 Lors d'une commande client
```
1. Le client valide son panier
2. `create-checkout-session` recalcule les prix depuis Supabase
3. Stripe Checkout collecte et confirme le paiement
4. Le webhook `payment_intent.succeeded` arrive
5. La commande passe en "preparing"
6. Le restaurant reçoit une notification
```

### 4.2 Virements des partenaires et livreurs
```
Les virements sont volontairement désactivés pour le moment.
Stripe Connect doit être configuré avec un compte connecté vérifié pour chaque
partenaire et livreur avant d'activer `create-payout`.
```

### 4.3 Souscription Foodiz+
```
1. Partenaire va aux settings
2. Choisit un plan (Basic/Pro, Mensuel/Annuel)
3. createSubscription() initialise l'abonnement
4. Client complète le paiement
5. Partenaire a accès aux features Premium
6. Renouvellement automatique chaque mois/année
```

---

## 5️⃣ Résolution de Problèmes

### ❌ Erreur: "Webhook endpoint failed"
- Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct dans Netlify
- Vérifiez que la fonction `stripe-webhook.ts` compile
- Testez avec `stripe trigger` en mode test

### ❌ Erreur: "PaymentIntent failed"
- Vérifiez que `STRIPE_SECRET_KEY` est une clé LIVE (pas TEST)
- Testez avec une carte de test: `4242 4242 4242 4242`
- Vérifiez le montant en centimes

### ❌ Erreur: "Missing price IDs"
- Vérifiez que tous les `STRIPE_PLAN_*` sont configurés dans Netlify
- Créez les produits dans Stripe Dashboard
- Copiez exactement les IDs

### ❌ Erreur: "Customer not found"
- Vérifiez que l'email utilisateur est correct
- Les customers se créent automatiquement au premier paiement

---

## 6️⃣ Tester en Mode DEV

### 6.1 Utiliser les clés TEST de Stripe
Dans `.env.local`:
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

### 6.2 Cartes de test
- **Succès**: `4242 4242 4242 4242` / Expiry: `12/25` / CVC: `123`
- **Déclinée**: `4000 0000 0000 0002` / Expiry: `12/25` / CVC: `123`

### 6.3 Tester localement les Webhooks
```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Authentifier
stripe login

# Écouter les webhooks localement
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook

# Dans un autre terminal, déclencher un événement
stripe trigger payment_intent.succeeded
```

---

## 7️⃣ Mise en Production

### ⚠️ Checklist avant LIVE
- [ ] Toutes les variables Netlify configurées
- [ ] Webhook configuré avec URL PRODUCTION
- [ ] Plans Stripe créés avec tarifs FINAUX
- [ ] Page juridique "CGU Paiements" ajoutée
- [ ] Email de confirmation configuré pour les paiements
- [ ] Test complet d'une commande
- [ ] Vérification du calcul économique
- [ ] Support email configuré
- [ ] Stripe Connect configuré avant d'activer les virements

### 🔒 Sécurité
- ✅ Jamais pusher les clés secrètes
- ✅ Utiliser les variables Netlify
- ✅ Valider côté serveur dans les Functions
- ✅ Chiffrer les données sensibles
- ✅ HTTPS obligatoire
- ✅ RLS Supabase activée

### 📊 Monitoring
- Dashboard Stripe: https://dashboard.stripe.com
- Netlify Functions logs: https://app.netlify.com > Functions
- Supabase logs: https://supabase.com > Logs

---

## 8️⃣ Prochaines Étapes

1. **PSD2 Compliance** - Authentification forte (3DS)
2. **Paiements Récurrents** - Renouvellement automatique
3. **Refunds** - Remboursements via admin
4. **Multi-devise** - Autres devises EUR/GBP/USD
5. **Factures** - Génération PDF automatique

---

**Questions?** Consultez:
- [Stripe Docs](https://stripe.com/docs)
- [Netlify Functions](https://netlify.com/functions)
- [Supabase Webhooks](https://supabase.com/docs/guides/webhooks)
