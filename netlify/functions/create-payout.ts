import { Handler } from "@netlify/functions";
import { authenticatedUser } from "./_lib/auth";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({
      error: "Payouts are disabled until Stripe Connect accounts are configured",
    }),
  };
};

export { handler };
