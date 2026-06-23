import type { Handler } from "@netlify/functions";
import { adaptNetlifyHandler } from "../netlify/functions/_lib/vercel-adapter.js";
import {
  appIsLaunched,
  authenticatedUser,
  userHasApplicationAccess,
  userRole,
} from "../netlify/functions/_lib/auth.js";
import { handler as adminPrelaunch } from "../netlify/functions/admin-prelaunch.js";
import { handler as adminCourierApplications } from "../netlify/functions/admin-courier-applications.js";
import { handler as adminOrderAction } from "../netlify/functions/admin-order-action.js";
import { handler as addressManagement } from "../netlify/functions/address-management.js";
import { handler as cancelSubscription } from "../netlify/functions/cancel-subscription.js";
import { handler as cancelMobileOrder } from "../netlify/functions/cancel-mobile-order.js";
import { handler as clientCatalog } from "../netlify/functions/client-catalog.js";
import { handler as courierDeliveries } from "../netlify/functions/courier-deliveries.js";
import { handler as courierDeliveryAction } from "../netlify/functions/courier-delivery-action.js";
import { handler as courierDocuments } from "../netlify/functions/courier-documents.js";
import { handler as courierPresence } from "../netlify/functions/courier-presence.js";
import { handler as createBillingPortal } from "../netlify/functions/create-billing-portal.js";
import { handler as createCheckoutSession } from "../netlify/functions/create-checkout-session.js";
import { handler as createPaymentIntent } from "../netlify/functions/create-payment-intent.js";
import { handler as createSubscription } from "../netlify/functions/create-subscription.js";
import { handler as deleteAccount } from "../netlify/functions/delete-account.js";
import { handler as financialDocument } from "../netlify/functions/financial-document.js";
import { handler as foodizPlus } from "../netlify/functions/foodiz-plus.js";
import { handler as getSubscription } from "../netlify/functions/get-subscription.js";
import { handler as launchStatus } from "../netlify/functions/launch-status.js";
import { handler as partnerOrderAction } from "../netlify/functions/partner-order-action.js";
import { handler as prelaunchActivate } from "../netlify/functions/prelaunch-activate.js";
import { handler as prelaunchRegister } from "../netlify/functions/prelaunch-register.js";
import { handler as prelaunchCourierDocuments } from "../netlify/functions/prelaunch-courier-documents.js";
import { handler as rotateAdvantages } from "../netlify/functions/rotate-advantages.js";
import { handler as sendLaunchAccess } from "../netlify/functions/send-launch-access.js";
import { handler as stripeWebhook } from "../netlify/functions/stripe-webhook.js";
import { handler as supportDiagnostic } from "../netlify/functions/support-diagnostic.js";
import { handler as trackMarketingNotification } from "../netlify/functions/track-marketing-notification.js";
import { handler as verifyDeliveryCode } from "../netlify/functions/verify-delivery-code.js";

const handlers: Record<string, Handler> = {
  "address-management": addressManagement,
  "admin/courier-applications": adminCourierApplications,
  "admin/order-action": adminOrderAction,
  "admin/prelaunch": adminPrelaunch,
  "admin/prelaunch/send-launch-access": sendLaunchAccess,
  "cancel-subscription": cancelSubscription,
  "cancel-mobile-order": cancelMobileOrder,
  "client-catalog": clientCatalog,
  "courier-deliveries": courierDeliveries,
  "courier-delivery-action": courierDeliveryAction,
  "courier-documents": courierDocuments,
  "courier-presence": courierPresence,
  "create-billing-portal": createBillingPortal,
  "create-checkout-session": createCheckoutSession,
  "create-payment-intent": createPaymentIntent,
  "create-subscription": createSubscription,
  "delete-account": deleteAccount,
  "financial-document": financialDocument,
  "foodiz-plus": foodizPlus,
  "get-subscription": getSubscription,
  "launch-status": launchStatus,
  "partner-order-action": partnerOrderAction,
  "prelaunch/activate": prelaunchActivate,
  "prelaunch/courier-documents": prelaunchCourierDocuments,
  "prelaunch/register": prelaunchRegister,
  "rotate-advantages": rotateAdvantages,
  "stripe-webhook": stripeWebhook,
  "support-diagnostic": supportDiagnostic,
  "track-marketing-notification": trackMarketingNotification,
  "verify-delivery-code": verifyDeliveryCode,
};

const adaptedHandlers = Object.fromEntries(
  Object.entries(handlers).map(([name, handler]) => [name, adaptNetlifyHandler(handler)]),
);

const publicPrelaunchRoutes = new Set([
  "launch-status",
  "prelaunch/register",
  "prelaunch/courier-documents",
  "prelaunch/activate",
  "stripe-webhook",
  "rotate-advantages",
]);

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const functionName = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const target = adaptedHandlers[functionName];

    if (!target) {
      return Response.json({ error: "API route not found" }, { status: 404 });
    }

    if (!publicPrelaunchRoutes.has(functionName)) {
      const headers = Object.fromEntries(request.headers.entries());
      const user = await authenticatedUser(headers);
      const admin = user ? await userRole(user.id) === "admin" : false;
      if (!admin) {
        const launched = await appIsLaunched();
        const allowed = user ? await userHasApplicationAccess(user.id) : launched;
        if (!allowed) {
          return Response.json(
            {
              error: launched
                ? "Activez votre accès Foodiz avant de continuer."
                : "Foodiz ouvrira bientôt. Votre espace est temporairement verrouillé.",
              code: launched ? "PRELAUNCH_ACTIVATION_REQUIRED" : "APP_NOT_LAUNCHED",
            },
            { status: 423 },
          );
        }
      }
    }

    return target.fetch(request);
  },
};
