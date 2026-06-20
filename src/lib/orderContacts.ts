import { supabase } from "./supabase";

export type PartnerOrderCustomer = {
  order_id: string;
  client_id: string;
  display_name: string;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
};

export async function getPartnerOrderCustomers() {
  const { data, error } = await supabase.rpc("get_partner_order_customers");
  if (error) throw error;
  return (data || []) as PartnerOrderCustomer[];
}

export async function getCourierOrderClientContact(orderId: string) {
  const { data, error } = await supabase.rpc("get_courier_order_client_contact", {
    target_order_id: orderId,
  });
  if (error) throw error;
  return ((data || [])[0] || null) as {
    profile_id: string;
    display_name: string;
    first_name?: string | null;
    phone?: string | null;
  } | null;
}

export async function getClientOrderCourierContact(orderId: string) {
  const { data, error } = await supabase.rpc("get_client_order_courier_contact", {
    target_order_id: orderId,
  });
  if (error) throw error;
  return ((data || [])[0] || null) as {
    profile_id: string;
    display_name: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
}
