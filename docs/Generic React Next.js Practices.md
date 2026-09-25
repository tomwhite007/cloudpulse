# Generic React Next.js Practices

This is a **human study note**, not a Cursor or agent rule. Agents do not load this file.

CloudPulse-specific rules live in [`.cursor/rules/react-nextjs-style.mdc`](../.cursor/rules/react-nextjs-style.mdc). The write-up of why this cookbook left the harness is [Harness Cleanup Report.md](./Harness%20Cleanup%20Report.md).

Where CloudPulse deliberately differs, a one-line **CloudPulse:** note follows the generic advice.

---

## RSC vs client

Server Components are the default. Put `'use client'` on the first module a Server Component imports that needs the browser (event handlers, browser APIs, local UI state, Query, Zustand). Descendants of that island do not repeat the directive. Never put `'use client'` on `page.tsx` or `layout.tsx`.

One client island per interactive screen is enough. Do not treat every card as its own boundary. If a later Server Component imports a leaf directly, add `'use client'` on that new boundary.

```tsx
// Avoid — client wrapper on a route
'use client';
export default function Page() {
  return <Dashboard />;
}

// Prefer — server route, feature client island
import { Dashboard } from '@/features/dashboard';

export default function Page() {
  return <Dashboard />;
}
```

Mark Server Actions, DB clients, and other server-only utilities with `import 'server-only'`.

**CloudPulse:** the island is `features/dashboard/components/dashboard.tsx` plus QueryProvider and `error.tsx`. There is no portal DB layer and no `server-only` package in use.

---

## QueryClient and RSC prefetch

Create one `QueryClient` in a client `QueryProvider` mounted from the server `layout.tsx`. Use TanStack’s browser-singleton pattern so the client instance is stable across Suspense boundaries while each server request gets a fresh client:

```ts
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
```

Do not export a module-level `new QueryClient()` shared across users/requests.

RSC prefetch via `dehydrate` and `<HydrationBoundary>` is valid for initial page loads. Do not fetch the same resource in an RSC and again in Query as two sources of truth.

Typical client defaults: `staleTime` of 5 minutes, `refetchOnWindowFocus: false`, `refetchInterval: false` unless the feature is live-polling.

**CloudPulse:** QueryProvider uses `useState(createQueryClient)`. Auditor-api data is client-fetched only; no HydrationBoundary.

---

## Server Actions and forms

Next-owned mutations belong in `features/<feature>/actions/` with `'use server'`. Parse input (Zod), check auth, and return a typed error — treat the action as a public endpoint.

- Prefer **next-safe-action** as the only wrapper once a Next-owned form exists. Do not invent a second helper.
- Submit Next-owned forms through Server Actions.
- Native `useActionState` (React 19) is enough for simple confirmations and small forms.
- Restrict React Hook Form + `@hookform/resolvers/zod` to complex multi-input wizards that need client-side validation. Do not add those libraries until such a form exists.
- Prefer `useOptimistic` for Server Action pending UI. Do not use it as a second cache of HTTP data (that stays Query).

**CloudPulse:** chat and draft-PR are Route Handlers (`app/api/...`), not Server Actions. Draft-PR uses Zod + `fetch` + sonner. No next-safe-action, RHF, or `useOptimistic`.

---

## URL state

When a filter must be shareable across routes or by link, keep it in the URL. Prefer **nuqs** as the only API for that URL state. Do not mix ad-hoc `useSearchParams` / stringly-typed query parsing. Do not install nuqs until a filter needs a URL.

**CloudPulse:** dashboard filters and queued PR ids live in feature Zustand, not the URL.

---

## Next 16 Cache Components

For Next-owned cached data use `'use cache'`, `cacheLife`, `cacheTag`, and `updateTag` for read-your-writes in a Server Action.

Do not add `export const dynamic`, `export const revalidate`, or `export const fetchCache` on routes. Do not use Pages Router data APIs (`getServerSideProps`, `getStaticProps`, `_app`).

