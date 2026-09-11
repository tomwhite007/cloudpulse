# Harness Cleanup Report

This is a human record of an Architecture-Driven Development (ADD) pass on CloudPulse’s agent rules. It is **not** loaded by Cursor or other agents.

See also:

- [Architecture Driven Development.md](./Architecture%20Driven%20Development.md) — the methodology
- [Generic React Next.js Practices.md](./Generic%20React%20Next.js%20Practices.md) — generic Next/React cookbook archived out of the portal agent rule
- Live agent rules: `.cursor/rules/*.mdc` (canonical) and `.agents/rules/*.md` (mirrors)

## Why

ADD says generic AI templates scale drift. Local architecture opinions belong in the repo harness. When a diff is wrong in our voice, patch the **rule** as well as the code.

Two failures in the old harness:

1. **Generic noise.** The portal rule was a ~250-line Next enterprise cookbook (Playwright / `web-portal-e2e`, Server Actions, nuqs, React Hook Form, Cache Components, Prisma adapters, QueryClient browser-singleton). None of that exists in this repo. That is the ADD “Storybook on a utility lib” problem: tokens spent on architecture we do not have.
2. **Wrong local voice.** The Nest rule mandated `class-validator`, repositories, and a global exception filter. auditor-api is Zod contracts + `ICloudAuditorService` + AWS SDK / `MockCloudAuditorService` switched by `USE_LIVE_AWS`. Agents following the old Nest rule would invent a stack we do not use.

## Token audit

| File | Action |
|------|--------|
| `mock-data-style` | **Keep.** Local, already earned. Added a pointer to skip live I/O using product flags. |
| `scratch_files` | **Keep.** `alwaysApply: true`; dropped `globs: *`. |
| `api-contracts-style` | **Slim.** Zod + `z.infer` + tsconfig mocks path. Dropped the unimplemented `package.json` exports split. |
| `nestjs-backend-style` | **Rewrite.** Zod, `USE_LIVE_AWS`, AWS SDK services, MCP SSE, Jest. No class-validator / Repository / ORM / exception-filter mandate. |
| `react-nextjs-style` | **Rewrite.** ~50 lines of the actual portal island. Dropped the unused cookbook and `web-portal-e2e` globs. |
| Nx MCP / Context7 prose in Nest + React | **Delete.** Global harness; already in `.cursor/mcp.json`. |
| `gitflow-style` | **Add.** Demo never opens GitHub PRs; HCL tombstones; live vs `/mocks` barrels. |

No `AGENTS.md` (that would be a third copy). No Prettier rule (`.prettierrc.json` is the convention).

## What the live rules now encode

- **Portal:** thin `app/`, one client island (`dashboard.tsx` + QueryProvider + `error.tsx`), feature-scoped Query + Zustand, PulseAdvisor shell, Route Handlers for chat/draft-PR, `isPulseAdvisorDemoMode`.
- **auditor-api:** thin controller, contract DTOs, `USE_LIVE_AWS` factory, AWS SDK in services, Zod `safeParse`, MCP under `src/mcp/`, Jest `*.spec.ts`.
- **Contracts:** zero framework deps; live barrel vs `@cloudpulse/api-contracts/mocks`.
- **Gitflow:** `isGitFlowDemoMode` must not call `createGitHubRemediationPr`; tombstone HCL; Octokit on the live path only.

Skipped for now: a dedicated infra style file (`terraform fmt` is already the Nx lint target).

## Sync

`.cursor/rules/*.mdc` is canonical. `.agents/rules/*.md` is the same body plus `<!-- Mirror of .cursor/rules/<name>.mdc -->`. When a review finds a new local opinion, update **both** copies in the same change.
