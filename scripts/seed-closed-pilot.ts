import { createClient } from "@supabase/supabase-js";

const productionProjectRefs = new Set(["ggjwpgqwnhguxnvtjxca"]);
const supabaseUrl = process.env.PILOT_SUPABASE_URL || "";
const serviceRoleKey = process.env.PILOT_SUPABASE_SERVICE_ROLE_KEY || "";
const confirmation = process.env.PILOT_CONFIRM;

const requiredCredentials = {
  client: {
    email: process.env.PILOT_CLIENT_EMAIL || "",
    password: process.env.PILOT_CLIENT_PASSWORD || "",
  },
  partner: {
    email: process.env.PILOT_PARTNER_EMAIL || "",
    password: process.env.PILOT_PARTNER_PASSWORD || "",
  },
  courier: {
    email: process.env.PILOT_COURIER_EMAIL || "",
    password: process.env.PILOT_COURIER_PASSWORD || "",
  },
};

function fail(message: string): never {
  throw new Error(message);
}

if (!supabaseUrl || !serviceRoleKey) {
  fail("Configure PILOT_SUPABASE_URL and PILOT_SUPABASE_SERVICE_ROLE_KEY.");
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
if (productionProjectRefs.has(projectRef)) {
  fail("Safety stop: the closed-pilot seed can never target Foodiz Production.");
}
if (confirmation !== "MONT-DE-MARSAN-CLOSED-PILOT") {
  fail("Set PILOT_CONFIRM=MONT-DE-MARSAN-CLOSED-PILOT.");
}
for (const [role, credentials] of Object.entries(requiredCredentials)) {
  if (!credentials.email || credentials.password.length < 12) {
    fail(`Provide a test email and a 12-character password for ${role}.`);
  }
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function assertPilotSchema() {
  for (const table of [
    "city_expansion_requests",
    "foodiz_email_events",
    "service_areas",
  ]) {
    const { error } = await supabase.from(table).select("*", { head: true, count: "exact" });
    if (error) fail(`Pilot schema is incomplete: ${table} (${error.message})`);
  }

  const { error: addressError } = await supabase
    .from("client_addresses")
    .select("latitude,longitude", { head: true })
    .limit(1);
  if (addressError) {
    fail(`Migration 45 is missing: ${addressError.message}`);
  }
}

async function createOrGetUser(
  role: "client" | "partner" | "courier",
  email: string,
  password: string,
  metadata: Record<string, unknown>,
) {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const found = existing.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (found) return found;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, ...metadata },
  });
  if (error || !data.user) throw error || new Error(`Unable to create ${role}`);
  return data.user;
}

await assertPilotSchema();

const client = await createOrGetUser(
  "client",
  requiredCredentials.client.email,
  requiredCredentials.client.password,
  {
    first_name: "Client",
    last_name: "Pilote",
    full_name: "Client Pilote",
    phone: "+33600000001",
    address: "1 place Charles de Gaulle",
    postal_code: "40000",
    city: "Mont-de-Marsan",
    cgu_accepted: true,
  },
);

const partner = await createOrGetUser(
  "partner",
  requiredCredentials.partner.email,
  requiredCredentials.partner.password,
  {
    first_name: "Partenaire",
    last_name: "Pilote",
    full_name: "Partenaire Pilote",
    business_name: "Table Pilote Foodiz",
    siret: "11111111111111",
    phone: "+33558000002",
    address: "2 place Charles de Gaulle",
    postal_code: "40000",
    city: "Mont-de-Marsan",
    cgu_accepted: true,
  },
);

const courier = await createOrGetUser(
  "courier",
  requiredCredentials.courier.email,
  requiredCredentials.courier.password,
  {
    first_name: "Livreur",
    last_name: "Pilote",
    full_name: "Livreur Pilote",
    phone: "+33600000003",
    address: "3 place Charles de Gaulle",
    postal_code: "40000",
    city: "Mont-de-Marsan",
    cgu_accepted: true,
  },
);

const { data: area, error: areaError } = await supabase
  .from("service_areas")
  .upsert(
    {
      city: "Mont-de-Marsan",
      city_normalized: "mont de marsan",
      postal_codes: ["40000"],
      department_code: "40",
      region_name: "Nouvelle-Aquitaine",
      center_latitude: 43.8907,
      center_longitude: -0.5004,
      delivery_radius_km: 12,
      status: "pilot",
      opened_at: new Date().toISOString(),
    },
    { onConflict: "city_normalized,department_code" },
  )
  .select("id")
  .single();
