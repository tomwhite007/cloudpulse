---
description: Next.js App Router + React architecture for web-portal
globs: apps/web-portal/**/*.{ts,tsx},apps/web-portal-e2e/**/*.{ts,tsx}
alwaysApply: false
---

# Next.js App Router standards (web-portal)

Paths below are relative to `apps/web-portal/` (no `src/` prefix). Shared HTTP/DTO types come from `@cloudpulse/api-contracts`. Playwright is a sibling Nx app at `apps/web-portal-e2e` (`{app}-e2e` suffix, not `e2e-{app}`).

Prefer App Router server-first patterns over client-side SPA patterns.

MUST is React / Next.js. PREFER is the CloudPulse enterprise default: one library, every time. Do not add a second pattern.

## Hard constraints

- Server Components by default. `'use client'` only on interactive leaves.
- Do not put `'use client'` on `page.tsx` or `layout.tsx`.
- `app/` is routing only. Domain logic lives in `features/<name>/` from the first feature.
- Do not put a workspace-root `store/` or `hooks/` folder. Feature-scoped Zustand and Query hooks live inside that feature.
- Contract DTOs from `@cloudpulse/api-contracts` are the view-model for auditor-api screens. Adapters are for ORM/HTTP internals, not for re-wrapping those DTOs.

## Directory layout

```text
apps/web-portal/
├── app/                          # routing only
│   ├── page.tsx                  # thin entry: render the feature screen
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── global.css
├── components/ui/                # design-system primitives (shadcn)
├── components/providers/         # QueryProvider and other client providers
├── lib/                          # shared infrastructure (cn, env)
└── features/
    └── dashboard/
        ├── index.ts              # public surface only (Dashboard)
        ├── components/           # presenters and the client island
        ├── hooks/                # TanStack Query hooks for auditor-api
        ├── store/                # Zustand (dashboard chrome only)
        ├── utils/                # pure domain logic
        └── tests/                # isolated unit tests
```

## 1. Domain architecture

Organize by domain feature, not by framework artifact type.

- MUST keep `app/` thin: read search/route params, render a feature screen, pass minimal props.
- MUST NOT put business logic, queries, or large component trees in `app/` routes.
- MUST import shared UI from `components/ui/` and infra from `lib/` only.
- MUST NOT import another feature's private files. Cross-feature use goes through that feature's `index.ts`.
- MUST enforce boundary rules and prevent internal deep-imports using `@nx/enforce-module-boundaries` or ESLint path rules.
- MUST colocate a feature's presenters, Query hooks, and Zustand store under `features/<name>/`. MUST NOT add root `store/` or `hooks/` folders.

## 2. RSC vs client

RSCs are route containers. A feature screen may be a client island under that server page.

- MUST default to Server Components.
- MUST use RSCs for DB/ORM, auth, headers, and cookies.
- MUST add `'use client'` for event handlers, browser APIs, local UI state, Query hooks, or Zustand.
- MUST NOT put `'use client'` on `page.tsx` or `layout.tsx`. Isolate interactivity in a child (the feature screen is allowed to be that child).
- MUST NOT treat "leaf presenter" as "every card is its own client boundary". One client island per interactive screen is allowed.
- MUST add `import 'server-only'` at the top of Server Actions, `lib/` DB clients, and other server-only utilities.

```tsx
// BAD — client wrapper on a route
'use client';
export default function Page() {
  return <Dashboard />;
}

// GOOD — server route, feature client island
import { Dashboard } from '@/features/dashboard';

export default function Page() {
  return <Dashboard />;
}
```

Auditor-api data is Query-only. MUST NOT fetch the same auditor-api resource in an RSC and again in Query. Ad-hoc duplicate fetches are forbidden, but RSC prefetching via TanStack Query's `dehydrate` and `<HydrationBoundary>` for initial page loads is permitted.

## 3. Serialization and adapters

- MUST NOT pass raw database entities (Prisma, Drizzle rows) across the RSC-to-client boundary.
- MUST reshape ORM/HTTP internals in `features/<feature>/utils/*.adapters.ts` before client props.
- Contract DTOs (`CostAuditSummaryDto`, `ResourceStatusCardDto`, …) **are** the view-model. MUST NOT add an adapter that only re-wraps `@cloudpulse/api-contracts` types.
- MUST pass only JSON-serializable fields the client needs. MUST NOT pass functions, `Date`, `Map`, `Set`, or class instances as props to client components.

