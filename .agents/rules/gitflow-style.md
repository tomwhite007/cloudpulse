---
description: GitFlow demo gate, mocks barrel, and HCL tombstones
globs: libs/gitflow/**/*.ts,apps/web-portal/app/api/remediation/**/*.ts
alwaysApply: false
---

<!-- Mirror of .cursor/rules/gitflow-style.mdc -->

# gitflow

- Never call `createGitHubRemediationPr` when `isGitFlowDemoMode` is true: `DEMO_MODE`, missing `GITHUB_TOKEN`, or no evaluator session. Return `@cloudpulse/gitflow/mocks` (`MOCK_DRAFT_PR`) instead.
- Live barrel (`@cloudpulse/gitflow`) exports real functions and schemas only. Mocks stay on `@cloudpulse/gitflow/mocks`. See mock-data-style.
- Terraform patches tombstone HCL (`# TOMBSTONED by CloudPulse`); do not delete resources. Default path: `apps/infra/environments/sandbox/storage.tf`.
- Octokit only on the live path. Do not rename `DEMO_MODE` / `SIMULATED`|`LIVE`.
- Tests: Vitest.
