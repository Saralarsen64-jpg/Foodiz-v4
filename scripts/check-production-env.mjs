const required = [
  "APP_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "ROUTING_PROVIDER",
  "OPENROUTESERVICE_API_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "WEELLO_ALLOWED_ORIGINS",
  "WEELLO_LEGAL_NAME",
  "WEELLO_LEGAL_ADDRESS",
  "WEELLO_SIRET",
  "STRIPE_PLAN_DISCOVERY_MONTHLY",
  "STRIPE_PLAN_DISCOVERY_YEARLY",
  "STRIPE_PLAN_BOOST_MONTHLY",
  "STRIPE_PLAN_BOOST_YEARLY",
  "STRIPE_PLAN_DOMINATION_MONTHLY",
  "STRIPE_PLAN_DOMINATION_YEARLY",
];

const errors = [];
const emailFrom = process.env.WEELLO_EMAIL_FROM
  || process.env.EMAIL_FROM
  || process.env.FOODIZ_EMAIL_FROM;
if (!emailFrom) errors.push("Configurer WEELLO_EMAIL_FROM, EMAIL_FROM ou FOODIZ_EMAIL_FROM");

const missing = required.filter((name) => !String(process.env[name] || "").trim());

if (process.env.APP_URL !== "https://weello.app") {
  errors.push("APP_URL doit être exactement https://weello.app");
}
if (process.env.ROUTING_PROVIDER !== "openrouteservice") {
  errors.push("ROUTING_PROVIDER doit être openrouteservice avant le lancement");
}
const allowedOrigins = String(process.env.WEELLO_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim());
for (const expectedOrigin of ["https://weello.app", "https://www.weello.app"]) {
  if (!allowedOrigins.includes(expectedOrigin)) {
    errors.push(`WEELLO_ALLOWED_ORIGINS doit inclure ${expectedOrigin}`);
  }
}
if (!String(process.env.VITE_SUPABASE_URL || "").startsWith("https://")) {
  errors.push("VITE_SUPABASE_URL doit être une URL HTTPS");
}
if (!String(process.env.VITE_STRIPE_PUBLISHABLE_KEY || "").startsWith("pk_live_")) {
  errors.push("VITE_STRIPE_PUBLISHABLE_KEY doit être une clé Stripe live");
}
if (!String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_")) {
  errors.push("STRIPE_SECRET_KEY doit être une clé Stripe live");
}
if (process.env.ALLOW_LIVE_PAYMENTS !== "true") {
  errors.push("ALLOW_LIVE_PAYMENTS doit être true avant l'ouverture des paiements réels");
}

if (missing.length || errors.length) {
  if (missing.length) console.error(`Variables manquantes ou vides : ${missing.join(", ")}`);
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("Configuration de production Weello valide.");
