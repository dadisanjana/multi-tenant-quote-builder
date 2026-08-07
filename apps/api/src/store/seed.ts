import { Organization, Quote, User } from './models';

export const organizations: Organization[] = [
  { id: 'org-acme', name: 'Acme Contractors' },
  { id: 'org-beta', name: 'Beta Builders' },
];

export const users: User[] = [
  { id: 'user-alice', name: 'Alice', organizationId: 'org-acme' },
  { id: 'user-amy', name: 'Amy', organizationId: 'org-acme' },
  { id: 'user-bob', name: 'Bob', organizationId: 'org-beta' },
];

const seededAt = '2026-08-07T12:00:00.000Z';

export const quotes: Quote[] = [
  {
    id: 'quote-acme-1',
    organizationId: 'org-acme',
    customerName: 'Jordan Homeowner',
    status: 'draft',
    taxRate: 8,
    discount: null,
    sections: [
      {
        id: 'section-acme-labor',
        name: 'Roof repair',
        markupPercent: 10,
        lineItems: [
          {
            id: 'line-acme-1',
            description: 'Repair labor',
            quantity: 2,
            unitPriceCents: 10000,
          },
          {
            id: 'line-acme-2',
            description: 'Materials',
            quantity: 1,
            unitPriceCents: 5000,
          },
        ],
      },
    ],
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: 'quote-beta-1',
    organizationId: 'org-beta',
    customerName: 'Taylor Customer',
    status: 'sent',
    taxRate: 7.5,
    discount: { type: 'percentage', value: 5 },
    sections: [
      {
        id: 'section-beta-1',
        name: 'Kitchen refresh',
        markupPercent: 12,
        lineItems: [
          {
            id: 'line-beta-1',
            description: 'Cabinet installation',
            quantity: 8,
            unitPriceCents: 12500,
          },
        ],
      },
    ],
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];
