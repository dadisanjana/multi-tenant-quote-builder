import { Quote, QuoteSummary } from './types';

const API_URL = 'http://localhost:3001';

async function apiFetch<T>(path: string, userId: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const listQuotes = (userId: string) =>
  apiFetch<QuoteSummary[]>('/quotes', userId);

export const getQuote = (userId: string, quoteId: string) =>
  apiFetch<Quote>(`/quotes/${quoteId}`, userId);

export const updateQuote = (userId: string, quote: Quote) =>
  apiFetch<Quote>(`/quotes/${quote.id}`, userId, {
    method: 'PATCH',
    body: JSON.stringify({
      customerName: quote.customerName,
      status: quote.status,
      taxRate: quote.taxRate,
      discount: quote.discount,
      sections: quote.sections.map((section) => ({
        id: section.id,
        name: section.name,
        markupPercent: section.markupPercent,
        lineItems: section.lineItems.map((lineItem) => ({
          id: lineItem.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unitPrice: lineItem.unitPrice,
        })),
      })),
    }),
  });