```ts
// BAD
<InvoiceRow invoice={prismaInvoice} />

// GOOD — ORM row reshaped
<InvoiceRow view={toInvoiceRowView(prismaInvoice)} />

// GOOD — auditor-api contract DTO is already the view-model
<KpiGrid summary={summary} />
```

## 4. Files and exports

- MUST put one exported component per file.
- Non-exported, file-local helper functions and micro-components are allowed if they are private to that file and not reused. Require extraction to `features/<feature>/utils/` only when reused or when business logic requires dedicated unit testing.
- MUST use named function exports for domain components, actions, and utilities: `export function FeatureCard() {}`.
- MUST use `export default` only for App Router files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`.
- MUST colocate extra component types in `<component-name>.types.ts`; feature-wide types in `features/<feature>/utils/` or `types/`.
- MUST style with Tailwind or a colocated `<component-name>.module.css`.
- MUST NOT add unscoped global CSS outside `app/global.css`.

## 5. State

- MUST treat Next-owned data as RSC + Suspense + Server Action revalidation (`revalidatePath`, `revalidateTag`).
- PREFER TanStack Query as the only client cache for auditor-api (and other HTTP) data. Do not add SWR, RTK Query, or a second fetch library.
- MUST NOT copy server or Query data into `useState`, `useEffect`, or Zustand.
- Dashboard chrome (mode, resource type, status filter, queued ids) lives in the **feature** Zustand store. That store is not app-global.
- MUST keep state in the URL when a filter must be shareable across routes or by link. PREFER nuqs as the only API for that URL state. Do not mix ad-hoc `useSearchParams` / stringly-typed query parsing. Do not install nuqs until a filter needs a URL.
- PREFER Zustand as the only store for shared client UI (drawers, wizards, disconnected leaves, mode toggles). Do not add React Context stores or extra state libraries. Stores stay client-only; do not put server data in them.

## 6. TanStack Query

Client cache for auditor-api. The Next server does not store this data; Query holds the browser cache; Nest remains the source of truth.

- MUST create one `QueryClient` inside a client `QueryProvider` mounted from the server `layout.tsx` using TanStack's browser-singleton pattern (`getQueryClient()` checking `typeof window === 'undefined'`), ensuring a stable client instance across client Suspense boundaries while isolating per-request instances on the server. QueryProvider stays in `components/providers/`.
- MUST keep Query hooks in `features/<feature>/hooks/`. One file per resource may contain that resource's `useQuery` and `useMutation` together (e.g. `useAuditSummary` + `useRemediateResource` in `use-audit-data.ts`).
- MUST extract pure fetch, parse, and fallback helpers to `features/<feature>/utils/` and test them.
- MUST put every input that changes the result in `queryKey` (including audit mode). PREFER a key factory so invalidation uses the same tuples.
- MUST parse query and mutation payloads with Zod contract schemas (`CostAuditSummarySchema`, etc.).
- MUST run auditor-api writes through `useMutation` and `invalidateQueries` on success. MUST NOT also `setQueryData` with unparsed JSON, and MUST NOT stash the same payload in Zustand.
- MUST NOT fetch auditor-api data in `useEffect`, and MUST NOT fetch the same resource in an RSC and again in Query (no double source of truth). RSC prefetching via `dehydrate` and `<HydrationBoundary>` is permitted.
- PREFER these client defaults: `staleTime` of 5 minutes, `refetchOnWindowFocus: false`, `refetchInterval: false` unless the feature is explicitly live-polling.

```ts
// BAD — module singleton shared across users/requests
export const queryClient = new QueryClient();

// GOOD — browser-singleton pattern
// lib/query-client.ts or inside QueryProvider
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// Inside QueryProvider:
const queryClient = getQueryClient();
```

## 7. Validation and mutations

- MUST validate route params, search params, API bodies, and Server Action payloads with Zod.
- MUST infer types from schemas (`z.infer<>`).
- MUST put Next-owned mutations in `features/<feature>/actions/` with `'use server'`. Parse input, check auth, and return a typed error inside the action — treat it as a public endpoint.
- PREFER next-safe-action as the only wrapper around those actions. Do not invent a second action helper. Do not add the library until a Next-owned form exists.
- MUST submit Next-owned forms through Server Actions.
- PERMIT native `useActionState` (React 19) for simple mutations, confirmations, and minimal forms.
- RESTRICT React Hook Form + `@hookform/resolvers/zod` to complex, multi-input forms or wizards requiring client-side validation logic. Do not add the libraries until such a form exists.
- MUST send auditor-api mutations through TanStack `useMutation` (section 6), not a parallel Server Action.

```ts
export const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

