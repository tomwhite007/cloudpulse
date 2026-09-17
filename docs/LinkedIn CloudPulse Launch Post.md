# LinkedIn CloudPulse Launch Post

Today, I'm releasing **CloudPulse** — an open-source FinOps and Cloud Security Intelligence platform.

Following up on my previous post about Architecture-Driven Development (ADD), CloudPulse is the real-world reference project demonstrating how to encode architectural guardrails directly into your AI harness.

While building it, I hit a common scope decision:
Deploying the Next.js frontend to Vercel and calling a private NestJS backend on AWS over public IPv4 with a shared API key (`x-api-key`). It worked locally, but through an ADD lens, it felt a bit too hacky for enterprise-grade security.

So I refactored both the platform and the AI harness around two core pillars:

🔒 **Zero-Trust VPC Architecture:** Co-located Next.js (BFF) and NestJS (Telemetry Engine) containers on AWS ECS Fargate (ARM64 / Graviton) inside an isolated VPC, completely dropping public backend IP ingress.

⚡ **Closed-Loop IaC Auto-Remediation:** An interactive AI copilot (`PulseAdvisor`) that scans for cloud waste and automatically generates consolidated GitHub PRs to tombstone HCL blocks in Terraform (`storage.tf`) and prune completed cleanup state.

The full architecture write-up, VPC diagrams, Terraform manifests, and live demo link are all open-source in the repo.

I’d love to hear how your teams handle closed-loop IaC remediation or AI harness guardrails. All links in the comments! 👇

#ArchitectureDrivenDevelopment #AWS #Terraform #NextJS #NestJS #FinOps #CloudArchitecture #DevOps #PlatformEngineering #TypeScript
