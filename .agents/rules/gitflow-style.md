---
description: GitFlow demo gate, mocks barrel, and HCL tombstones
globs: libs/gitflow/**/*.ts,apps/web-portal/app/api/remediation/**/*.ts
alwaysApply: false
---

<!-- Mirror of .cursor/rules/gitflow-style.mdc -->

# gitflow

- Never call `createGitHubRemediationPr` when `isGitFlowDemoMode` is true (`DEMO_MODE`, missing `GITHUB_TOKEN`, or no evaluator session). Return `@cloudpulse/gitflow/mocks` (`MOCK_DRAFT_PR`) instead.
- Live barrel (`@cloudpulse/gitflow`) exports real functions and schemas only. Mocks stay on `@cloudpulse/gitflow/mocks`. See `mock-data-style`.
- **PR Consolidation**: Remediation requests check for open `finops/` branches and append commits to consolidate multiple cards into a single active PR (with retry backoff for SHA concurrency).
- **Remediation Execution**:
  - Managed resources in `storage.tf`: Comment out matching `resource` blocks (`# TOMBSTONED by CloudPulse`).
  - Unmanaged resources (`vol-*`, `eipalloc-*`): Generate apply-time `terraform_data` provisioners executing `aws ec2 delete-volume` / `aws ec2 release-address`.
  - Auto-pruning: Live audit data is queried during PR creation to automatically prune completed `terraform_data` records once AWS confirms resource absence.
- Default terraform path: `apps/infra/environments/sandbox/storage.tf`.
- Octokit only on the live path. Do not rename `DEMO_MODE` / `SIMULATED`|`LIVE`.
- Tests: Vitest.
