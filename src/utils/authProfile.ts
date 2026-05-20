import { supabase } from "../lib/supabase";

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

export async function upsertProfileFromSignup(input: {
  userId: string;
  role: AppRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const status = input.role === "client" ? "active" : "pending";

  const { error } = await supabase.from("profiles").upsert({
    id: input.userId,
    role: input.role,
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    status,
    points_balance: 0,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email, phone, status, points_balance")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) throw profileError;
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
  const { user, profile } = await getCurrentUserProfile();
  if (!user || !profile) return "/auth/login";

  if (profile.role === "admin") return "/admin";

  if (profile.role === "client") return "/client";

  if (profile.role === "partner") {
    const restaurant = await getPartnerRestaurant(user.id);
    if (!restaurant) return "/partner/onboarding";
    if (restaurant.status !== "active") return "/partner/validation-status";
    return "/partner";
  }

  if (profile.role === "courier") {
    const application = await getCourierApplication(user.id);
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
