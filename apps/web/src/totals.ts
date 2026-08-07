import { Quote, Section } from './types';

const roundCents = (dollars: number) => Math.round((Number.isFinite(dollars) ? dollars : 0) * 100);
const dollars = (cents: number) => cents / 100;

function sectionSubtotalCents(section: Section): number {
  const lineCents = section.lineItems.reduce((sum, item) => {
    const unitPriceCents = roundCents(item.unitPrice);
    return sum + Math.round((Number.isFinite(item.quantity) ? item.quantity : 0) * unitPriceCents);
  }, 0);
  const markupCents = Math.round(lineCents * ((section.markupPercent ?? 0) / 100));
  return lineCents + markupCents;
}

export function calculatePreview(quote: Quote) {
  const subtotalCents = quote.sections.reduce(
    (sum, section) => sum + sectionSubtotalCents(section),
    0,
  );

  let discountCents = 0;
  if (quote.discount?.type === 'percentage') {
    discountCents = Math.round(
      subtotalCents * (Math.min(Math.max(quote.discount.value, 0), 100) / 100),
    );
  } else if (quote.discount?.type === 'fixed') {
    discountCents = roundCents(Math.max(quote.discount.value, 0));
  }
  discountCents = Math.min(discountCents, subtotalCents);

  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * (Math.max(quote.taxRate, 0) / 100));

  return {
    subtotal: dollars(subtotalCents),
    discountAmount: dollars(discountCents),
    taxableAmount: dollars(taxableCents),
    taxAmount: dollars(taxCents),
    total: dollars(taxableCents + taxCents),
  };
}

export function calculateSectionPreview(section: Section) {
  const baseCents = section.lineItems.reduce((sum, item) => {
    const unitPriceCents = roundCents(item.unitPrice);
    return sum + Math.round((Number.isFinite(item.quantity) ? item.quantity : 0) * unitPriceCents);
  }, 0);
  const markupCents = Math.round(baseCents * ((section.markupPercent ?? 0) / 100));

  return {
    baseSubtotal: dollars(baseCents),
    markupAmount: dollars(markupCents),
    subtotal: dollars(baseCents + markupCents),
  };
}
