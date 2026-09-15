---
description: Shared mock data layout, naming, and import paths
globs: '**/mocks/**/*.ts,**/*.mock.ts,apps/auditor-api/src/**/*.module.ts,apps/web-portal/app/api/**/*.ts'
alwaysApply: false
---

<!-- Mirror of .cursor/rules/mock-data-style.mdc -->

# Mock data convention

CloudPulse mocks are **runtime demo doubles** and shared canned datasets, not Jest automocks. Put them in a dedicated `mocks/` folder with a `*.mock.ts` suffix. Do **not** use `__mocks__/` (Jest/Vitest module substitution) or `__fixtures__/` for this data.

## Unified Telemetry API & Forwarding Rules

- `web-portal` (Next.js) MUST NOT bypass or silently fallback mock data for `auditor-api`.
- All telemetry requests (both Demo and Live modes) MUST go over HTTP to `auditor-api`. The Next.js BFF proxy forwards all audit requests, passing `x-cloudpulse-mode: live` (unlocked evaluator session) or `x-cloudpulse-mode: demo` (unauthenticated).
- NestJS `auditor-api` is the single source of truth for both mock/demo telemetry and live AWS telemetry.
- API network or timeout failures in both Demo and Live modes MUST propagate to the client and result in visible UI error states (`AuditLoadError`), never silent local mock fallbacks.

## Layout and naming

- Folder: `mocks/` next to the real `lib/` / `utils/` / `app/` code (for example `libs/api-contracts/src/mocks/`, `features/dashboard/mocks/`, `apps/auditor-api/src/mocks/`).
- File: `<domain>.mock.ts` (for example `audit.mock.ts`, `draft-pr.mock.ts`).
- Constants: `MOCK_` + SCREAMING_SNAKE (`MOCK_COST_AUDIT_SUMMARY`).
- Factories: `createMock` + PascalCase noun (`createMockCostAuditSummary()`).
- Classes: `Mock` prefix (`MockCloudAuditorService`).

## Imports

- Live barrels (`@cloudpulse/api-contracts`, `@cloudpulse/gitflow`) export contracts and real functions only. They MUST NOT re-export `MOCK_*` or fake implementations.
- Import mocks from a dedicated path (`@cloudpulse/api-contracts/mocks`, `@cloudpulse/gitflow/mocks`, or a relative `../mocks/...` file).
- Composition roots (Nest `useFactory`, Next `route.ts`) MAY import mocks and return them. They MUST NOT define mock datasets, factories, path switches, or response builders in the live file.
- Domain files MUST NOT declare mock datasets inline.

## Product flags

Do **not** rename mode switches or API enums: `DEMO_MODE`, `AuditStatusDto.mode` (`SIMULATED` / `LIVE`). Those are flags, not datasets. Portal demo vs live is the evaluator session. Skip live I/O in composition roots using those flags (see react-nextjs-style, nestjs-backend-style, gitflow-style).

Leave one-off objects that exist only inside a single spec in that spec unless they are reused.
