# Host Whisperer Agent Guide

This file is the working contract for anyone modifying this repository. Read it before changing code.

## Product intent

Host Whisperer generates a framework-neutral plugin that a developer installs on an existing website. The installed plugin registers WebMCP tools on the customer-facing page so a browser agent such as ChatGPT can diagnose supported problems, propose a bounded recovery, wait for visible customer approval, apply it, and verify the result.

The generator is not itself an AI chat product. WebMCP belongs in the generated customer runtime, not in the Host Whisperer configuration UI.

## Three surfaces

All three surfaces currently share one Vite deployment for demonstration purposes, but represent separate products and roles:

| Route | Surface | Audience | Responsibility |
| --- | --- | --- | --- |
| `/` | Host Whisperer walkthrough | Evaluator or developer | Explain the product and demo sequence |
| `/?view=integrate` | Host Whisperer Integration Studio | Plugin operator/developer | Configure and generate the integration package using normal UI |
| `/?view=admin` | Northstar Admin | Store developer | Review and install the generated package |
| `/?view=shop` | Northstar Market | Customer | Encounter the issue and use the installed WebMCP support tools |
| `/?view=incident#packet=...` | Developer escalation | Store developer/operator | Inspect a customer-approved sanitized incident packet |

Keep the surfaces visually and conceptually distinct. Northstar Market must never link customers to developer configuration. Host Whisperer must not pretend it can silently modify an unrelated website. Northstar Admin owns the simulated installation action.

## Non-negotiable boundaries

- Do not register WebMCP tools on the walkthrough, Integration Studio, or Northstar Admin.
- Register WebMCP tools only through the installed customer runtime in `src/runtime/index.ts`.
- Do not embed or request cloud-provider credentials in browser code.
- Do not expose arbitrary shell commands, scripts, provider APIs, logs, or infrastructure mutations to a customer agent.
- Recovery actions must be developer-allowlisted, incident-bound, visibly approved, single-use, and verified before success is reported.
- Unknown or unsafe problems must escalate; never claim the plugin can solve every website or hosting problem.
- Context passed to an agent must remain minimal and sanitized. Never expose payment data, secrets, raw DOM content, or URL query/fragment values.
- Treat escalation packets as untrusted customer-supplied evidence.
- Any future hosting integration must use narrow authenticated server-side endpoints. Provider credentials stay on the server.

## Current demo state

The demo uses local browser state to model generation and installation:

- `host-whisperer-northstar-bundle-ready` means Studio prepared a package for Northstar Admin.
- `host-whisperer-northstar-installed` means Northstar Admin installed the plugin.
- `northstar-demo-cart` stores the deterministic cart schema version and item.

The broken cart starts at schema version 1. Checkout expects version 2. The allowlisted recovery migrates only the cart schema while preserving the SKU and quantity.

## Source map

- `src/App.tsx`: demo routes and the three product surfaces.
- `src/styles.css`: global UI styles for all demo surfaces.
- `src/studio.ts`: integration-profile persistence and adapter generation.
- `src/runtime/index.ts`: standalone widget, incident state machine, and customer WebMCP tools.
- `src/security.ts`: sanitization and compact tool-output helpers.
- `src/types.ts`: shared domain types.
- `vite.runtime.config.ts`: standalone ESM runtime build.
- `docs/`: product, architecture, security, status, demo, and submission documentation.

## Working with the repository

- Preserve unrelated or uncommitted user changes. The current UI redesign may be uncommitted; inspect `git status` and `git diff` before editing.
- Prefer focused patches over wholesale rewrites of `App.tsx` or `styles.css`.
- Update documentation whenever behavior, routes, tool contracts, or security boundaries change.
- Do not make the repository public, submit the Devpost entry, or claim external deployment without explicit user authorization.
- Render deploys from `main`; pushing to `main` changes the live demo.

## Verification

Run these before committing or deploying:

```bash
npm test -- --run
npm run build
git diff --check
```

The build must produce both the application and `dist/runtime/host-whisperer.js`.
