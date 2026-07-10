import { createClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase server environment variables");
}

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function authenticatedUser(
  headers: Record<string, string | undefined>
): Promise<User | null> {
  const authorization = headers.authorization || headers.Authorization;
  const token = authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data, error } = await adminSupabase.auth.getUser(token);
  return error ? null : data.user;
}

export async function userRole(userId: string): Promise<string | null> {
  const { data } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return data?.role || null;
}

export async function appIsLaunched(): Promise<boolean> {
  const { data } = await adminSupabase
    .from("app_settings")
    .select("value")
    .eq("key", "launch_status")
    .maybeSingle();
  return data?.value?.launched === true;
}

export async function userHasApplicationAccess(userId: string): Promise<boolean> {
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role,status")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.role === "admin") return true;
  if (["suspended", "rejected"].includes(profile?.status || "")) return false;
  return Boolean(profile);
}
