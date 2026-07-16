import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("les emails utilisent la chaîne de compatibilité Weello sans exposer Resend au client", () => {
  for (const relativePath of [
    "netlify/functions/_lib/weello-email.ts",
    "netlify/functions/_lib/financial-documents.ts",
  ]) {
    const source = readFileSync(join(root, relativePath), "utf8");
    assert.match(source, /process\.env\.WEELLO_EMAIL_FROM[\s\S]*process\.env\.EMAIL_FROM[\s\S]*process\.env\.FOODIZ_EMAIL_FROM/);
    assert.match(source, /Weello <contact@weello\.co>/);
    assert.match(source, /replyTo: "contact@weello\.co"/);
    assert.match(source, /process\.env\.RESEND_API_KEY/);
    assert.doesNotMatch(source, /import\.meta\.env\.RESEND_API_KEY|VITE_RESEND_API_KEY/);
  }
});

test("le callback accepte les formats de confirmation Supabase actuels", () => {
  const callback = readFileSync(join(root, "src/pages/auth/Callback.tsx"), "utf8");
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /verifyOtp\(/);
  assert.match(callback, /token_hash/);
  assert.match(callback, /error_description/);
});

test("la récupération de mot de passe prépare une session avant la modification", () => {
  const reset = readFileSync(join(root, "src/pages/auth/ResetPassword.tsx"), "utf8");
  assert.match(reset, /exchangeCodeForSession\(code\)/);
  assert.match(reset, /verifyOtp\(/);
  assert.match(reset, /type: "recovery"/);
  assert.match(reset, /if \(!linkValid\)/);
});
