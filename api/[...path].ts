import type { Handler } from "@netlify/functions";
import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import { handler as cancelSubscription } from "../netlify/functions/cancel-subscription.js";
import { handler as courierDeliveries } from "../netlify/functions/courier-deliveries.js";
import { handler as createBillingPortal } from "../netlify/functions/create-billing-portal.js";
import { handler as createCheckoutSession } from "../netlify/functions/create-checkout-session.js";
import { handler as createPaymentIntent } from "../netlify/functions/create-payment-intent.js";
import { handler as createPayout } from "../netlify/functions/create-payout.js";
import { handler as createSubscription } from "../netlify/functions/create-subscription.js";
import { handler as deleteAccount } from "../netlify/functions/delete-account.js";
import { handler as financialDocument } from "../netlify/functions/financial-document.js";
import { handler as foodizPlus } from "../netlify/functions/foodiz-plus.js";
import { handler as getSubscription } from "../netlify/functions/get-subscription.js";
import { handler as partnerOrderAction } from "../netlify/functions/partner-order-action.js";
import { handler as rotateAdvantages } from "../netlify/functions/rotate-advantages.js";
import { handler as stripeWebhook } from "../netlify/functions/stripe-webhook.js";
import { handler as supportDiagnostic } from "../netlify/functions/support-diagnostic.js";
import { handler as trackMarketingNotification } from "../netlify/functions/track-marketing-notification.js";
import { handler as verifyDeliveryCode } from "../netlify/functions/verify-delivery-code.js";

const handlers: Record<string, Handler> = {
  "cancel-subscription": cancelSubscription,
  "courier-deliveries": courierDeliveries,
  "create-billing-portal": createBillingPortal,
  "create-checkout-session": createCheckoutSession,
  "create-payment-intent": createPaymentIntent,
  "create-payout": createPayout,
  "create-subscription": createSubscription,
  "delete-account": deleteAccount,
  "financial-document": financialDocument,
  "foodiz-plus": foodizPlus,
  "get-subscription": getSubscription,
  "partner-order-action": partnerOrderAction,
  "rotate-advantages": rotateAdvantages,
  "stripe-webhook": stripeWebhook,
  "support-diagnostic": supportDiagnostic,
  "track-marketing-notification": trackMarketingNotification,
  "verify-delivery-code": verifyDeliveryCode,
};

const adaptedHandlers = Object.fromEntries(
  Object.entries(handlers).map(([name, handler]) => [name, adaptNetlifyHandler(handler)]),
);

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const functionName = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const target = adaptedHandlers[functionName];

    if (!target) {
      return Response.json({ error: "API route not found" }, { status: 404 });
    }

    return target.fetch(request);
  },
};
