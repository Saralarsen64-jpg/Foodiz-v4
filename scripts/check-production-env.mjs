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
  "WEELLO_LEGAL_NAME",
  "WEELLO_LEGAL_ADDRESS",
  "WEELLO_SIRET",
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
if (!String(process.env.VITE_SUPABASE_URL || "").startsWith("https://")) {
  errors.push("VITE_SUPABASE_URL doit être une URL HTTPS");
}
if (!String(process.env.VITE_STRIPE_PUBLISHABLE_KEY || "").startsWith("pk_live_")) {
  errors.push("VITE_STRIPE_PUBLISHABLE_KEY doit être une clé Stripe live");
}
if (!String(process.env.STRIPE_SECRET_KEY || "").startsWith("sk_live_")) {
  errors.push("STRIPE_SECRET_KEY doit être une clé Stripe live");
}

if (missing.length || errors.length) {
  if (missing.length) console.error(`Variables manquantes ou vides : ${missing.join(", ")}`);
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("Configuration de production Weello valide.");
