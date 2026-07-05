export type ProductOfferFields = {
  partner_price_cents: number;
  promotion_label?: string | null;
  promotion_partner_price_cents?: number | null;
  promotion_starts_at?: string | null;
  promotion_ends_at?: string | null;
};

export function productOfferIsActive(
  product: ProductOfferFields,
  now = Date.now(),
) {
  const promotionalPrice = Number(product.promotion_partner_price_cents);
  const standardPrice = Number(product.partner_price_cents);
  if (
    !Number.isInteger(promotionalPrice)
    || promotionalPrice < 50
    || promotionalPrice >= standardPrice
  ) {
    return false;
  }

  const startsAt = product.promotion_starts_at
    ? new Date(product.promotion_starts_at).getTime()
    : null;
  const endsAt = product.promotion_ends_at
    ? new Date(product.promotion_ends_at).getTime()
    : null;

  if (startsAt !== null && (!Number.isFinite(startsAt) || now < startsAt)) {
    return false;
  }
  if (endsAt !== null && (!Number.isFinite(endsAt) || now >= endsAt)) {
    return false;
  }
  return true;
}

export function effectivePartnerPriceCents(
  product: ProductOfferFields,
  now = Date.now(),
) {
  return productOfferIsActive(product, now)
    ? Number(product.promotion_partner_price_cents)
    : Number(product.partner_price_cents);
}
