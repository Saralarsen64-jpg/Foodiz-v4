const productionUrl = (process.env.WEELLO_PRODUCTION_URL || "https://weello.app").replace(/\/$/, "");
const expectsOpenLaunch = process.argv.includes("--expect-open");

const requiredPageHeaders = {
  "content-security-policy": "Content-Security-Policy",
  "x-frame-options": "X-Frame-Options",
  "x-content-type-options": "X-Content-Type-Options",
  "referrer-policy": "Referrer-Policy",
  "permissions-policy": "Permissions-Policy",
  "cross-origin-opener-policy": "Cross-Origin-Opener-Policy",
};

function failed(message) {
  console.error(`✗ ${message}`);
  return false;
}

function passed(message) {
  console.log(`✓ ${message}`);
  return true;
}

let validUrl;
try {
  validUrl = new URL(productionUrl);
} catch {
  console.error("WEELLO_PRODUCTION_URL doit être une URL HTTPS valide.");
  process.exit(1);
}

if (validUrl.protocol !== "https:") {
  console.error("WEELLO_PRODUCTION_URL doit utiliser HTTPS.");
  process.exit(1);
}

let hasErrors = false;

try {
  const page = await fetch(productionUrl, { redirect: "error" });
  if (!page.ok) {
    hasErrors = !failed(`La page d'accueil répond HTTP ${page.status}.`) || hasErrors;
  } else {
    passed("La page d'accueil répond en HTTPS.");
  }

  for (const [key, label] of Object.entries(requiredPageHeaders)) {
    const value = page.headers.get(key);
    if (!value) {
      hasErrors = !failed(`${label} est absent de la page publique.`) || hasErrors;
    } else {
      passed(`${label} est présent.`);
    }
  }

  const hsts = page.headers.get("strict-transport-security") || "";
  if (!hsts.includes("includeSubDomains") || !hsts.includes("preload")) {
    hasErrors = !failed("Strict-Transport-Security doit inclure includeSubDomains et preload.") || hasErrors;
  } else {
    passed("Strict-Transport-Security couvre les sous-domaines.");
  }

  const api = await fetch(`${productionUrl}/api/launch-status`, { redirect: "error" });
  if (!api.ok) {
    hasErrors = !failed(`/api/launch-status répond HTTP ${api.status}.`) || hasErrors;
  } else {
    passed("L'API publique répond.");
  }

  for (const [key, expected] of Object.entries({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex",
  })) {
    const value = api.headers.get(key) || "";
    if (!value.toLowerCase().includes(expected)) {
      hasErrors = !failed(`${key} doit contenir ${expected} sur l'API.`) || hasErrors;
    } else {
      passed(`${key} est correct sur l'API.`);
    }
  }

  const status = await api.json();
  if (typeof status.launched !== "boolean") {
    hasErrors = !failed("La réponse launch-status est invalide.") || hasErrors;
  } else if (expectsOpenLaunch && !status.launched) {
    hasErrors = !failed("Le lancement est fermé alors que --expect-open a été demandé.") || hasErrors;
  } else {
    passed(`État du lancement : ${status.launched ? "ouvert" : "fermé"}.`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "erreur réseau inconnue";
  hasErrors = !failed(`Contrôle du déploiement impossible : ${message}`) || hasErrors;
}

if (hasErrors) process.exit(1);
console.log("Déploiement Weello conforme.");
