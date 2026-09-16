---
description: Architecture-Driven Development (ADD) core principles and local harness guardrails
globs: *
alwaysApply: true
---

<!-- Mirror of .cursor/rules/architecture-driven-development.mdc -->

# Architecture-Driven Development (ADD)

- **Local Architecture Over Generic Defaults**: Code generation must strictly adhere to project-specific local architecture rules over generic LLM defaults or Stack Overflow boilerplate.
- **Permanent Harness Evolution**: Treat every code divergence or architectural shortcut as a defect of the agent harness. Immediately update local rules, schemas, and prompts to prevent repeat mistakes.
- **Context Economy**: Keep rules crisp, actionable, and zero-fluff to maximize token efficiency.
