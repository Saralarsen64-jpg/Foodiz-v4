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

  const { data: prelaunchProfile } = await adminSupabase
    .from("prelaunch_profiles")
    .select("status,role,access_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!(await appIsLaunched())) {
    if (!prelaunchProfile?.access_enabled) return false;

    if (prelaunchProfile.role === "livreur") {
      const { data: application } = await adminSupabase
        .from("courier_applications")
        .select("status,document_review_status,service_area:service_areas!courier_applications_service_area_id_fkey(status)")
        .eq("user_id", userId)
        .maybeSingle();
      const area = Array.isArray(application?.service_area)
        ? application?.service_area[0]
        : application?.service_area;
      return application?.status === "validated"
        && application?.document_review_status === "approved"
        && ["pilot", "open"].includes(area?.status || "");
    }

    if (prelaunchProfile.role === "partenaire") {
      const { data: application } = await adminSupabase
        .from("partner_applications")
        .select("status,compliance_status,service_area:service_areas!partner_applications_service_area_id_fkey(status)")
        .eq("user_id", userId)
        .maybeSingle();
      const area = Array.isArray(application?.service_area)
        ? application?.service_area[0]
        : application?.service_area;
      return application?.status === "validated"
        && application?.compliance_status === "approved"
        && ["preparing", "pilot", "open"].includes(area?.status || "");
    }
    return false;
  }

  return !prelaunchProfile || prelaunchProfile.status === "activated";
}
