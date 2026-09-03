# Host Whisperer Agent Guide

This file is the working contract for anyone modifying this repository. Read it before changing code.

## Project mission

This repository exists solely to compete in OpenAI's WebMCP Challenge. It is a time-bounded hackathon demonstration and will not become a real product. The goal is to maximize the submission's score and place among the ten winners, not to build production infrastructure or optimize for post-hackathon use.

Read `docs/HACKATHON.md` before planning work. It records the official prompt, equally weighted judging criteria, submission requirements, dates, freeze policy, competition thesis, and definition of done. Prefer work that creates evidence a judge can see in the live demo, video, description, or code. Defer production hardening and generalized features unless they directly improve that evidence.

## Product intent

Within the hackathon demonstration, Host Whisperer generates a framework-neutral plugin that a developer installs on an existing website. The installed plugin registers one customer-facing WebMCP handoff. A browser agent such as ChatGPT delegates the issue to Host Whisperer's deterministic support agent, which privately diagnoses supported problems, proposes a bounded recovery, waits for visible customer approval, applies it, verifies the result, and returns a minimal customer-safe outcome.

The generator is not itself an AI chat product. WebMCP belongs in the generated customer runtime, not in the Host Whisperer configuration UI.

## Surfaces

All surfaces currently share one Vite deployment for demonstration purposes, but represent separate products and roles:

| Route | Surface | Audience | Responsibility |
| --- | --- | --- | --- |
| `/` | Host Whisperer walkthrough | Evaluator or developer | Explain the product with the animated nine-step flow diagram |
| `/?view=integrate` | Connect your host | Plugin operator/developer | Choose a host, connect it, and download the one-file plugin |
| `/?view=shop` | Big Pink | Customer | Hit the 503, then use the installed WebMCP support tools |
| `/?view=incident#packet=...` | Developer escalation | Store developer/operator | Inspect a customer-approved sanitized incident packet |
| `/?view=admin` | Big Pink Admin | Store developer | Legacy install console; kept working but off the demo path and out of navigation |

Keep the surfaces visually and conceptually distinct. Big Pink must never link customers to developer configuration. Host Whisperer must not pretend it can silently modify an unrelated website.

The connect page asks for a host API token. That token lives in React component state only: it is never written to IndexedDB or `localStorage`, never passed to `updateStudioProfile`, and never interpolated into the downloaded plugin. `src/App.test.tsx` enforces all three. Keep it that way — the on-screen copy promises it.

## Non-negotiable boundaries

- Do not register WebMCP tools on the walkthrough, the connect page, or Big Pink Admin.
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

- `host-whisperer-bigpink-bundle-ready` means the connect page prepared a package.
- `host-whisperer-bigpink-installed` means the plugin is installed. It is **installed by default**: the storefront reads `!== 'false'`, so the demo needs no setup. The "Show it without the plugin" control writes `'false'`.
- `bigpink-demo-cart` stores the cart item, which stays intact through the whole incident.
- `bigpink-demo-service` stores `{ healthy, deploy, lastGood }` for the checkout service, defaulting to the broken `dep-8f2c1a` with `dep-8e0b47` as the last healthy deploy.

The incident is a **host outage**, not an application bug. `POST /api/checkout` returns HTTP 503 because deploy `dep-8f2c1a` of `checkout-service` is crash-looping (OOMKilled). Internally, three diagnostics run: storefront health (pass), cart contents (pass), checkout service (fail). Those technical details are not returned to the customer's browser agent. The single allowlisted recovery, `roll_back_checkout_service`, rolls the service back to `dep-8e0b47`, reports only generic support-case progress to the customer, and leaves the cart untouched. After verification the error card becomes **Try checkout again**, which reaches order confirmation.

## Source map

- `src/App.tsx`: demo routes and the three product surfaces.
- `src/styles.css`: global UI styles for all demo surfaces.
- `src/studio.ts`: integration-profile persistence, plugin bootstrap generation, and one-file plugin assembly.
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
