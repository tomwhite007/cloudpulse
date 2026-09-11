---
description: NestJS architecture and best practices for auditor-api
globs: apps/auditor-api/**/*.ts
alwaysApply: false
---

# NestJS Backend Standards (`auditor-api`)

Paths below are relative to `apps/auditor-api/`. This is a NestJS application.

## 1. Architecture
- **Layered Architecture**: Enforce a strict layered architecture (Controller -> Service -> Repository).
- **Controllers**: Avoid business logic in controllers. Controllers should only handle routing, extracting parameters/bodies, calling services, and returning responses.
- **Mock services**: Fake implementations live in `src/mocks/*.mock.ts` and are wired only from module `useFactory`. See mock-data-style.

## 2. Data Transfer Objects (DTOs)
- **Shared Contracts**: Enforce the use of `@cloudpulse/api-contracts` for request/response payloads. Controllers MUST type their bodies and responses using these shared contracts to maintain a single source of truth across the monorepo.

## 3. Validation
- **Global Validation**: Mandate `class-validator` and `class-transformer` (or a global Zod validation pipe if configured) for incoming request payloads.
- **Strict Validation**: Ensure `whitelist: true` is used to strip unexpected properties from request bodies.

## 4. Dependency Injection
- **Modules**: Services and providers MUST be properly scoped using NestJS Modules. Group related controllers and services into feature modules.
- **Avoid Circular Dependencies**: Design modules and services to avoid circular dependencies. Use forwardRef only as a last resort.

## 5. Error Handling
- **Global Filters**: Standardize on a global Exception Filter to format error responses consistently across the API.
- **HTTP Exceptions**: Use standard NestJS `HttpException` subclasses (e.g., `NotFoundException`, `BadRequestException`) in services and controllers.

## 6. Database / ORM
- **Transactions**: Keep database transaction logic within services, not controllers.
- **Queries**: Isolate complex database queries to Repository classes or specific data-access services.

## 7. Agent Workflows & MCPs
- **Nx Integration**: When instructed to generate new NestJS modules, controllers, and services, AI agents MUST prioritize using the configured `nx` MCP server (e.g., running `nx g @nx/nest:module`) rather than manually creating files.
- **Context Generation**: When utilizing or implementing unfamiliar libraries, agents should leverage the `context7` MCP server to query up-to-date documentation.
