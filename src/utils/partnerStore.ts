export type PartnerProduct = {
  id: string;
  name: string;
  desc: string;
  partnerPrice: number;
  category: string;
  active: boolean;
  points: number;
  image?: string;
};

export type PartnerProfile = {
  establishmentId: string;
  name: string;
  hours: string;
  location: string;
  coverImage: string;
  categories: string[];
  products: PartnerProduct[];
};

const STORAGE_KEY = "foodiz_partner_profile_r1_v1";

export const DEFAULT_PARTNER_PROFILE: PartnerProfile = {
  establishmentId: "r1",
  name: "Maison K",
  hours: "Ouvert · 11:30 — 23:00",
  location: "15 rue de la Roquette · Paris 11e",
  coverImage: "/images/restaurant-maison-k.jpg",
  categories: ["Plats", "Menus", "Desserts", "Boissons"],
  products: [
    {
      id: "p1",
      name: "Burger Artisanal",
      desc: "Bœuf Black Angus, cheddar affiné, sauce maison",
      partnerPrice: 12.5,
      category: "Plats",
      active: true,
      points: 30,
      image: "/images/restaurant-maison-k.jpg",
    },
    {
      id: "p2",
      name: "Frites Maison Or",
      desc: "Pommes fondantes, sel fumé, herbes fines",
      partnerPrice: 4.2,
      category: "Plats",
      active: true,
      points: 20,
      image: "/images/restaurant-bistrot.jpg",
    },
    {
      id: "m1",
      name: "Menu Signature",
      desc: "Plat + boisson + douceur de la maison",
      partnerPrice: 24,
      category: "Menus",
      active: true,
      points: 30,
      image: "/images/restaurant-bistrot.jpg",
    },
    {
      id: "d1",
      name: "Tiramisu",
      desc: "Mascarpone, café corsé, cacao amer",
      partnerPrice: 6.5,
      category: "Desserts",
      active: true,
      points: 20,
      image: "/images/auth-restaurant.jpg",
    },
    {
      id: "b1",
      name: "Limonade Maison",
      desc: "Citron bio, menthe fraîche",
      partnerPrice: 3.5,
      category: "Boissons",
      active: true,
      points: 10,
      image: "/images/market-bio.jpg",
    },
  ],
};

export function getCustomerPrice(partnerPrice: number) {
  if (partnerPrice <= 3.5) return partnerPrice + 1.2;
  if (partnerPrice <= 8.49) return partnerPrice + 2.5;
  return partnerPrice + 3.5;
}

export function getPoints(partnerPrice: number) {
  if (partnerPrice <= 3.5) return 10;
  if (partnerPrice <= 8.49) return 20;
  return 30;
}

export function loadPartnerProfile(): PartnerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PARTNER_PROFILE;
    const parsed = JSON.parse(raw) as PartnerProfile;
    return {
      ...DEFAULT_PARTNER_PROFILE,
      ...parsed,
      categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_PARTNER_PROFILE.categories,
      products: Array.isArray(parsed.products) ? parsed.products : DEFAULT_PARTNER_PROFILE.products,
    };
  } catch {
    return DEFAULT_PARTNER_PROFILE;
  }
}

export function savePartnerProfile(profile: PartnerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function upsertPartnerProduct(product: PartnerProduct) {
  const profile = loadPartnerProfile();
  const exists = profile.products.some((p) => p.id === product.id);
  const nextProducts = exists
    ? profile.products.map((p) => (p.id === product.id ? product : p))
    : [...profile.products, product];

  const nextCategories = profile.categories.includes(product.category)
    ? profile.categories
    : [...profile.categories, product.category];

  const nextProfile = {
    ...profile,
    categories: nextCategories,
    products: nextProducts,
  };
  savePartnerProfile(nextProfile);
}

export function addPartnerCategory(category: string) {
  const profile = loadPartnerProfile();
  const cleaned = category.trim();
  if (!cleaned) return;
  if (profile.categories.includes(cleaned)) return;
  savePartnerProfile({
    ...profile,
    categories: [...profile.categories, cleaned],
  });
}

export function updatePartnerProfile(partial: Partial<PartnerProfile>) {
  const profile = loadPartnerProfile();
  savePartnerProfile({ ...profile, ...partial });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
