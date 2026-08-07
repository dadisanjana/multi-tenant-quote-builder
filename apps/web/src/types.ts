export type QuoteStatus = 'draft' | 'sent' | 'accepted';
export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
}

export interface Section {
  id?: string;
  name: string;
  markupPercent: number | null;
  lineItems: LineItem[];
  totals?: {
    baseSubtotal: number;
    markupAmount: number;
    subtotal: number;
  };
}

export interface Quote {
  id: string;
  customerName: string;
  status: QuoteStatus;
  taxRate: number;
  discount: Discount | null;
  sections: Section[];
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

export interface QuoteSummary {
  id: string;
  customerName: string;
  status: QuoteStatus;
  total: number;
  updatedAt: string;
}
