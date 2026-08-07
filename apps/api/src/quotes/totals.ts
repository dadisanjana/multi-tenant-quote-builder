import { Discount, Quote, Section } from '../store/models';

export interface LineItemView {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SectionView {
  id: string;
  name: string;
  markupPercent: number | null;
  lineItems: LineItemView[];
  totals: {
    baseSubtotal: number;
    markupAmount: number;
    subtotal: number;
  };
}

export interface QuoteView {
  id: string;
  customerName: string;
  status: Quote['status'];
  taxRate: number;
  discount: Discount | null;
  sections: SectionView[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

const centsToDollars = (cents: number): number => cents / 100;

function sectionTotals(section: Section) {
  const lineTotals = section.lineItems.map((lineItem) => ({
    item: lineItem,
    cents: Math.round(lineItem.quantity * lineItem.unitPriceCents),
  }));
  const baseSubtotalCents = lineTotals.reduce((sum, line) => sum + line.cents, 0);
  const markupAmountCents = Math.round(
    baseSubtotalCents * ((section.markupPercent ?? 0) / 100),
  );
  const subtotalCents = baseSubtotalCents + markupAmountCents;

  return {
    lineTotals,
    baseSubtotalCents,
    markupAmountCents,
    subtotalCents,
  };
}

export function presentQuote(quote: Quote): QuoteView {
  const sectionViews = quote.sections.map((section) => {
    const totals = sectionTotals(section);

    return {
      id: section.id,
      name: section.name,
      markupPercent: section.markupPercent,
      lineItems: totals.lineTotals.map(({ item, cents }) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: centsToDollars(item.unitPriceCents),
        lineTotal: centsToDollars(cents),
      })),
      totals: {
        baseSubtotal: centsToDollars(totals.baseSubtotalCents),
        markupAmount: centsToDollars(totals.markupAmountCents),
        subtotal: centsToDollars(totals.subtotalCents),
      },
    };
  });

  const subtotalCents = quote.sections.reduce(
    (sum, section) => sum + sectionTotals(section).subtotalCents,
    0,
  );

  let discountAmountCents = 0;
  if (quote.discount?.type === 'percentage') {
    discountAmountCents = Math.round(
      subtotalCents * (Math.min(quote.discount.value, 100) / 100),
    );
  } else if (quote.discount?.type === 'fixed') {
    discountAmountCents = Math.round(quote.discount.value * 100);
  }
  discountAmountCents = Math.min(discountAmountCents, subtotalCents);

  const taxableAmountCents = subtotalCents - discountAmountCents;
  const taxAmountCents = Math.round(taxableAmountCents * (quote.taxRate / 100));
  const totalCents = taxableAmountCents + taxAmountCents;

  return {
    id: quote.id,
    customerName: quote.customerName,
    status: quote.status,
    taxRate: quote.taxRate,
    discount: quote.discount,
    sections: sectionViews,
    totals: {
      subtotal: centsToDollars(subtotalCents),
      discountAmount: centsToDollars(discountAmountCents),
      taxableAmount: centsToDollars(taxableAmountCents),
      taxAmount: centsToDollars(taxAmountCents),
      total: centsToDollars(totalCents),
    },
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
}