## 8. Vitest

- MUST colocate unit/integration tests in `features/<feature>/tests/` as `*.test.ts` or `*.test.tsx`. Page-level RTL may stay under `specs/`.
- MUST export every util, adapter, and calculation in `features/<feature>/utils/` and give each an isolated unit test (no DOM). Target ≥95% coverage on `utils/`.
- MUST test client presenters by behavior (visible output on click), not internal state.
- MUST query with `getByRole` / `getByLabelText`, not test IDs or CSS classes.
- MUST NOT render RSCs in Vitest. Unit-test queries as async functions against a mocked data layer; pass mock view-models into client presenters.
- MUST prefer dependency injection over `vi.mock()`.

## 9. Playwright

Nx convention: e2e is its own application, named with an `-e2e` suffix, sibling to the app under `apps/`.

- MUST put journeys in `apps/web-portal-e2e/` (project name `web-portal-e2e`). Example: `apps/web-portal-e2e/src/auth.spec.ts`.
- MUST run with `nx e2e web-portal-e2e`.
- MUST NOT use a repo-root `e2e/` folder or an `e2e-web-portal` prefix.
- MUST locate with `getByRole`, `getByLabel`, `getByText`. Use `getByTestId` only when semantic HTML cannot distinguish the control.
- MUST run against `next build` + `next start` (not only `next dev`).
- MUST NOT use `page.waitForTimeout()` or `page.waitForLoadState('networkidle')`. Rely purely on locator-driven assertions (e.g., `expect(locator).toBeVisible()`).
- MUST reuse authenticated `storageState` instead of logging in through the UI every suite.

## 10. Route error, loading, and streaming

- MUST add App Router `loading.tsx`, `error.tsx`, and `not-found.tsx` beside the routes that need them. `error.tsx` is a client component.
- MUST wrap slow **RSC** subtrees in `<Suspense>` so one slow query does not block the whole page. When prefetching auditor-api data on the server via `HydrationBoundary`, streaming via RSC `<Suspense>` around the feature screen is permitted; purely client-fetched auditor-api queries rely on client skeletons / `isPending` / `isFetching`.
- MUST set document metadata in `layout.tsx` / `page.tsx` (`metadata` or `generateMetadata`). MUST NOT set `document.title` from client effects.
- PREFER `useOptimistic` for Next-owned Server Action pending UI. MUST NOT use it as a second cache of auditor-api data (that stays TanStack Query + Zustand queued ids).

## 11. Caching (Next 16)

- MUST use Cache Components APIs for Next-owned cached data: `'use cache'`, `cacheLife`, `cacheTag`, and `updateTag` for read-your-writes in a Server Action.
- MUST NOT use Cache Components for auditor-api data (that stays TanStack Query).
- MUST NOT add `export const dynamic`, `export const revalidate`, or `export const fetchCache` on routes.
- MUST NOT use Pages Router data APIs (`getServerSideProps`, `getStaticProps`, `_app`).

## 12. Environment and secrets

- MUST keep secrets in server-only env vars. MUST NOT prefix secrets with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_` is allowed for **public** API bases (browser-visible auditor-api URL).
- PREFER a single Zod-validated env module in `lib/env.ts` (fail at boot). Do not read `process.env` ad hoc inside components or hooks.

## 13. Navigation, images, and fonts

- MUST use `next/link` for internal navigation. MUST NOT use a raw `<a>` for in-app routes.
- MUST use `next/image` for raster images and `next/font` for application fonts. MUST NOT load Google Fonts from a CDN `<link>` in `layout.tsx`.
- System font stack is allowed until a custom font is introduced.

## 14. Accessibility

- MUST use semantic HTML (`button`, `label`, `nav`, headings in order) rather than clickable `div`s.
- MUST associate every form control with a visible `<label>` (or `aria-label` when a visible label would be noise).
- MUST keep flows keyboard-operable. MUST NOT use `outline-none` without a visible `focus-visible` replacement.
- MUST honour `prefers-reduced-motion` for non-essential animation.

## 15. TypeScript and XSS

- MUST keep `strict` TypeScript. MUST NOT introduce `any` or `as unknown as` to silence the boundary.
- Nx `index.d.ts` SVG `any` shim is allowed.
- MUST NOT use `dangerouslySetInnerHTML` unless the HTML is sanitised and there is no alternative. Default to text.
