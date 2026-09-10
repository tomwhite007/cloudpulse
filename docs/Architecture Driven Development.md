# Architecture Driven Development

## A LinkedIn Post: https://lnkd.in/p/eSNRuRBN

Over the past few months, I've been using a self-defined methodology for agentic coding on a daily basis. I originally called it Architecture-Driven Development, or ADD, but later, before posting this, I realised that somebody else had also coined the phrase for something incredibly similar (link in the first comment 🔗). Seeing others arrive at practically the same conclusion only proves that this concept is not just common, but a growing challenge that needs a unified name.

ADD is about the shift from vibe coding, or basic spec-driven development (SDD), to true architecture definition on a per-project basis.

The problem is that out-of-the-box AI rule sets and global harnesses are fine for enforcing system-wide syntax and coding style, but they completely fail to capture local architecture opinions—the engineering principles or intentional conventions for a specific domain, project, or feature. When you rely on generic AI rule sets, you aren't accelerating your engineering organisation; you're simply scaling architectural drift or possibly technical debt.

In a recent project I consulted on, the development team used an MCP server to deliver the same frequently iterating enterprise coding standards guide for each project repo to use. The standards were updated by key dev staff. This solved half the problem—keeping global standards up to date—but what it didn't do was define each project's specific coding style and structural priorities. For example, you shouldn't have a rule to Storybook a library full of utility code; that's just noise that burns tokens in context.

The core tenet of an Architecture-Driven approach is permanent harness evolution. During a code review, or when your agent creates a diff that deviates from your mental model, your job as an engineer isn't just to patch the code; you must treat that divergence as a defect of the harness itself. You immediately update your local rule sets, system prompts, or context files so that the AI never repeats that specific architectural mistake.

When you codify local architectural guardrails into your AI workflows, the AI stops turning out generic boilerplate that looks like Stack Overflow copies and instead starts producing code that looks, feels, and performs like your most senior developer designed it for your stack—or in other words, it develops in your voice.

I'm going to prove how much this works in my next post, where I'll share an open-source solution that uses this exact process and has accelerated my workflow.

Are you still relying on out-of-the-box AI rules, or have you started encoding your team's local architecture opinions into your workflow?

#ArchitectureDrivenDevelopment #SoftwareArchitecture #AIengineering #TechLeadership #DeveloperVelocity #EnterpriseTech