**CloudPulse:** auditor-api data stays TanStack Query. Cache Components are unused.

---

## ORM adapters and serialisation

Do not pass raw database entities (Prisma, Drizzle rows) across the RSC-to-client boundary. Reshape ORM/HTTP internals in `features/<feature>/utils/*.adapters.ts` before client props. Pass only JSON-serialisable fields: no functions, `Date`, `Map`, `Set`, or class instances as props to client components.

Contract DTOs that already are the view-model should not be wrapped in a second adapter.

**CloudPulse:** `@cloudpulse/api-contracts` DTOs are the view-model. There is no portal ORM.

---

## Playwright (Nx)

E2e is its own Nx application, named with an `-e2e` suffix, sibling to the app under `apps/` (for example `apps/web-portal-e2e`, project `web-portal-e2e`). Do not use a repo-root `e2e/` folder or an `e2e-{app}` prefix.

- Locate with `getByRole`, `getByLabel`, `getByText`. Use `getByTestId` only when semantic HTML cannot distinguish the control.
- Run against `next build` + `next start`, not only `next dev`.
- Do not use `page.waitForTimeout()` or `page.waitForLoadState('networkidle')`. Assert on locators.
- Reuse authenticated `storageState` instead of logging in through the UI every suite.

**CloudPulse:** `apps/web-portal-e2e` runs Playwright against production `nx start web-portal` on port 4000 and demo `auditor-api` on port 3000. Unit tests are Vitest.

---

## Navigation, images, and fonts

Use `next/link` for in-app routes, not a raw `<a>`. Use `next/image` for raster images and `next/font` for application fonts. Do not load Google Fonts from a CDN `<link>` in `layout.tsx`. A system font stack is fine until a custom font is introduced.

**CloudPulse:** system fonts; no `next/image` / `next/font` yet.

---

## Accessibility

Target **WCAG 2.1 Level AA**. Semantic HTML (`button`, `label`, `nav`, headings in order) rather than clickable `div`s. Associate every form control with a visible `<label>` (or `aria-label` when a visible label would be noise). Keep flows keyboard-operable. Do not use `outline-none` without a visible `focus-visible` replacement. Selection/context (for example a resource in Pulse Advisor) is not a focus ring: use inset treatment plus text, and keep offset rings on the actual control. Honour `prefers-reduced-motion` for non-essential animation. Axe WCAG 2.1 AA on composed presenters/pages, not isolated primitive atoms.

---

## TypeScript and XSS

Keep `strict` TypeScript. Do not introduce `any` or `as unknown as` to silence the boundary. Do not use `dangerouslySetInnerHTML` unless the HTML is sanitised and there is no alternative. Default to text (for example `react-markdown`).

**CloudPulse:** the Nx `index.d.ts` SVG shim is the allowed `any` exception. Advisor markdown uses `react-markdown`, not `dangerouslySetInnerHTML`.

---

## Query, Zustand, and Vitest (still true in general)

These patterns remain good generic advice. CloudPulse already follows the subset below.

- One HTTP cache library (TanStack Query). Do not add SWR or RTK Query beside it. Put Query hooks in `features/<feature>/hooks/`. Extract pure fetch/parse helpers to `utils/` and test them. Put every input that changes the result in `queryKey`; prefer a key factory. Parse payloads with Zod. Do not fetch in `useEffect`. Do not copy Query data into `useState` or Zustand.
- Zustand for shared client UI chrome (drawers, filters, queued ids), not for server data. Feature-scoped stores; no app-root `store/` folder.
- Vitest: colocate `features/<feature>/tests/*.test.ts(x)`. Test presenters by visible behaviour, not internal state. Query with `getByRole` / `getByLabelText`. Prefer dependency injection over `vi.mock()`. Do not render RSCs in Vitest.

**CloudPulse:** Query defaults and `useState(createQueryClient)` as above. Zustand is dashboard chrome only.