if (areaError || !area) throw areaError || new Error("Pilot area was not created.");

const profileUpdates = [
  supabase
    .from("profiles")
    .update({
      status: "active",
      address: "1 place Charles de Gaulle",
      postal_code: "40000",
      city: "Mont-de-Marsan",
      latitude: 43.8907,
      longitude: -0.5004,
    })
    .eq("id", client.id),
  supabase.from("profiles").update({ status: "validated" }).eq("id", partner.id),
  supabase.from("profiles").update({ status: "validated" }).eq("id", courier.id),
];
const profileResults = await Promise.all(profileUpdates);
const profileError = profileResults.find((result) => result.error)?.error;
if (profileError) throw profileError;

const { error: addressError } = await supabase.rpc(
  "save_client_delivery_address_server",
  {
    target_user_id: client.id,
    target_address_id: null,
    target_label: "Pilote Mont-de-Marsan",
    target_address: "1 place Charles de Gaulle",
    target_postal_code: "40000",
    target_city: "Mont-de-Marsan",
    target_latitude: 43.8907,
    target_longitude: -0.5004,
    make_default: true,
  },
);
if (addressError) throw addressError;

let { data: restaurant, error: restaurantError } = await supabase
  .from("restaurants")
  .select("id")
  .eq("owner_id", partner.id)
  .maybeSingle();
if (restaurantError) throw restaurantError;
if (!restaurant) {
  const created = await supabase
    .from("restaurants")
    .insert({
      owner_id: partner.id,
      name: "Table Pilote Foodiz",
      siret: "11111111111111",
      phone: "+33558000002",
      address: "2 place Charles de Gaulle",
      postal_code: "40000",
      city: "Mont-de-Marsan",
      latitude: 43.8912,
      longitude: -0.4998,
      status: "active",
      is_active: true,
      service_area_id: area.id,
    })
    .select("id")
    .single();
  if (created.error || !created.data) throw created.error;
  restaurant = created.data;
}

const operationalResults = await Promise.all([
  supabase
    .from("restaurants")
    .update({
      status: "active",
      is_active: true,
      service_area_id: area.id,
      latitude: 43.8912,
      longitude: -0.4998,
    })
    .eq("id", restaurant.id),
  supabase
    .from("partner_applications")
    .update({
      status: "validated",
      compliance_status: "approved",
      service_area_id: area.id,
    })
    .eq("user_id", partner.id),
  supabase
    .from("courier_applications")
    .update({
      status: "validated",
      document_review_status: "approved",
      service_area_id: area.id,
      siret: "22222222222222",
      legal_name: "Livreur Pilote",
      address: "3 place Charles de Gaulle",
      postal_code: "40000",
      city: "Mont-de-Marsan",
      availability_slots: ["midi", "soiree"],
      availability_days: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
      availability_flexible: true,
    })
    .eq("user_id", courier.id),
]);
const operationalError = operationalResults.find((result) => result.error)?.error;
if (operationalError) throw operationalError;

const products = [
  {
    name: "[PILOTE T1] Douceur locale",
    description: "Produit de validation tranche 1",
    partner_price_cents: 350,
    category: "Tests Foodiz",
  },
  {
    name: "[PILOTE T2] Formule montoise",
    description: "Produit de validation tranche 2",
    partner_price_cents: 600,
    category: "Tests Foodiz",
  },
  {
    name: "[PILOTE T3] Menu signature",
    description: "Produit de validation tranche 3",
    partner_price_cents: 1000,
    category: "Tests Foodiz",
  },
];

for (const product of products) {
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("restaurant_id", restaurant.id)
    .eq("name", product.name)
    .maybeSingle();
  if (existingError) throw existingError;
  const result = existing
    ? await supabase
        .from("products")
        .update({ ...product, is_active: true })
        .eq("id", existing.id)
    : await supabase
        .from("products")
        .insert({ ...product, restaurant_id: restaurant.id, is_active: true });
  if (result.error) throw result.error;
}

console.log(
  JSON.stringify(
    {
      seeded: true,
      projectRef,
      city: "Mont-de-Marsan",
      serviceAreaId: area.id,
      restaurantId: restaurant.id,
      clientId: client.id,
      partnerId: partner.id,
      courierId: courier.id,
      products: products.map((product) => product.name),
      nextStep:
        "Create and complete the order through the client app with Stripe Test.",
    },
    null,
    2,
  ),
);
