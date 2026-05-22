export type ValidationStatus = "pending" | "validated" | "suspended" | "missing_documents";

export type PartnerApplication = {
  id: string;
  name: string;
  siret: string;
  city: string;
  iban: string;
  status: ValidationStatus;
  createdAt: string;
};

export type CourierApplication = {
  id: string;
  name: string;
  city: string;
  vehicle: string;
  iban: string;
  status: ValidationStatus;
  createdAt: string;
};

const PARTNER_KEY = "foodiz_partner_applications_v1";
const COURIER_KEY = "foodiz_courier_applications_v1";

export function loadPartnerApplications(): PartnerApplication[] {
  try {
    const raw = localStorage.getItem(PARTNER_KEY);
    return raw ? (JSON.parse(raw) as PartnerApplication[]) : [];
  } catch {
    return [];
  }
}

export function savePartnerApplications(items: PartnerApplication[]) {
  localStorage.setItem(PARTNER_KEY, JSON.stringify(items));
}

export function loadCourierApplications(): CourierApplication[] {
  try {
    const raw = localStorage.getItem(COURIER_KEY);
    return raw ? (JSON.parse(raw) as CourierApplication[]) : [];
  } catch {
    return [];
  }
}

export function saveCourierApplications(items: CourierApplication[]) {
  localStorage.setItem(COURIER_KEY, JSON.stringify(items));
}
