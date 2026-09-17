# Changelog

All notable changes to the CloudPulse project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-09-17

### Added
- **Environment Promotion & Staging Architecture**: Documented multi-account staging topology, ephemeral preview environments, and release-tag deployment gating in `README.md`.
- **Roadmap Milestones (v1.2.0 & v1.3.0)**: Added upcoming feature targets for Stale Lambdas, Idle RDS instances, S3 Bucket auditing, and Dashboard category filter tabs.
- **Edge Validation**: Added Zod body validation (`RemediationRequestSchema`) to NestJS `AppController.remediateResource` with automatic `BadRequestException` handling on malformed payloads.

### Changed
- **Smart Auto-Scroll UX**: Restricted `PulseAdvisor` panel `scrollIntoView` to mobile viewports (`<1024px`), preventing unwanted page jumps on desktop screens while preserving accessibility focus.
- **Security Hardening**: Sanitized Next.js `/api/chat` 500 error responses to prevent raw server stack trace leakage (`e.stack`).
- **GitFlow Owner Safeguard**: Replaced silent hardcoded owner fallback (`'tomwhite007'`) in `create-remediation-pr.ts` with explicit environment/token validation error handling.
- **Harness Rule Re-sync**: Re-synced `.agents/rules/` and `.cursor/rules/` for NestJS header-based demo routing (`x-cloudpulse-mode`) and single-cloud BFF proxying.
- **Bumped Version**: Updated `package.json` to `1.1.1`.

---

## [1.1.0] - 2026-09-16

### Added
- **Closed-Loop GitFlow Auto-Remediation Engine**:
  - Consolidated PR handling: multi-card approvals append to a single active `finops/` branch.
  - Managed resource tombstoning: comments out matching `resource` blocks in `storage.tf`.
  - Apply-time execution: generates `terraform_data` provisioners (`aws ec2 delete-volume` and `aws ec2 release-address`) for unmanaged AWS resources.
  - Self-cleaning state pruning: queries live audit telemetry during PR generation to automatically remove completed `terraform_data` records upon AWS confirmation.
- **Enterprise VPC & Container Topology**:
  - Single-VPC co-location on AWS ECS Fargate ARM64 Graviton compute.
  - Zero-public-ingress NestJS backend on internal port `3333` with Security Group restriction to Next.js container SG.
  - Encrypted `iron-session` cookie authentication gated by SSM Parameter Store passphrase evaluation.
- **Architecture-Driven Development (ADD)**:
  - Global DRY AI rules (`architecture-driven-development.mdc` / `.md`) enforced across `.cursor/rules/` and `.agents/rules/`.
  - Standard MIT License and updated master `README.md` with system topology, trade-off analyses, and local setup guides.

### Changed
- Bumped `package.json` version from `0.0.0` to `1.1.0`.
- Simplified System Topology and GitHub Actions CI/CD diagrams in `README.md` to clean monospaced ASCII flowcharts.

---

## [1.0.0] - 2026-09-15

### Added
- Initial release of CloudPulse: Next.js Web Portal, NestJS Auditor API, and Terraform sandbox infrastructure.
