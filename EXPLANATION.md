# Code Walkthrough

This document is written for the live follow-up session: it explains what each important file does, the main data flow, and the tradeoffs that are easiest to discuss while extending the code.

## 1. Request flow

A browser request looks like this:

```text
React
  -> fetch(..., X-User-Id)
  -> TenantGuard
  -> QuotesController
  -> QuotesService
  -> StoreService
  -> presentQuote() totals/response mapping
  -> JSON response
```

The most important security idea is that a quote is never fetched first and then checked afterward. `QuotesService.requireTenantQuote()` asks the store for `(quoteId, organizationId)` together.

## 2. API bootstrap

`apps/api/src/main.ts`

- creates the Nest app;
- enables CORS for the local Vite dev server;
- installs a global `ValidationPipe`;
- `whitelist: true` strips only declared DTO fields;
- `forbidNonWhitelisted: true` turns extra fields into a 400 instead of silently accepting them;
- listens on port 3001.

The extra-field rejection matters for tenant isolation because a client cannot sneak `organizationId` into a create/update payload.

## 3. Tenant context

`apps/api/src/common/tenant.guard.ts`

The guard reads `X-User-Id`, rejects missing/unknown users, then attaches this server-side context to the request:

```ts
request.tenant = {
  userId: user.id,
  organizationId: user.organizationId,
};
```

Controllers use `request.tenant.organizationId`; they do not accept organization selection from params or request bodies.

## 4. In-memory store and seed data

`apps/api/src/store/models.ts` contains simple domain interfaces.

`apps/api/src/store/seed.ts` creates:

- Acme Contractors with Alice and Amy;
- Beta Builders with Bob;
- one quote per organization.

The first quote is deliberately the prompt's $297 example, which makes manual review and automated verification straightforward.

`apps/api/src/store/store.service.ts` clones data at its boundaries using `structuredClone`. That prevents callers from accidentally mutating the store without going through `replaceQuote()`.

The security-sensitive methods are:

```ts
listQuotesByOrganization(organizationId)
findQuoteByIdAndOrganization(quoteId, organizationId)
```

There is intentionally no public `findQuoteById()` used by the quote service.

## 5. DTO validation

`apps/api/src/quotes/dto/quote.dto.ts`

The DTOs validate:

- customer name;
- status;
- tax rate;
- optional discount;
- nested sections;
- nested line items;
- non-negative quantities/prices;
- decimal precision.

Nested DTOs use `@ValidateNested()` plus `@Type()` so Nest/class-validator actually validates child objects instead of only the top-level body.

## 6. Quote service

`apps/api/src/quotes/quotes.service.ts`

### List

`list(organizationId)` loads only the organization's quotes and returns compact summaries.

### Get

`get(organizationId, quoteId)` goes through `requireTenantQuote()`. If the `(quoteId, orgId)` pair is not found, the service returns 404.

### Create

`create(organizationId, input)` gets `organizationId` from tenant context. New section and line IDs are generated with `crypto.randomUUID()`.

Unit prices enter the API as dollars and become integer cents:

```ts
unitPriceCents: Math.round(input.unitPrice * 100)
```

### Update

`PATCH` supports changing scalar fields and nested sections.

If `sections` is omitted, existing sections are untouched. If it is supplied, `replaceNestedSections()` builds the new nested state:

- missing item ID -> create;
- known item ID -> update;
- previously existing item omitted -> remove;
- unknown supplied ID -> 400.

The unknown-ID rejection avoids accepting IDs that were not part of the quote being edited.

### `requireTenantQuote()`

This is the most important method to be able to explain:

```ts
const quote = this.store.findQuoteByIdAndOrganization(quoteId, organizationId);
if (!quote) throw new NotFoundException('Quote not found');
```

The lookup itself is tenant-scoped, so the rest of the update logic never receives another organization's quote.

## 7. Server-side totals

`apps/api/src/quotes/totals.ts`

All internal monetary calculations use cents.

For a line item, the server rounds the extended amount to cents:

```ts
Math.round(quantity * unitPriceCents)
```

Then it calculates section markup, quote subtotal, discount, taxable amount, tax, and final total.

The presentation function also converts cents back to dollar numbers for the API response and adds computed fields such as `lineTotal` and `section.totals`.

Keeping calculation in a pure function makes it easy to unit test later and prevents persistence code from becoming mixed with money rules.

## 8. Controller

`apps/api/src/quotes/quotes.controller.ts`

All quote endpoints use `@UseGuards(TenantGuard)`:

- `POST /quotes`
- `GET /quotes`
- `GET /quotes/:id`
- `PATCH /quotes/:id`

The controller is intentionally thin. It gets tenant context and delegates business rules to the service.

## 9. React API client

`apps/web/src/api.ts`

All calls go through `apiFetch()`, which always sends the selected `X-User-Id`.

`updateQuote()` deliberately sends only writable fields instead of posting the entire response object, so computed fields like `lineTotal` and `totals` never become client-controlled inputs.

## 10. Instant running totals

`apps/web/src/totals.ts`

This mirrors the server formula in a small pure function. `App.tsx` wraps it with `useMemo()`:

```ts
const previewTotals = useMemo(
  () => (quote ? calculatePreview(quote) : null),
  [quote],
);
```

Each input updates React state immediately, so totals rerender during typing without a network round-trip.

This client calculation is only a preview. `save()` sends the editable data to the API, and then this line replaces local state with the server-calculated response:

```ts
setQuote(saved);
```

That is how the UI can be responsive without making the browser the source of truth for money.

## 11. Add/edit/remove line items

In `App.tsx`:

- `updateLineItem()` immutably patches one line;
- `addLineItem()` adds a new line with no ID;
- `removeLineItem()` removes it from the local array;
- `save()` sends the resulting section arrays to `PATCH /quotes/:id`.

The server interprets no ID as new and omission of an old ID as deletion.

## 12. Tests

`apps/api/test/app.e2e-spec.ts`

The e2e suite starts the actual Nest module and checks:

1. Alice sees only Acme's quote.
2. Alice receives 404 reading Beta's quote.
3. Alice receives 404 modifying Beta's quote, and Bob verifies the quote stayed unchanged.
4. The seed worked example totals $297.
5. A client cannot provide `organizationId` during quote creation.

For a live interview, tenant-isolation tests are the first tests I would show because the prompt explicitly says that is the hardest-tested requirement.

## 13. How to run and demo it

From the repository root:

```bash
npm install
npm run dev
```

Open http://localhost:5173.

Suggested demo:

1. Start as Alice and show the Acme quote.
2. Edit quantity or price and point out that totals change before saving.
3. Add a line item, save, and show the server-confirmed message.
4. Switch to Amy and show she sees the same Acme quote because she shares the organization.
5. Switch to Bob and show only the Beta quote.
6. Run `npm run test:e2e` and explain the cross-tenant 404 tests.

## 14. Good live-extension discussion points

If asked to extend the system, the clean seams are:

- persistence: replace `StoreService` with a SQLite repository;
- authentication: replace the header-based guard with a verified identity/JWT but keep tenant context;
- accounting sync: add a sync service + persisted idempotency record;
- concurrency: add a quote version and reject stale updates;
- taxes/discounts: extend `presentQuote()` or split calculation into a dedicated pricing service.

The structure is intentionally small enough that these extensions do not require rewriting the whole app.
