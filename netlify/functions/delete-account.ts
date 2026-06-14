import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { data: profile } = await adminSupabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "client") {
    return { statusCode: 403, body: JSON.stringify({ error: "Only client accounts can be deleted here" }) };
  }

  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Account deletion failed" }) };
  }

  return { statusCode: 200, body: JSON.stringify({ deleted: true }) };
};

export { handler };
