import { useEffect, useMemo, useState } from 'react';
import { getQuote, listQuotes, updateQuote } from './api';
import { calculatePreview, calculateSectionPreview } from './totals';
import { LineItem, Quote, QuoteSummary } from './types';

const USERS = [
  { id: 'user-alice', label: 'Alice — Acme Contractors' },
  { id: 'user-amy', label: 'Amy — Acme Contractors' },
  { id: 'user-bob', label: 'Bob — Beta Builders' },
];

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberValue = (value: string) => (value === '' ? 0 : Number(value));

export default function App() {
  const [userId, setUserId] = useState('user-alice');
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const previewTotals = useMemo(
    () => (quote ? calculatePreview(quote) : null),
    [quote],
  );

  useEffect(() => {
    void loadQuotesForUser(userId);
  }, [userId]);

  async function loadQuotesForUser(nextUserId: string) {
    setLoading(true);
    setMessage('');
    try {
      const summaries = await listQuotes(nextUserId);
      setQuotes(summaries);
      if (summaries.length > 0) {
        setQuote(await getQuote(nextUserId, summaries[0].id));
      } else {
        setQuote(null);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load quotes');
    } finally {
      setLoading(false);
    }
  }

  async function selectQuote(quoteId: string) {
    setLoading(true);
    setMessage('');
    try {
      setQuote(await getQuote(userId, quoteId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load quote');
    } finally {
      setLoading(false);
    }
  }

  function updateLineItem(sectionIndex: number, lineIndex: number, patch: Partial<LineItem>) {
    setQuote((current) => {
      if (!current) return current;
      const sections = current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return {
          ...section,
          lineItems: section.lineItems.map((line, currentLineIndex) =>
            currentLineIndex === lineIndex ? { ...line, ...patch } : line,
          ),
        };
      });
      return { ...current, sections };
    });
  }

  function updateMarkup(sectionIndex: number, markupPercent: number) {
    setQuote((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section, index) =>
          index === sectionIndex ? { ...section, markupPercent } : section,
        ),
      };
    });
  }

  function addLineItem(sectionIndex: number) {
    setQuote((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section, index) =>
          index === sectionIndex
            ? {
                ...section,
                lineItems: [
                  ...section.lineItems,
                  { description: 'New item', quantity: 1, unitPrice: 0 },
                ],
              }
            : section,
        ),
      };
    });
  }

  function removeLineItem(sectionIndex: number, lineIndex: number) {
    setQuote((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section, index) =>
          index === sectionIndex
            ? {
                ...section,
                lineItems: section.lineItems.filter((_, itemIndex) => itemIndex !== lineIndex),
              }
            : section,
        ),
      };
    });
  }

  async function save() {
    if (!quote) return;
    setSaving(true);
    setMessage('');
    try {
      const saved = await updateQuote(userId, quote);
      setQuote(saved);
      setQuotes(await listQuotes(userId));
      setMessage('Saved. Totals below are confirmed by the server.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save quote');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Take-home project</p>
          <h1>Multi-Tenant Quote Builder</h1>
        </div>
        <label className="user-picker">
          Acting user
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            {USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="layout">
        <aside className="sidebar card">
          <div className="sidebar-heading">
            <h2>Quotes</h2>
            <span>{quotes.length}</span>
          </div>
          {quotes.map((summary) => (
            <button
              className={`quote-link ${quote?.id === summary.id ? 'active' : ''}`}
              key={summary.id}
              onClick={() => void selectQuote(summary.id)}
            >
              <strong>{summary.customerName}</strong>
              <span>{summary.status} · {money.format(summary.total)}</span>
            </button>
          ))}
          <p className="hint">
            Switch users above to exercise tenant isolation. Alice/Amy share an organization; Bob belongs to another one.
          </p>
        </aside>

        <section className="content">
          {loading && <div className="card state">Loading…</div>}
          {!loading && !quote && <div className="card state">No quotes for this tenant.</div>}
          {!loading && quote && (
            <>
              <div className="card quote-header">
                <div className="field grow">
                  <label>Customer</label>
                  <input
                    value={quote.customerName}
                    onChange={(event) => setQuote({ ...quote, customerName: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Status</label>
                  <select
                    value={quote.status}
                    onChange={(event) =>
                      setQuote({ ...quote, status: event.target.value as Quote['status'] })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
                <div className="field small">
                  <label>Tax %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={quote.taxRate}
                    onChange={(event) =>
                      setQuote({ ...quote, taxRate: numberValue(event.target.value) })
                    }
                  />
                </div>
              </div>

              {quote.sections.map((section, sectionIndex) => {
                const sectionPreview = calculateSectionPreview(section);
                return (
                  <div className="card section-card" key={section.id ?? `new-${sectionIndex}`}>
                    <div className="section-title-row">
                      <h2>{section.name}</h2>
                      <label className="markup-field">
                        Markup %
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={section.markupPercent ?? 0}
                          onChange={(event) =>
                            updateMarkup(sectionIndex, numberValue(event.target.value))
                          }
                        />
                      </label>
                    </div>

                    <div className="line-grid line-grid-head">
                      <span>Description</span>
                      <span>Qty</span>
                      <span>Unit price</span>
                      <span>Line total</span>
                      <span aria-hidden="true" />
                    </div>

                    {section.lineItems.map((lineItem, lineIndex) => {
                      const lineTotal = Math.round(lineItem.quantity * Math.round(lineItem.unitPrice * 100)) / 100;
                      return (
                        <div className="line-grid" key={lineItem.id ?? `new-${lineIndex}`}>
                          <input
                            aria-label="Line item description"
                            value={lineItem.description}
                            onChange={(event) =>
                              updateLineItem(sectionIndex, lineIndex, { description: event.target.value })
                            }
                          />
                          <input
                            aria-label="Quantity"
                            type="number"
                            min="0"
                            step="0.001"
                            value={lineItem.quantity}
                            onChange={(event) =>
                              updateLineItem(sectionIndex, lineIndex, {
                                quantity: numberValue(event.target.value),
                              })
                            }
                          />
                          <input
                            aria-label="Unit price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={lineItem.unitPrice}
                            onChange={(event) =>
                              updateLineItem(sectionIndex, lineIndex, {
                                unitPrice: numberValue(event.target.value),
                              })
                            }
                          />
                          <strong>{money.format(lineTotal)}</strong>
                          <button
                            className="icon-button"
                            title="Remove line item"
                            onClick={() => removeLineItem(sectionIndex, lineIndex)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    <div className="section-footer">
                      <button className="secondary" onClick={() => addLineItem(sectionIndex)}>
                        + Add line item
                      </button>
                      <div className="section-totals">
                        <span>Base {money.format(sectionPreview.baseSubtotal)}</span>
                        <span>Markup {money.format(sectionPreview.markupAmount)}</span>
                        <strong>Section {money.format(sectionPreview.subtotal)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="card summary-card">
                <div>
                  <p className="eyebrow">Live preview</p>
                  <p className="hint">Updates locally on every keystroke; save sends the data to the API for authoritative recalculation.</p>
                </div>
                <dl>
                  <div><dt>Subtotal</dt><dd>{money.format(previewTotals!.subtotal)}</dd></div>
                  <div><dt>Discount</dt><dd>−{money.format(previewTotals!.discountAmount)}</dd></div>
                  <div><dt>Taxable</dt><dd>{money.format(previewTotals!.taxableAmount)}</dd></div>
                  <div><dt>Tax</dt><dd>{money.format(previewTotals!.taxAmount)}</dd></div>
                  <div className="grand-total"><dt>Total</dt><dd>{money.format(previewTotals!.total)}</dd></div>
                </dl>
                <button className="primary" disabled={saving} onClick={() => void save()}>
                  {saving ? 'Saving…' : 'Save quote'}
                </button>
              </div>
            </>
          )}
          {message && <div className="message">{message}</div>}
        </section>
      </div>
    </main>
  );
}
