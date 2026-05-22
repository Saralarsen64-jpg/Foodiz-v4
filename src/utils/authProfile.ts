import { supabase } from "../lib/supabase";

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any>;
};

export type AppRole = "client" | "partner" | "courier" | "admin";
export type AppStatus = "pending" | "validated" | "suspended" | "missing_documents" | "active" | "pending_admin_review";

export type ProfileRow = {
  id: string;
  role: AppRole;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  points_balance?: number | null;
};

function getRoleFromUser(user: AuthUser): AppRole {
  return (user.user_metadata?.role || "client") as AppRole;
}

function getStatusFromRole(role: AppRole): AppStatus {
  return role === "client" ? "active" : "pending";
}

export async function ensureProfileFromAuthUser(user: AuthUser) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email, phone, status, points_balance")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (existing) return existing;

  const role = getRoleFromUser(user);
  const firstName = user.user_metadata?.first_name || null;
  const lastName = user.user_metadata?.last_name || null;
  const phone = user.user_metadata?.phone || null;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      role,
      first_name: firstName,
      last_name: lastName,
      email: user.email || null,
      phone,
      status: getStatusFromRole(role),
      points_balance: 0,
      updated_at: new Date().toISOString(),
    })
    .select("id, role, first_name, last_name, email, phone, status, points_balance")
    .single<ProfileRow>();

  if (error) throw error;
  return data;
}

export async function ensurePartnerApplication(user: AuthUser) {
  const { data: existing } = await supabase
    .from("partner_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("partner_applications")
    .insert({
      user_id: user.id,
      city: null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, status")
    .single();

  if (error) throw error;
  return data;
}

export async function ensureCourierApplication(user: AuthUser) {
  const { data: existing } = await supabase
    .from("courier_applications")
    .select("id, status, city, vehicle_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("courier_applications")
    .insert({
      user_id: user.id,
      city: null,
      vehicle_type: null,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, status, city, vehicle_type")
    .single();

  if (error) throw error;
  return data;
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return { user: null, profile: null };

  const profile = await ensureProfileFromAuthUser(user as AuthUser);
  return { user, profile };
}

export async function getPartnerRestaurant(ownerId: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, status")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCourierApplication(userId: string) {
  const { data, error } = await supabase
    .from("courier_applications")
    .select("id, status, city, vehicle_type")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function resolveRedirectPath() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return "/auth/login";

  const profile = await ensureProfileFromAuthUser(user as AuthUser);
  if (!profile) return "/auth/login";

  if (profile.role === "admin") return "/admin";

  if (profile.role === "client") return "/client";

  if (profile.role === "partner") {
    await ensurePartnerApplication(user as AuthUser);
    const restaurant = await getPartnerRestaurant(user.id);
    if (!restaurant) return "/partner/onboarding";
    if (restaurant.status !== "active") return "/partner/validation-status";
    return "/partner";
  }

  if (profile.role === "courier") {
    const application = await ensureCourierApplication(user as AuthUser);
    if (!application) return "/courier/onboarding";
    if (application.status !== "validated") return "/courier/validation-status";
    return "/courier";
  }

  return "/auth/login";
}

export function getFullName(profile?: ProfileRow | null) {
  if (!profile) return "Utilisateur";
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return name || profile.email || "Utilisateur";
}
