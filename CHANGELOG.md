# Changelog

All notable changes to the CloudPulse project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
