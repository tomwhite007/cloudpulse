# LinkedIn CloudPulse Launch Post

In my previous post, I wrote about Architecture-Driven Development (ADD)—the shift from generic "vibe coding" to encoding local architectural opinions and engineering guardrails directly into your project's AI harness.

I promised to share a real-world open-source project built with this exact methodology. Here it is: **CloudPulse** — a Cloud Cost (FinOps) and Security Intelligence Platform.

During development, I hit a classic speed-vs-rigor crossroads:
The quick hack was deploying the Next.js frontend to Vercel and calling a private NestJS backend on AWS ECS over public IPv4 using a shared API key (`x-api-key`). It worked locally and passed basic smoke tests.

However, from an Architecture-Driven lens, it failed enterprise standards:

- A long-lived symmetric secret bridging two public cloud networks.
- An API compute container exposed directly to the open internet.
- A FinOps dashboard that identified waste, but couldn't safely remediate it.

Treating architectural drift as a defect of the harness, I refactored to a co-located single-cloud topology with closed-loop Infrastructure-as-Code auto-remediation:

🔒 **Enterprise VPC Container Architecture:**

- **Co-Located Fargate Compute:** Both Next.js (BFF) and NestJS (Telemetry Engine) run on AWS ECS Fargate (ARM64 / Graviton) in the same AWS VPC.
- **Zero-Public-Ingress Backend:** The NestJS API drops its public IP entirely, accepting ingress strictly on port 3333 from the Next.js container's Security Group via internal VPC routing.
- **Two-Tier Access Model:** Public visitors explore interactive mock telemetry out-of-the-box. Invited evaluators unlock live AWS account auditing via an encrypted session cookie (`iron-session`) gated by credentials in AWS SSM Parameter Store.

⚡ **Closed-Loop FinOps & GitFlow Auto-Remediation:**

- **Automated Waste Auditing:** Identifies unattached EBS volumes (`vol-*`) and idle Elastic IPs (`eipalloc-*`).
- **PulseAdvisor AI Agent:** Analyzes findings, calculates monthly cost drain, and formulates remediation proposals.
- **IaC Auto-Remediation:** Generates consolidated GitHub PRs that tombstone managed HCL blocks in `storage.tf` and inject apply-time cleanup actions (`terraform_data` with AWS CLI) for unmanaged resources.
- **Self-Cleaning State:** Automatically queries live audit data during PR generation to prune completed cleanup records once AWS confirms resource decommissioning.

🔮 **On the Roadmap:**

- Concurrent Multi-Region Account Sweeper (sweeping all active AWS regions in a single pass)
- S3 Bucket Lifecycle & Stale Storage Audit
- Playwright Visual Regression Snapshot Testing

Full technical write-up, architectural diagrams, and Terraform manifests are open-source in the repo. Link in comments! 👇

#ArchitectureDrivenDevelopment #AWS #Terraform #NextJS #NestJS #FinOps #CloudArchitecture #DevOps #PlatformEngineering #TypeScript
