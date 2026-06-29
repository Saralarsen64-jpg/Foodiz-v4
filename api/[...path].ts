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
import { handler as adminPartnerApplications } from "../netlify/functions/admin-partner-applications.js";
import { handler as adminServiceAreas } from "../netlify/functions/admin-service-areas.js";
import { handler as adminOrderAction } from "../netlify/functions/admin-order-action.js";
import { handler as addressManagement } from "../netlify/functions/address-management.js";
import { handler as adminSupportTicketAction } from "../netlify/functions/admin-support-ticket-action.js";
import { handler as cancelSubscription } from "../netlify/functions/cancel-subscription.js";
import { handler as cancelMobileOrder } from "../netlify/functions/cancel-mobile-order.js";
import { handler as cityExpansionRequest } from "../netlify/functions/city-expansion-request.js";
import { handler as clientCatalog } from "../netlify/functions/client-catalog.js";
import { handler as courierApplication } from "../netlify/functions/courier-application.js";
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
import { handler as partnerDocuments } from "../netlify/functions/partner-documents.js";
import { handler as prelaunchActivate } from "../netlify/functions/prelaunch-activate.js";
import { handler as prelaunchRegister } from "../netlify/functions/prelaunch-register.js";
import { handler as prelaunchCourierDocuments } from "../netlify/functions/prelaunch-courier-documents.js";
import { handler as prelaunchPartnerDocuments } from "../netlify/functions/prelaunch-partner-documents.js";
import { handler as rotateAdvantages } from "../netlify/functions/rotate-advantages.js";
import { handler as sendLaunchAccess } from "../netlify/functions/send-launch-access.js";
import { handler as stripeWebhook } from "../netlify/functions/stripe-webhook.js";
import { handler as supportDiagnostic } from "../netlify/functions/support-diagnostic.js";
import { handler as trackMarketingNotification } from "../netlify/functions/track-marketing-notification.js";
import { handler as verifyDeliveryCode } from "../netlify/functions/verify-delivery-code.js";

const handlers: Record<string, Handler> = {
  "address-management": addressManagement,
  "admin/courier-applications": adminCourierApplications,
  "admin/partner-applications": adminPartnerApplications,
  "admin/service-areas": adminServiceAreas,
  "admin/order-action": adminOrderAction,
  "admin/prelaunch": adminPrelaunch,
  "admin/prelaunch/send-launch-access": sendLaunchAccess,
  "admin/support-ticket-action": adminSupportTicketAction,
  "cancel-subscription": cancelSubscription,
  "cancel-mobile-order": cancelMobileOrder,
  "city-expansion-request": cityExpansionRequest,
  "client-catalog": clientCatalog,
  "courier-application": courierApplication,
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
  "partner-documents": partnerDocuments,
  "prelaunch/activate": prelaunchActivate,
  "prelaunch/courier-documents": prelaunchCourierDocuments,
  "prelaunch/partner-documents": prelaunchPartnerDocuments,
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

const API_SECURITY_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

const DEFAULT_TRUSTED_ORIGINS = new Set([
  "https://foodiz.co",
  "https://www.foodiz.co",
]);

const LARGE_UPLOAD_ROUTES = new Set([
  "courier-documents",
  "partner-documents",
  "prelaunch/courier-documents",
  "prelaunch/partner-documents",
]);

const publicPrelaunchRoutes = new Set([
  "launch-status",
  "prelaunch/register",
  "prelaunch/courier-documents",
  "prelaunch/partner-documents",
  "prelaunch/activate",
  "stripe-webhook",
  "rotate-advantages",
]);

const routeRoleAllowlist = {
  "address-management": ["client", "partner"],
  "admin/courier-applications": ["admin"],
  "admin/partner-applications": ["admin"],
  "admin/service-areas": ["admin"],
  "admin/order-action": ["admin"],
  "admin/prelaunch": ["admin"],
  "admin/prelaunch/send-launch-access": ["admin"],
  "admin/support-ticket-action": ["admin"],
  "cancel-mobile-order": ["client"],
  "cancel-subscription": ["partner"],
  "city-expansion-request": ["client"],
  "client-catalog": ["client"],
  "courier-application": ["courier"],
  "courier-deliveries": ["courier"],
  "courier-delivery-action": ["courier"],
  "courier-documents": ["courier"],
  "courier-presence": ["courier"],
  "create-billing-portal": ["partner"],
  "create-checkout-session": ["client"],
  "create-payment-intent": ["client"],
  "create-subscription": ["partner"],
  "delete-account": ["admin", "client", "courier", "partner"],
  "financial-document": ["admin", "client", "courier", "partner"],
  "foodiz-plus": ["partner"],
  "get-subscription": ["partner"],
  "partner-order-action": ["partner"],
  "partner-documents": ["partner"],
  "support-diagnostic": ["courier", "partner"],
  "track-marketing-notification": ["admin", "client", "courier", "partner"],
  "verify-delivery-code": ["courier"],
} as const satisfies Record<string, readonly string[]>;

type ApiRateLimit = {
  limit: number;
  windowMs: number;
};

const DEFAULT_API_RATE_LIMIT: ApiRateLimit = {
  limit: 240,
  windowMs: 60 * 1000,
};

const apiRateLimits: Record<string, ApiRateLimit> = {
  "admin/courier-applications": { limit: 80, windowMs: 60 * 1000 },
  "admin/partner-applications": { limit: 80, windowMs: 60 * 1000 },
  "admin/service-areas": { limit: 80, windowMs: 60 * 1000 },
  "admin/order-action": { limit: 40, windowMs: 60 * 1000 },
  "admin/prelaunch": { limit: 120, windowMs: 60 * 1000 },
  "admin/prelaunch/send-launch-access": { limit: 20, windowMs: 10 * 60 * 1000 },
  "admin/support-ticket-action": { limit: 40, windowMs: 60 * 1000 },
  "create-checkout-session": { limit: 30, windowMs: 5 * 60 * 1000 },
  "create-payment-intent": { limit: 30, windowMs: 5 * 60 * 1000 },
  "city-expansion-request": { limit: 6, windowMs: 60 * 60 * 1000 },
  "courier-application": { limit: 12, windowMs: 10 * 60 * 1000 },
  "prelaunch/activate": { limit: 20, windowMs: 10 * 60 * 1000 },
  "prelaunch/register": { limit: 12, windowMs: 10 * 60 * 1000 },
  "support-diagnostic": { limit: 30, windowMs: 5 * 60 * 1000 },
  "verify-delivery-code": { limit: 12, windowMs: 5 * 60 * 1000 },
};

const apiRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function responseWithSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(API_SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonWithSecurityHeaders(body: Record<string, unknown>, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(API_SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return Response.json(body, { ...init, headers });
}

function maxBodyBytesForRoute(functionName: string) {
  if (LARGE_UPLOAD_ROUTES.has(functionName)) return 16 * 1024 * 1024;
  if (functionName === "stripe-webhook") return 2 * 1024 * 1024;
  if (functionName === "prelaunch/register") return 128 * 1024;
  return 1024 * 1024;
}

function requestContentLength(request: Request) {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return null;
  const length = Number(rawLength);
  return Number.isFinite(length) && length >= 0 ? length : null;
}

function rolesAllowedForRoute(functionName: string) {
  return routeRoleAllowlist[functionName as keyof typeof routeRoleAllowlist] || null;
}

function routeAllowsRole(functionName: string, role: string | null) {
  const allowedRoles = rolesAllowedForRoute(functionName);
  if (!allowedRoles) return true;
  return Boolean(role && (allowedRoles as readonly string[]).includes(role));
}

function configuredTrustedOrigins() {
  const configuredOrigins = process.env.FOODIZ_ALLOWED_ORIGINS || "";
  return new Set([
    ...DEFAULT_TRUSTED_ORIGINS,
    ...configuredOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ]);
}

function isLocalhost(hostname: string) {
  return hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || hostname.endsWith(".localhost");
}

function requestHasTrustedOrigin(request: Request, requestUrl: URL) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === requestUrl.host) return true;
    if (isLocalhost(originUrl.hostname) && isLocalhost(requestUrl.hostname)) return true;
    return configuredTrustedOrigins().has(originUrl.origin);
  } catch {
    return false;
  }
}

