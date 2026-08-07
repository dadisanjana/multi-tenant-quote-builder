# Multi-Tenant Quote Builder

A small TypeScript quoting service built for the take-home exercise. It uses a NestJS API, React/Vite UI, and in-memory persistence.

## What I prioritized

The assignment says tenant isolation is the requirement tested hardest, so I treated tenant scoping as the first design constraint rather than adding it later. Every quote read/update requires both the quote ID and the authenticated user's organization ID. I also prioritized server-side monetary calculations, an editable React quote page with instant local totals, two-tenant seed data, and e2e tests.

I intentionally did **not** build the optional accounting sync. Under the stated three-hour cap, I would rather submit the required behavior with isolation tests and code I can explain than add an optional integration with less validation.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

That one `npm run dev` command starts both apps after dependencies are installed:

- React UI: http://localhost:5173
- NestJS API: http://localhost:3001

The UI starts as `user-alice`. Use the user selector to switch between tenants.

### Useful commands

```bash
npm run build
npm test
npm run test:e2e
```

## Seed users and quotes

| User ID | Organization | Visible seeded quote |
| --- | --- | --- |
| `user-alice` | Acme Contractors | `quote-acme-1` |
| `user-amy` | Acme Contractors | `quote-acme-1` |
| `user-bob` | Beta Builders | `quote-beta-1` |

Authentication is intentionally out of scope. The API trusts the `X-User-Id` header exactly as the prompt requests.

Example:

```bash
curl -H 'X-User-Id: user-alice' http://localhost:3001/quotes
```

Trying to read Bob's quote as Alice returns 404:

```bash
curl -i -H 'X-User-Id: user-alice' http://localhost:3001/quotes/quote-beta-1
```

## API

### `POST /quotes`

Creates a quote inside the caller's organization. `organizationId` is not accepted from the request body.

```json
{
  "customerName": "Morgan Customer",
  "status": "draft",
  "taxRate": 8.25,
  "discount": { "type": "percentage", "value": 5 },
  "sections": [
    {
      "name": "Labor",
      "markupPercent": 10,
      "lineItems": [
        { "description": "Install", "quantity": 2, "unitPrice": 100 }
      ]
    }
  ]
}
```

### `GET /quotes`

Lists quote summaries for the caller's organization only.

### `GET /quotes/:id`

Returns one tenant-scoped quote with sections, line items, line totals, section totals, and quote totals.

### `PATCH /quotes/:id`

Updates scalar quote fields and/or the nested sections array. When `sections` is supplied, it is treated as the desired nested state:

- an existing line item with its `id` is edited;
- a line item without an `id` is added;
- an existing line item omitted from the array is removed.

Unknown section/line IDs are rejected instead of silently accepting nested IDs from somewhere else.

## Tenant-isolation approach

1. `TenantGuard` requires `X-User-Id` and resolves the user to an organization.
2. The controller passes only `organizationId` from that trusted server-side context to the quote service.
3. The service never loads a quote by ID alone. It calls `findQuoteByIdAndOrganization(quoteId, organizationId)`.
4. Cross-tenant reads and writes return 404. This avoids confirming whether an ID belongs to another tenant.
5. Create requests derive `organizationId` from the caller; the DTO rejects a client-supplied `organizationId`.

This is intentionally redundant at the important boundary: the caller cannot select an organization, and quote access is scoped at lookup time.

## Money and totals

Money is stored internally as integer cents. API input/output uses normal dollar numbers for readability.

For each line item:

```text
line total cents = round(quantity × unit price cents)
```

For each section:

```text
base subtotal = sum(line totals)
markup amount = round(base subtotal × markup %)
section subtotal = base subtotal + markup amount
```

For the quote:

```text
quote subtotal = sum(section subtotals)
discount = percentage or fixed amount, capped at subtotal
taxable amount = subtotal - discount
tax = round(taxable amount × tax rate)
total = taxable amount + tax
```

The seeded Acme quote matches the prompt's worked example: $250 before markup, $275 after 10% markup, and $297 after 8% tax.

The React page mirrors these calculations locally only to provide no-lag feedback while typing. On save, the API recalculates the totals and the UI replaces its state with the server response. The backend remains the source of truth.

## Assumptions

- `X-User-Id` is trusted because authentication is explicitly out of scope.
- Unknown users receive 401.
- A tenant trying to access another tenant's quote receives 404, not 403, to avoid resource-existence leakage.
- `quantity` may have up to three decimal places and must be non-negative.
- Unit price and fixed discount use up to two decimal places and must be non-negative.
- Tax rate is a percentage from 0 to 100.
- Section markup must be non-negative. I did not impose an arbitrary upper limit because the prompt does not specify one.
- Percentage discounts are limited to 0–100%.
- Fixed discounts larger than the subtotal are capped at the subtotal so the taxable amount cannot become negative.
- Tax is applied after discount.
- Rounding is to the nearest cent at each line total, section markup, and tax calculation.
- `PATCH /quotes/:id` treats an included `sections` array as replacement state for nested sections/items. This makes add/edit/remove behavior simple and explicit for the React client.
- In-memory persistence resets when the API restarts. The prompt explicitly permits in-memory persistence.
- I used fixed seed IDs to make tenant-isolation testing and review easy.

## What I did not build and why

### Optional accounting sync

Not implemented. It is explicitly optional, and the three-hour cap makes tenant isolation, core CRUD/update behavior, totals, tests, and the UI higher-value work.

### Full production database/authentication

Not implemented because both are outside the intended scope. For a take-home, a database migration layer and identity provider would add setup cost without demonstrating the core modeling/isolation decisions better than this version.

### Create-quote UI

The create endpoint is implemented, but the UI focuses on the required page for viewing/editing one quote. Under the time cap I prioritized depth on the required editing flow over a second form.

## What I would do with two more days

1. Add the idempotent accounting sync using a persisted sync record/idempotency key, retries with bounded backoff, and tests for repeated calls and simulated 500s.
2. Move the store to SQLite with migrations and repository-level tenant predicates.
3. Add optimistic concurrency/versioning to prevent lost updates when two users edit the same quote.
4. Expand tests for create/update validation, fixed/percentage discounts, rounding boundaries, empty sections, and malformed nested IDs.
5. Add frontend component tests and e2e browser coverage for typing, add/remove line items, save, and tenant switching.
6. Improve accessibility and loading/error states, and add dirty-state protection before switching quotes.
7. Add structured logging/request IDs and a consistent API error shape.

## Repository structure

```text
.
├── apps
│   ├── api
│   │   ├── src
│   │   │   ├── common        # X-User-Id -> tenant context
│   │   │   ├── quotes        # DTOs, endpoints, service, totals
│   │   │   └── store         # in-memory models + seed data
│   │   └── test              # tenant-isolation e2e tests
│   └── web
│       └── src
│           ├── App.tsx       # quote editor
│           ├── api.ts        # API client with X-User-Id
│           ├── totals.ts     # instant client preview
│           └── types.ts
├── EXPLANATION.md
└── package.json              # npm workspaces + combined dev command
```
