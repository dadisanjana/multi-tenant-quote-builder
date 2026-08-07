export type QuoteStatus = 'draft' | 'sent' | 'accepted';
export type DiscountType = 'percentage' | 'fixed';

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  organizationId: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Section {
  id: string;
  name: string;
  markupPercent: number | null;
  lineItems: LineItem[];
}

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface Quote {
  id: string;
  organizationId: string;
  customerName: string;
  status: QuoteStatus;
  taxRate: number;
  discount: Discount | null;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}
