---
description: Rules for the shared API contracts library
globs: libs/api-contracts/**/*.ts
alwaysApply: false
---

# API Contracts Standards

Paths below are relative to `libs/api-contracts/`. This library provides the shared types and validation schemas for the entire monorepo.

## 1. Zero Dependencies

- This library MUST NOT import framework-specific code (e.g., no `@nestjs/common`, no `next/server`, no `react`). It must remain pure TypeScript.

## 2. Zod as Source of Truth

- Define runtime validation schemas using `zod`.
- Infer TypeScript types from these schemas (`z.infer<typeof schema>`). Both the Next.js frontend and NestJS backend rely on these definitions.

## 3. Mock Data Generation

- Fixtures live in `src/mocks/*.mock.ts` and export from `@cloudpulse/api-contracts/mocks`. See mock-data-style.

## 4. Exports & Barrel Files

- Avoid a single monolithic `index.ts` barrel file that bundles mocks, schemas, and types together, as this can bloat builds.
- Instead, use multiple specific entry points (e.g., configured in `package.json` `exports`):
  - An entry point for pure interfaces/types (which compile to nothing and vaporize correctly in TypeScript).
  - An entry point for runtime validation schemas (Zod).
  - A separate entry point for testing mocks (`@cloudpulse/api-contracts/mocks`) so testing utilities don't leak into production bundles.
