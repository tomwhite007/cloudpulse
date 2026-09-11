---
description: Shared API contracts library (Zod + mocks path)
globs: libs/api-contracts/**/*.ts
alwaysApply: false
---

<!-- Mirror of .cursor/rules/api-contracts-style.mdc -->

# API contracts

- Zero framework imports (no Nest, Next, or React). Zod is the source of truth; export `z.infer` DTO types next to schemas in the live barrel.
- Live entry is the tsconfig path `@cloudpulse/api-contracts` (`src/index.ts`). Mocks are `@cloudpulse/api-contracts/mocks`. The live barrel MUST NOT re-export mocks. See mock-data-style.
- Tests: Vitest.
