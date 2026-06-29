import type { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });
  if (await userRole(user.id) !== "admin") return reply(403, { error: "Admin required" });

  if (event.httpMethod === "GET") {
    const [
      { data: areas, error: areasError },
      { data: partners, error: partnersError },
      { data: couriers, error: couriersError },
      { data: restaurants, error: restaurantsError },
      { data: partnerDocuments, error: partnerDocumentsError },
      { data: courierDocuments, error: courierDocumentsError },
      { data: expansionRequests, error: expansionRequestsError },
    ] = await Promise.all([
      adminSupabase
        .from("service_areas")
        .select("*")
        .order("city", { ascending: true }),
      adminSupabase
        .from("partner_applications")
        .select("id,service_area_id,status,compliance_status"),
      adminSupabase
        .from("courier_applications")
        .select("user_id,service_area_id,status,document_review_status"),
      adminSupabase
        .from("restaurants")
        .select("service_area_id,is_active"),
      adminSupabase
        .from("partner_documents")
        .select("application_id,status"),
      adminSupabase
        .from("courier_documents")
        .select("user_id,status"),
      adminSupabase
        .from("city_expansion_requests")
        .select("id,user_id,service_area_id,status,created_at"),
    ]);
    const loadError = areasError || partnersError || couriersError || restaurantsError || partnerDocumentsError || courierDocumentsError || expansionRequestsError;
    if (loadError) {
      console.error("Service area dashboard load failed", loadError);
      return reply(500, { error: "Impossible de charger les villes Foodiz." });
    }

    return reply(200, {
      areas: (areas || []).map((area) => {
        const areaPartners = (partners || []).filter((item) => item.service_area_id === area.id);
        const areaCouriers = (couriers || []).filter((item) => item.service_area_id === area.id);
        const partnerApplicationIds = new Set(areaPartners.map((item) => item.id));
        const courierUserIds = new Set(areaCouriers.map((item) => item.user_id));
        const partnerDocumentsToReview = (partnerDocuments || []).filter((document) => (
          partnerApplicationIds.has(document.application_id)
          && document.status !== "approved"
        )).length;
        const courierDocumentsToReview = (courierDocuments || []).filter((document) => (
          courierUserIds.has(document.user_id)
          && document.status !== "approved"
        )).length;
        return {
          ...area,
          counts: {
            partnerApplications: areaPartners.length,
            approvedPartners: areaPartners.filter((item) => item.compliance_status === "approved").length,
            partnerApplicationsToReview: areaPartners.filter((item) => ["pending", "pending_review", "documents_required", "replacement_requested"].includes(item.compliance_status || item.status || "")).length,
            partnerDocumentsToReview,
            activeRestaurants: (restaurants || []).filter((item) => item.service_area_id === area.id && item.is_active).length,
            courierApplications: areaCouriers.length,
            approvedCouriers: areaCouriers.filter((item) => (
              item.status === "validated" && item.document_review_status === "approved"
            )).length,
            courierApplicationsToReview: areaCouriers.filter((item) => ["pending", "pending_review", "documents_required", "replacement_requested"].includes(item.document_review_status || item.status || "")).length,
            courierDocumentsToReview,
            documentsToReview: partnerDocumentsToReview + courierDocumentsToReview,
            expansionRequests: (expansionRequests || []).filter((item) => (
              item.service_area_id === area.id
              && ["requested", "reviewing", "planned"].includes(item.status)
            )).length,
          },
        };
      }),
    });
  }

  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const areaId = String(body.areaId || "");
  const status = String(body.status || "");
  const deliveryRadiusKm = Number(body.deliveryRadiusKm);
  if (!areaId || !Number.isFinite(deliveryRadiusKm)) {
    return reply(400, { error: "Ville ou rayon invalide." });
  }
  const { error } = await adminSupabase.rpc("set_service_area_status_server", {
    target_area_id: areaId,
    target_reviewer_id: user.id,
    target_status: status,
    target_delivery_radius_km: deliveryRadiusKm,
  });
  if (error) return reply(409, { error: error.message || "La ville n’a pas pu être mise à jour." });
  return reply(200, { updated: true });
};

export { handler };
