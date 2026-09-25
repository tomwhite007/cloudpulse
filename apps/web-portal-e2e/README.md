# web-portal-e2e

Playwright tests for the CloudPulse dashboard. Run them from the repository root.

You do not start `auditor-api` or the web portal yourself. `pnpm e2e-web-portal` builds them if needed, starts them, waits until both respond, runs the tests, and stops them when the run finishes.

| Process | What starts | Address |
| --- | --- | --- |
| Auditor API | `nx serve auditor-api` | http://127.0.0.1:3000 |
| Web portal | `nx start web-portal` (`next start`, production build) | http://127.0.0.1:4000 |

The portal talks to the API through its own backend. An unauthenticated visit is demo mode, so the dashboard shows `Auditor Engine: Connected (Local)`. No passphrase and no AWS session are required.

The first run is the slow one: Nx builds the portal before `next start`. Later runs reuse that build when sources have not changed.

## Headless

```bash
pnpm e2e-web-portal
```

Same thing via Nx: `pnpm exec nx e2e web-portal-e2e`.

## Playwright UI

This opens the Playwright window so you can watch the browser, rerun a test, and inspect each step. The services still start the same way as the headless run. Leave the window open while you work, then close it to stop the run and the services Nx started.

```bash
pnpm e2e-web-portal -- --ui
```

## If something is already running

On your machine, a server that is already listening is reused instead of started again.

- Port 3000 in use: that process is used as the auditor API.
- Port 4000 in use: that process is used as the portal.

`pnpm serve-web-portal` is the Next dev server on port 4000. If it is already up, the UI and headless runs attach to that dev server. They do not replace it with the production `next start` used when port 4000 is free. CI always starts fresh and does not reuse whatever is on the machine.

## Browsers

Chromium is the only browser in `playwright.config.mts`. If Playwright reports a missing browser:

```bash
pnpm exec playwright install chromium
```
