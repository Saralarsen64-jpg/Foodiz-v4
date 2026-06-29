import type { Handler } from "@netlify/functions";
import {
  appIsLaunched,
  authenticatedUser,
  userHasApplicationAccess,
  userRole,
} from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const launched = await appIsLaunched();
  const user = await authenticatedUser(event.headers);
  const role = user ? await userRole(user.id) : null;
  const accessAllowed = user ? await userHasApplicationAccess(user.id) : launched;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
    body: JSON.stringify({
      launched: true,
      rolloutMode: "public_france",
      configuredLaunchState: launched,
      authenticated: Boolean(user),
      role,
      accessAllowed,
    }),
  };
};

export { handler };
