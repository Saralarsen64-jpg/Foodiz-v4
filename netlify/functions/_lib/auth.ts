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
  if (await userRole(userId) === "admin") return true;
  if (!(await appIsLaunched())) return false;

  const { data: prelaunchProfile } = await adminSupabase
    .from("prelaunch_profiles")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle();

  return !prelaunchProfile || prelaunchProfile.status === "activated";
}
