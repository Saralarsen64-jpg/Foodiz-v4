import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/31_prelaunch_waitlist_and_access_gate.sql", import.meta.url),
  "utf8",
);
const registerApi = readFileSync(
  new URL("../../netlify/functions/prelaunch-register.ts", import.meta.url),
  "utf8",
);
const activateApi = readFileSync(
  new URL("../../netlify/functions/prelaunch-activate.ts", import.meta.url),
  "utf8",
);
const apiRouter = readFileSync(
  new URL("../../api/[...path].ts", import.meta.url),
  "utf8",
);
const courierSiretMigration = readFileSync(
  new URL("../../supabase/migrations/32_prelaunch_courier_siret.sql", import.meta.url),
  "utf8",
);
const sendLaunchAccess = readFileSync(
  new URL("../../netlify/functions/send-launch-access.ts", import.meta.url),
  "utf8",
);
const launchBoundary = readFileSync(
  new URL("../../src/components/LaunchBoundary.tsx", import.meta.url),
  "utf8",
);
const appRoutes = readFileSync(
  new URL("../../src/App.tsx", import.meta.url),
  "utf8",
);
const uniquePhoneMigration = readFileSync(
  new URL("../../supabase/migrations/33_unique_phone_identity_for_clients_and_couriers.sql", import.meta.url),
  "utf8",
);
const prelaunchHelpers = readFileSync(
  new URL("../../netlify/functions/_lib/prelaunch.ts", import.meta.url),
  "utf8",
);

test("le statut de lancement démarre fermé", () => {
  assert.match(migration, /'launch_status', '\{"launched": false\}'::jsonb/);
});

test("les pré-inscriptions sont reliées à auth.users sans colonne mot de passe", () => {
  assert.match(migration, /user_id uuid NOT NULL UNIQUE REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  const profileDefinition = migration.match(/CREATE TABLE IF NOT EXISTS public\.prelaunch_profiles \(([\s\S]*?)\n\);/)?.[1] || "";
  assert.doesNotMatch(profileDefinition, /password/i);
});

test("les rôles publics de pré-lancement sont strictement limités", () => {
  assert.match(migration, /role IN \('client', 'livreur', 'partenaire'\)/);
  assert.match(registerApi, /client: "client"/);
  assert.match(registerApi, /livreur: "courier"/);
  assert.match(registerApi, /partenaire: "partner"/);
});

test("le serveur crée le mot de passe uniquement dans Supabase Auth", () => {
  assert.match(registerApi, /auth\.admin\.createUser/);
  assert.match(registerApi, /password,/);
  assert.doesNotMatch(registerApi, /prelaunch_profiles"\)\s*\.insert\(\{[\s\S]*password/);
});

test("les jetons de lancement sont comparés sous forme hachée", () => {
  assert.match(activateApi, /\.eq\("launch_token", sha256\(token\)\)/);
});

test("une policy restrictive bloque toutes les tables applicatives avant lancement", () => {
  assert.match(migration, /AS RESTRICTIVE FOR ALL TO anon, authenticated/);
  assert.match(migration, /public\.foodiz_application_access_allowed\(\)/);
});

test("les admins conservent leur accès pendant le pré-lancement", () => {
  assert.match(migration, /public\.current_user_has_role\('admin'\)\s+OR/);
});

test("le routeur API refuse également les contournements directs", () => {
  assert.match(apiRouter, /APP_NOT_LAUNCHED/);
  assert.match(apiRouter, /PRELAUNCH_ACTIVATION_REQUIRED/);
  assert.match(apiRouter, /userHasApplicationAccess/);
});

test("le SIRET livreur est stocké et validé sur 14 chiffres", () => {
  assert.match(courierSiretMigration, /ADD COLUMN IF NOT EXISTS siret text/);
  assert.match(courierSiretMigration, /\^\[0-9\]\{14\}\$/);
  assert.match(registerApi, /prelaunch_driver_details/);
  assert.match(registerApi, /siret,/);
});

test("l’envoi de lancement ne cible que les profils encore en attente", () => {
  assert.match(sendLaunchAccess, /\.eq\("status", "prelaunch_pending"\)/);
  assert.doesNotMatch(sendLaunchAccess, /\.in\("status", \["prelaunch_pending", "launch_email_sent"\]\)/);
});

test("l’activation renvoie la connexion correspondant au rôle", () => {
  assert.match(activateApi, /loginPath/);
  assert.match(activateApi, /role === "livreur" \? "courier"/);
  assert.match(activateApi, /role === "partenaire" \? "partner"/);
});

test("la route exacte /admin et ses sous-routes restent accessibles avant lancement", () => {
  assert.match(launchBoundary, /pathname === "\/admin"/);
  assert.match(launchBoundary, /pathname\.startsWith\("\/admin\/"\)/);
  assert.match(launchBoundary, /isAdminPath\(location\.pathname\)/);
});

test("foodiz.co reste toujours la waitlist même avec une session admin", () => {
  assert.match(appRoutes, /path="\/" element=\{<Navigate to="\/waitlist" replace \/>}/);
  assert.match(launchBoundary, /location\.pathname === "\/"/);
  assert.match(launchBoundary, /sessionRole === "admin"\) return <Navigate to="\/waitlist"/);
  assert.doesNotMatch(
    launchBoundary,
    /sessionRole === "admin"\) return <Navigate to="\/admin"/,
  );
});

test("les formats français équivalents partagent une identité téléphonique", () => {
  assert.match(uniquePhoneMigration, /normalize_foodiz_phone/);
  assert.match(uniquePhoneMigration, /\+33.*substring/);
  assert.match(prelaunchHelpers, /normalizeFoodizPhone/);
  assert.match(prelaunchHelpers, /`\+33\$\{digits\.slice\(1\)\}`/);
});

test("un téléphone ne peut appartenir qu’à un client ou livreur Foodiz", () => {
  assert.match(uniquePhoneMigration, /profiles_client_courier_phone_unique/);
  assert.match(uniquePhoneMigration, /prelaunch_client_courier_phone_unique/);
  assert.match(uniquePhoneMigration, /role IN \('client', 'courier'\)/);
  assert.match(uniquePhoneMigration, /role IN \('client', 'livreur'\)/);
  assert.match(registerApi, /Ce numéro de téléphone est déjà associé à un compte Foodiz/);
});

test("la migration refuse les doublons historiques au lieu de les modifier", () => {
  assert.match(uniquePhoneMigration, /HAVING count\(\*\) > 1/);
  assert.match(uniquePhoneMigration, /Cannot enable unique phone identity/);
});
