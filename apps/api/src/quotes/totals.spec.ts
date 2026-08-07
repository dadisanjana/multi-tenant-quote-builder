import { Quote } from '../store/models';
import { presentQuote } from './totals';

const baseQuote = (overrides: Partial<Quote> = {}): Quote => ({
  id: 'quote-test',
  organizationId: 'org-test',
  customerName: 'Test Customer',
  status: 'draft',
  taxRate: 8,
  discount: null,
  sections: [
    {
      id: 'section-test',
      name: 'Work',
      markupPercent: 10,
      lineItems: [
        { id: 'line-1', description: 'One', quantity: 2, unitPriceCents: 10000 },
        { id: 'line-2', description: 'Two', quantity: 1, unitPriceCents: 5000 },
      ],
    },
  ],
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
  ...overrides,
});

describe('presentQuote', () => {
  it('matches the worked $297 example', () => {
    const result = presentQuote(baseQuote());
    expect(result.totals.subtotal).toBe(275);
    expect(result.totals.taxAmount).toBe(22);
    expect(result.totals.total).toBe(297);
  });

  it('applies percentage discount before tax', () => {
    const result = presentQuote(
      baseQuote({ discount: { type: 'percentage', value: 10 } }),
    );
    expect(result.totals.discountAmount).toBe(27.5);
    expect(result.totals.taxableAmount).toBe(247.5);
    expect(result.totals.taxAmount).toBe(19.8);
    expect(result.totals.total).toBe(267.3);
  });

  it('caps a fixed discount at the subtotal', () => {
    const result = presentQuote(
      baseQuote({ taxRate: 10, discount: { type: 'fixed', value: 1000 } }),
    );
    expect(result.totals.discountAmount).toBe(275);
    expect(result.totals.taxableAmount).toBe(0);
    expect(result.totals.total).toBe(0);
  });
});