function clientAddressForRateLimit(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  return request.headers.get("x-real-ip")
    || request.headers.get("cf-connecting-ip")
    || "unknown";
}

function rateLimitForRoute(functionName: string) {
  if (LARGE_UPLOAD_ROUTES.has(functionName)) {
    return { limit: 30, windowMs: 10 * 60 * 1000 };
  }
  return apiRateLimits[functionName] || DEFAULT_API_RATE_LIMIT;
}

function cleanupExpiredRateLimitBuckets(now: number) {
  if (apiRateLimitBuckets.size < 5_000) return;
  for (const [key, bucket] of apiRateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) apiRateLimitBuckets.delete(key);
  }
}

function consumeApiRateLimit(functionName: string, request: Request, now = Date.now()) {
  cleanupExpiredRateLimitBuckets(now);
  const rateLimit = rateLimitForRoute(functionName);
  const clientAddress = clientAddressForRateLimit(request);
  const bucketKey = `${clientAddress}:${functionName}`;
  const bucket = apiRateLimitBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    apiRateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + rateLimit.windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= rateLimit.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const functionName = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
    const target = adaptedHandlers[functionName];

    if (!target) {
      return jsonWithSecurityHeaders({ error: "API route not found" }, { status: 404 });
    }

    if (!requestHasTrustedOrigin(request, url)) {
      return jsonWithSecurityHeaders(
        { error: "Origine non autorisée.", code: "ORIGIN_FORBIDDEN" },
        { status: 403 },
      );
    }

    const rateLimit = consumeApiRateLimit(functionName, request);
    if (!rateLimit.allowed) {
      return jsonWithSecurityHeaders(
        { error: "Trop de requêtes. Réessayez dans un instant.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const contentLength = requestContentLength(request);
    const maxBodyBytes = maxBodyBytesForRoute(functionName);
    if (contentLength !== null && contentLength > maxBodyBytes) {
      return jsonWithSecurityHeaders(
        { error: "Requête trop volumineuse.", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 },
      );
    }

    if (!publicPrelaunchRoutes.has(functionName)) {
      const headers = Object.fromEntries(request.headers.entries());
      const user = await authenticatedUser(headers);
      const currentRole = user ? await userRole(user.id) : null;
      const admin = currentRole === "admin";
      if (!routeAllowsRole(functionName, currentRole)) {
        return jsonWithSecurityHeaders(
          { error: "Accès refusé.", code: "ROLE_FORBIDDEN" },
          { status: user ? 403 : 401 },
        );
      }
      if (!admin) {
        const launched = await appIsLaunched();
        const allowed = user ? await userHasApplicationAccess(user.id) : launched;
        if (!allowed) {
          return jsonWithSecurityHeaders(
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

    try {
      return responseWithSecurityHeaders(await target.fetch(request));
    } catch (error) {
      console.error("Unhandled Foodiz API error", { functionName, error });
      return jsonWithSecurityHeaders(
        { error: "Erreur serveur Foodiz.", code: "INTERNAL_SERVER_ERROR" },
        { status: 500 },
      );
    }
  },
};
