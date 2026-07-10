export interface PricedCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface AdvantageOption {
  id: string;
  name: string;
  points: number;
  discountType:
    | "percent"
    | "delivery_full"
    | "delivery_fixed"
    | "fixed"
    | "service_full"
    | "dessert_cheapest"
    | "none";
  discountValue: number;
  source?: "saved" | "cart";
}

export const LOCKED_ADVANTAGE_KEY = "weello_locked_advantage_v1";
export const ADVANTAGES_SET_KEY = "weello_advantages_set_v1";
export const CART_SELECTED_ADVANTAGE_KEY = "weello_cart_selected_advantage_v1";

export const DEFAULT_ADVANTAGES: AdvantageOption[] = [
  { id: "a1", name: "-10 % sur votre commande", points: 200, discountType: "percent", discountValue: 10, source: "cart" },
  { id: "a2", name: "Livraison offerte", points: 150, discountType: "delivery_full", discountValue: 100, source: "cart" },
  { id: "a3", name: "Dessert offert max 8€", points: 800, discountType: "dessert_cheapest", discountValue: 8, source: "cart" },
];

export function buildSavedAdvantage(): AdvantageOption | null {
  const lockedId = localStorage.getItem(LOCKED_ADVANTAGE_KEY);
  const savedSet = localStorage.getItem(ADVANTAGES_SET_KEY);

  if (!lockedId || !savedSet) return null;

  try {
    const advantages = JSON.parse(savedSet) as Array<{ id: string; title: string; pointsCost: number }>;
    const locked = advantages.find((item) => item.id === lockedId);
    if (!locked) return null;

    return parseAdvantageFromTitle(locked.id, locked.title, locked.pointsCost, "saved");
  } catch {
    return null;
  }
}

export function parseAdvantageFromTitle(
  id: string,
  title: string,
  points: number,
  source: AdvantageOption["source"] = "saved"
): AdvantageOption {
  const normalized = title.toLowerCase();
  const euroMatch = normalized.match(/(\d+)\s*€/);
  const percentMatch = normalized.match(/(\d+)\s*%/);

  if (normalized.includes("frais de service offerts")) {
    return { id, name: title, points, discountType: "service_full", discountValue: 100, source };
  }

  if (normalized.includes("livraison offerte")) {
    return { id, name: title, points, discountType: "delivery_full", discountValue: 100, source };
  }

  if (normalized.includes("dessert offert")) {
    return { id, name: title, points, discountType: "dessert_cheapest", discountValue: 8, source };
  }

  if (normalized.includes("livraison") && euroMatch) {
    return {
      id,
      name: title,
      points,
      discountType: "delivery_fixed",
      discountValue: Number(euroMatch[1]),
      source,
    };
  }

  if (percentMatch) {
    return {
      id,
      name: title,
      points,
      discountType: "percent",
      discountValue: Number(percentMatch[1]),
      source,
    };
  }

  if (euroMatch) {
    return {
      id,
      name: title,
      points,
      discountType: "fixed",
      discountValue: Number(euroMatch[1]),
      source,
    };
  }

  return {
    id,
    name: title,
    points,
    discountType: "none",
    discountValue: 0,
    source,
  };
}

function isDessertItem(item: PricedCartItem) {
  const name = item.name.toLowerCase();
  const category = item.category?.toLowerCase();
  return (
    category === "desserts" ||
    category === "dessert" ||
    name.includes("tiramisu") ||
    name.includes("crème brûlée") ||
    name.includes("creme brulee") ||
    name.includes("fondant") ||
    name.includes("dessert") ||
    name.includes("glace") ||
    name.includes("mousse") ||
    name.includes("cookie") ||
    name.includes("brownie")
  );
}

export function computeAdvantageDiscount(
  advantage: AdvantageOption | null,
  subtotal: number,
  deliveryFee: number,
  serviceFee: number,
  items: PricedCartItem[] = []
) {
  if (!advantage) return 0;

  switch (advantage.discountType) {
    case "percent":
      return subtotal * (advantage.discountValue / 100);
    case "delivery_full":
      return deliveryFee;
    case "delivery_fixed":
      return Math.min(advantage.discountValue, deliveryFee);
    case "service_full":
      return serviceFee;
    case "fixed":
      return Math.min(advantage.discountValue, subtotal);
    case "dessert_cheapest": {
      const desserts = items.filter(isDessertItem);
      if (desserts.length === 0) return 0;
      const cheapestDessert = Math.min(...desserts.map((item) => item.price));
      return Math.min(cheapestDessert, advantage.discountValue);
    }
    default:
      return 0;
  }
}
