export type StripeServerMode =
  | "missing"
  | "invalid"
  | "test"
  | "live_blocked"
  | "live_allowed";

export function getStripeServerMode(
  secretKey = process.env.STRIPE_SECRET_KEY,
  allowLivePayments = process.env.ALLOW_LIVE_PAYMENTS,
): StripeServerMode {
  if (!secretKey) return "missing";
  if (secretKey.startsWith("sk_test_")) return "test";
  if (!secretKey.startsWith("sk_live_")) return "invalid";
  return allowLivePayments === "true" ? "live_allowed" : "live_blocked";
}

export function stripeOperationGuard() {
  const mode = getStripeServerMode();
  if (mode === "test" || mode === "live_allowed") return null;

  const liveBlocked = mode === "live_blocked";
  return {
    statusCode: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      error: liveBlocked
        ? "Les paiements Stripe Live sont désactivés."
        : "Le paiement Stripe serveur n’est pas configuré.",
      code: liveBlocked
        ? "LIVE_PAYMENTS_DISABLED"
        : "STRIPE_SERVER_NOT_CONFIGURED",
    }),
  };
}
