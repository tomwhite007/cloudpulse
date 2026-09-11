---
description: Put agent scratch files in /tmp
alwaysApply: true
---

<!-- Mirror of .cursor/rules/scratch_files.mdc -->

# Agent Scratch Files Rule

When performing debugging, creating temporary test scripts, capturing server logs, or creating any other scratch files, **ALWAYS** place them in the `/tmp` folder (e.g., `/tmp/test-script.ts` or `/tmp/server.log`).

Do **NOT** create temporary untracked files in the workspace root or inside source code directories to ensure the git working tree remains clean.
