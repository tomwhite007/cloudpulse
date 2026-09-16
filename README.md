# CloudPulse

> Cloud Cost (FinOps) & Security Intelligence Platform demonstrating enterprise-grade platform engineering, closed-loop IaC auto-remediation, and zero-public-ingress container orchestration on AWS. Engineered using **Architecture-Driven Development (ADD)** principles.

---

## 📋 Table of Contents

- [1. Architectural Philosophy & Topology](#1-architectural-philosophy--topology)
  - [System Topology](#system-topology)
- [2. Core Capabilities & Architectural Highlights](#2-core-capabilities--architectural-highlights)
  - [Architecture-Driven Development (ADD)](#-architecture-driven-development-add)
  - [Closed-Loop GitFlow Auto-Remediation](#-closed-loop-gitflow-auto-remediation)
  - [Enterprise Security & Isolation](#-enterprise-security--isolation)
  - [Cost-Conscious Lifecycle Management](#-cost-conscious-lifecycle-management)
  - [Architectural Trade-Off: ALB vs. API Gateway Strategy](#%EF%B8%8F-architectural-trade-off-alb-vs-api-gateway-strategy)
- [3. GitHub Actions CI/CD Pipelines](#3-github-actions-cicd-pipelines)
  - [Workflow Execution Flow](#workflow-execution-flow)
  - [Key Workflows](#key-workflows)
- [4. Technology Stack](#4-technology-stack)
- [5. Repository Structure](#5-repository-structure)
- [6. Local Development & Testing](#6-local-development--testing)
- [7. Deploying to Your AWS Environment](#7-deploying-to-your-aws-environment)
- [8. Roadmap & Upcoming Features](#-8-roadmap--upcoming-features)

---

## 1. Architectural Philosophy & Topology

CloudPulse pairs a **Next.js Web Portal (acting as a Backend-for-Frontend / BFF)** with a **NestJS Auditor API (the cloud telemetry engine)**. Both components are co-located within an AWS VPC on **AWS ECS Fargate (ARM64 / Graviton)**, completely eliminating cross-cloud public API tokens.

### System Topology

```text
                      Public Internet / Evaluators
                                   │
                                   ▼ Port 80 / 443
             ┌───────────────────────────────────────────┐
             │    AWS Application Load Balancer (ALB)    │
             │       (cloudpulse-sandbox-alb)            │
             └─────────────────────┬─────────────────────┘
                                   │ Forward to Target Group (:3000)
                                   ▼
      ┌─────────────────────────────────────────────────────────┐
      │                 AWS VPC (Sandbox)                       │
      │                                                         │
      │  ┌───────────────────────────────────────────────────┐  │
      │  │  ECS Fargate: Next.js Web Container (Port 3000)   │  │
      │  │  - ARM64 / Graviton (standalone output)           │  │
      │  │  - Evaluates encrypted AES-256 session cookie     │  │
      │  │  - Serves Mock Telemetry to public visitors       │  │
      │  │  - Gated by DEMO_INVITE_PASSPHRASE from SSM       │  │
      │  └─────────────────────────┬─────────────────────────┘  │
      │                            │                            │
      │                            │ Internal VPC Routing       │
      │                            │ http://auditor-api:3333    │
      │                            ▼                            │
      │  ┌───────────────────────────────────────────────────┐  │
      │  │  ECS Fargate: NestJS Auditor API Container (:3333)│  │
      │  │  - Zero public IP / Zero internet ingress         │  │
      │  │  - Security Group: Ingress ONLY from Next.js SG   │  │
      │  │  - Read-only AWS STS / CloudWatch / EC2 SDK       │  │
      │  └───────────────────────────────────────────────────┘  │
      └─────────────────────────────────────────────────────────┘
```

---

## 2. Core Capabilities & Architectural Highlights

### 📐 Architecture-Driven Development (ADD)
CloudPulse was engineered using **Architecture-Driven Development (ADD)**—a methodology that encodes domain-specific architectural opinions and security constraints directly into local agent/LLM harnesses (`.agents/rules/` and `.cursor/rules/`). Whenever architectural drift or shortcuts occur, the harness itself is updated, ensuring AI tooling acts as a force multiplier for enterprise engineering standards.

### ⚡ Closed-Loop GitFlow Auto-Remediation
Unlike traditional monitoring dashboards that require manual engineer intervention, CloudPulse automates infrastructure decommission via Pull Requests:
* **Managed Resource Tombstoning:** Finds HCL definitions in `storage.tf` and comments out target `resource` blocks, triggering native Terraform destruction upon merge.
* **Unmanaged Resource Execution:** For resources created out-of-band via AWS CLI, generates apply-time `terraform_data` provisioners (`aws ec2 release-address` / `aws ec2 delete-volume`) to ensure 100% cleanup execution.
* **PR Consolidation:** Multi-card approvals automatically consolidate into a single active `finops/` branch to eliminate PR clutter.
* **Self-Cleaning State Pruning:** Queries live audit data during PR generation to automatically prune completed `terraform_data` records once AWS confirms resource absence.

### 🔒 Enterprise Security & Isolation
* **Zero Public Ingress Backend:** The NestJS API compute container has no public IP address and accepts ingress exclusively from the Next.js container Security Group.
* **Two-Tier Access Model:** Public visitors view deterministic mock telemetry. Invited evaluators enter a passphrase stored in **AWS SSM Parameter Store**, issuing an encrypted `iron-session` cookie (`HttpOnly`) that enables live AWS SDK calls.

### 💰 Cost-Conscious Lifecycle Management
* **ALB Toggle:** Terraform variables allow disabling the ALB (`enable_alb = false`) or scaling task counts to zero when idle to keep sandbox infrastructure costs near zero.

### ⚖️ Architectural Trade-Off: ALB vs. API Gateway Strategy
* **Selected Pattern (ALB + Next.js BFF):** In CloudPulse, the AWS Application Load Balancer (ALB) terminates HTTPS traffic and routes directly to the Next.js BFF container. Because Next.js handles server-side session validation (`iron-session`) and internal VPC proxying to NestJS, adding an AWS API Gateway layer in front of the ALB would introduce unnecessary dual-layer proxy latency, API Gateway payload fees, and redundant routing rules.
* **Enterprise Extension:** For multi-tenant public API distribution requiring edge WAF rules, rate-limiting quotas, or SigV4 third-party authentication, an AWS API Gateway or VPC Lattice layer can be fronted in front of the ALB without modifying the internal ECS container topology.

---

## 3. GitHub Actions CI/CD Pipelines

CloudPulse utilizes a unified, automated CI/CD architecture powered by **Nx affected dependency graph detection** across both application software and Terraform infrastructure.

### Workflow Execution Flow

```text
               Git Event (Push to main / PR / Dispatch)
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │ detect-affected (nrwl/nx-set-shas)        │
             └─────────────────────┬─────────────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │ lint-and-test                             │
             │ pnpm nx affected -t lint test --no-infra  │
             └──────────┬─────────────────────┬──────────┘
                        │                     │
               [ PASS ] │                     │ [ FAIL ]
                        ▼                     ▼
             ┌─────────────────────┐   ┌─────────────────────┐
             │ Project Affected?   │   │ ABORT               │
             └─────┬─────────┬─────┘   │ No Deploy / Apply   │
                   │         │         └─────────────────────┘
        [ App ]    │         │ [ Infra ]
                   ▼         ▼
     ┌──────────────────┐   ┌───────────────────────────┐
     │ deploy-apps      │   │ terraform-apply           │
     │ ARM64 ECR Build  │   │ terraform init & validate │
     │ ECS Force Refresh│   │ terraform apply           │
     └──────────────────┘   └───────────────────────────┘
```

### Key Workflows

1. **Application Deployments Workflow ([`.github/workflows/app-deploy.yml`](.github/workflows/app-deploy.yml))**:
   - **Trigger**: Push to `main` or manual `workflow_dispatch`.
   - **Nx Affected Detection**: Uses `nrwl/nx-set-shas@v4` and `pnpm nx show projects --affected` to inspect git diffs and identify affected components (`web-portal`, `auditor-api`, `api-contracts`, `gitflow`).
   - **Quality Gate**: Runs `pnpm nx affected -t lint test --exclude=infra` in the `lint-and-test` job. If any unit test or lint check fails, deployment is aborted immediately.
   - **Container Build & Deploy**: Builds `linux/arm64` container images via Docker Buildx & QEMU, tags images with `:latest` and `${{ github.sha }}`, pushes to AWS ECR, and triggers `aws ecs update-service --force-new-deployment` for rolling updates.

2. **PR Validation Workflow ([`.github/workflows/app-pr-test.yml`](.github/workflows/app-pr-test.yml))**:
   - **Trigger**: Pull Request targeting `main`.
   - **Validation**: Executes `pnpm nx affected -t lint test --exclude=infra` and performs dry-run ARM64 Docker image compilations (`push: false`) to catch broken builds before merging.

3. **Infrastructure Workflows ([`.github/workflows/infra-main-apply.yml`](.github/workflows/infra-main-apply.yml) & [`.github/workflows/infra-pr-plan.yml`](.github/workflows/infra-pr-plan.yml))**:
   - **Trigger**: Pull Request or push to `main` modifying HCL files under `apps/infra`.
   - **Validation & Apply**: Checks HCL formatting (`terraform fmt -check`), validates Terraform modules (`terraform validate`), generates execution plans (`terraform plan`), and applies changes on `main` (`terraform apply`).

---

## 4. Technology Stack

* **Monorepo Architecture:** NX workspace with `pnpm`
* **Frontend / BFF:** Next.js 16 (App Router, React 19, Server Actions, Standalone Output)
* **Backend:** NestJS, TypeScript, AWS SDK v3
* **IaC & Automation:** Terraform 1.7+ (Remote S3 backend, state locking), GitHub Actions
* **Compute:** AWS ECS Fargate ARM64 (AWS Graviton)

---

## 5. Repository Structure

```
cloudpulse/
├── apps/
│   ├── auditor-api/            # NestJS backend (AWS telemetry engine)
│   ├── web-portal/             # Next.js frontend (UI & BFF proxy)
│   └── infra/
│       └── environments/
│           └── sandbox/        # Terraform root (ECR, ECS, ALB, IAM, SSM, storage.tf)
├── libs/
│   ├── api-contracts/          # Shared TypeScript interfaces & Zod schemas
│   └── gitflow/                # GitFlow PR consolidation & HCL tombstoning engine
├── .agents/rules/              # Local Architecture-Driven Development agent rules
├── .cursor/rules/              # Local Architecture-Driven Development Cursor rules
└── .github/workflows/          # GitHub Actions CI/CD & terraform apply pipelines
```

---

## 6. Local Development & Testing

### Running the Local Serving Environment

```bash
# Terminal 1: Start the Auditor API backend
pnpm run serve-auditor-api

# Terminal 2: Start the Web Portal frontend (port 4000)
pnpm run serve-web-portal
```

*(Note: Private test helper scripts are maintained under `private-tooling/` for out-of-band managed and unmanaged test fixture generation during local evaluation.)*

### Running Test Suite

```bash
# Run all vitest & jest test suites (214+ passing)
pnpm run test-all
```

---

## 7. Deploying to Your AWS Environment

CloudPulse is designed for modular deployment to any AWS Account:

1. **Infrastructure Prerequisites:** AWS CLI configured with deployer permissions, Terraform 1.7+, Docker Buildx, and an active S3 remote state bucket.
2. **Environment Secrets:** Provision `/cloudpulse/sandbox/DEMO_INVITE_PASSPHRASE` and `/cloudpulse/sandbox/SESSION_SECRET` in AWS SSM Parameter Store.
3. **Terraform Provisioning:** Update variables in `apps/infra/environments/sandbox/` and execute `terraform init && terraform apply`.

> 💡 **Custom Enterprise Integration:** Need multi-account AWS Organization onboarding, custom cloud provider adapters, or enterprise deployment guidance? Connect with [Tom White on LinkedIn](https://www.linkedin.com/in/tom-white-111a9a34/) to discuss implementation and consulting.

---

## 🚀 8. Roadmap & Upcoming Features

- [ ] **Concurrent Multi-Region Account Sweeper**: Expand auditing beyond single-region configuration (`AWS_REGION`) to dynamically iterate and sweep all enabled AWS regions across the account in a single audit pass.
- [ ] **S3 Bucket Lifecycle & Stale Data Auditor**: Deep scanning of unutilized S3 buckets via CloudWatch metrics & object last-modified date analysis to identify zero-access storage waste.
- [ ] **Playwright Visual Snapshot Testing**: Automated visual regression testing across multi-viewport breakpoints to ensure UI layout & component consistency.
- [ ] **Multi-Cloud Provider Support**: Extending FinOps auditing & automated GitFlow remediation to GCP and Azure.
