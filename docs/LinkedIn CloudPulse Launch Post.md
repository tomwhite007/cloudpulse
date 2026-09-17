# LinkedIn CloudPulse Launch Post

In my previous post, I talked about Architecture-Driven Development (ADD)—shifting away from generic "vibe coding" toward encoding your own architectural opinions and guardrails directly into your project's AI harness.

I promised I'd share a real-world, open-source project built with this methodology. Here it is: **CloudPulse** — a FinOps and Cloud Security Intelligence platform.

While building it, I ran into a common scope decision every engineer faces when trying to ship:

The quick shortcut was deploying the Next.js frontend to Vercel and pointing it at a private NestJS backend on AWS ECS over public IPv4 with a shared API key (`x-api-key`). It worked locally and passed basic smoke tests.

However, looking at it through an Architecture-Driven Development lens, it fell short of true enterprise-grade security and best practice:

- A long-lived symmetric secret bridging two public cloud networks.
- An API compute container exposed directly to the open internet.

Treating that architectural drift as a defect in the AI harness itself, I refactored to a co-located single-cloud setup with closed-loop Infrastructure-as-Code auto-remediation:

🔒 **Enterprise VPC Container Architecture:**

- **Co-Located Fargate Compute:** Both Next.js (BFF) and NestJS (Telemetry Engine) run on AWS ECS Fargate (ARM64 / Graviton) inside the same AWS VPC.
- **Zero-Public-Ingress Backend:** The NestJS API drops its public IP entirely, accepting ingress strictly on port 3333 from the Next.js container's Security Group via internal VPC routing.
- **Two-Tier Access Model:** Public visitors explore interactive mock telemetry out-of-the-box. Invited evaluators unlock live AWS account auditing via an encrypted session cookie (`iron-session`) gated by credentials in AWS SSM Parameter Store. (DM me if you'd like a passphrase to try the live mode!).

⚡ **Closed-Loop FinOps & GitFlow Auto-Remediation:**

- **Automated Waste Auditing:** Scans for unattached EBS volumes (`vol-*`) and idle Elastic IPs (`eipalloc-*`).
- **PulseAdvisor AI Agent:** Analyzes findings, calculates monthly cost drain, and formulates remediation proposals.
- **IaC Auto-Remediation:** Generates consolidated GitHub PRs that tombstone managed HCL blocks in `storage.tf` and inject apply-time cleanup actions (`terraform_data` with AWS CLI) for unmanaged resources.
- **Self-Cleaning State:** Automatically queries live audit data during PR generation to prune completed cleanup records once AWS confirms resource decommissioning.

🚀 **On the Roadmap:**

- Concurrent Multi-Region Account Sweeper (sweeping all active AWS regions in a single pass)
- Stale Lambda Functions & Idle RDS Instance Auditors
- S3 Bucket Lifecycle & Stale Storage Audit
- Playwright Visual Regression Snapshot Testing

The full technical write-up, architectural diagrams, and Terraform manifests are all open-source in the repo. 

I’d love to hear your thoughts on ADD or how you manage closed-loop IaC remediation in your teams. Link in the comments! 👇

#ArchitectureDrivenDevelopment #AWS #Terraform #NextJS #NestJS #FinOps #CloudArchitecture #DevOps #PlatformEngineering #TypeScript
