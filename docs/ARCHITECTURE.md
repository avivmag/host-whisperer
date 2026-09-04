# Architecture

## System overview

```text
Website integration                  Big Pink (customer website)
  developer reviews access,             serves normally; POST /api/checkout
  connects the host, downloads ---->    returns 503 because the host's
  one plugin file                       checkout-service is crash-looping
                                                |
                                                v
                                        installed plugin runtime
                                          registers document.modelContext tools
                                                |
                                                v
                                        ChatGPT in the customer's browser
                                          discovers and invokes those tools
                                                |
                                                v
                                        allowlisted diagnostics and one
                                        bounded recovery, applied only
                                        after visible customer approval
                                                |
                                                v
                                        the host (simulated in this demo;
                                        a narrow server-side endpoint in
                                        the real design)
```

The repository is one React application using query-string routing to present several surfaces. That is a demo convenience, not the intended production topology.

## Application surfaces

### Walkthrough

`/` explains the product with an animated seven-step inline-SVG diagram: the customer and their agent on the left, the website split into REST API and WebMCP lanes in the centre, the host on the right, and Host Whisperer below, wired to both. It auto-plays, has prev/next/pause, and respects `prefers-reduced-motion`.

It registers no WebMCP tools.

### About

`/?view=about` is a concise project introduction. It identifies the OpenAI WebMCP Challenge, distinguishes the working browser handoff from simulated provider operations, links to the walkthrough and live demo, and includes creator contact details. It registers no WebMCP tools.

### Website integration

`/?view=integrate` is the developer surface. It explains the complete integration rather than presenting host connection as the product: the Big Pink customer URL and a demo token are prefilled, the developer chooses a host, reviews permission names that match that provider's console, and connects it. A three-node diagram makes the boundary explicit: WebMCP lives on the customer website, Host Whisperer holds the credential privately, and the credential authenticates only the Host Whisperer-to-host exchange. A simulated handshake moves the reviewed permissions into the connected success card without showing any token fingerprint, after which the plugin can be downloaded as a single file.

The token lives in React component state only. It is never written to IndexedDB or `localStorage`, never passed to `updateStudioProfile`, and never interpolated into the generated plugin. `src/App.test.tsx` asserts this.

It registers no WebMCP tools.

### Big Pink

`/?view=shop` simulates the customer website: an inflatable pool-float store. Search, category navigation, the bag drawer, the account menu, color swatches and product selection are all live client state; nothing leaves the browser. Selecting a card in the lower catalog updates the hero product, its default color, and its accessible image label together. The plugin is installed by default so the demo needs no setup. Its WebMCP tool registers as soon as the storefront loads, so an agent never needs to refresh to discover it. Clicking Checkout simulates `POST /api/checkout` failing with `HTTP 503 · Service Unavailable`; the bag is untouched and no payment is attempted. Only then is the dormant customer UI activated: its dialog stays hidden for `revealDelayMs`, then animates in anchored beside the error card. The failed checkout is kept in tab-scoped session storage so an accidental refresh preserves the visible incident and recovery path. The demo controls live in the page footer, away from the customer story.

The customer-facing launcher and panel use only Big Pink support language; they do not reveal the installed provider. The opened panel says one thing: the sentence to give the browser agent, with a **Copy** button for it. When the agent invokes the tool, the panel opens immediately and appends an animated pink progress bar after the activity rows; a small Big Pink flamingo travels with the bounded workflow until it settles. When no Website Tool is available the panel also offers **Use store support here**, which runs the same workflow without an agent. The panel is patched in place — cached HTML per region, appended activity rows — so a repair in progress never re-runs its entrance animations.

### Escalation view

`/?view=incident#packet=...` decodes a bounded URL-fragment packet. Nothing is uploaded. The view labels the packet untrusted customer-supplied evidence.

### Legacy install console

`/?view=admin` still renders and still works, but it is off the demo path and out of navigation.

## Generated artifacts

The production build has two stages:

1. The main Vite build emits the React demonstration application.
2. `vite.runtime.config.ts` emits `dist/runtime/host-whisperer.js` as a standalone ESM library (~22 kB).

`buildPluginFile()` in `src/studio.ts` fetches that runtime, appends the bootstrap from `generatedBootstrap()`, and saves one self-contained `host-whisperer-plugin.js`. Under `npm run dev` the built runtime is not served — Vite answers unknown paths with `index.html` at status 200 — so `buildPluginFile` checks the response body for `createHostWhispererRuntime` and falls back to a two-file form that imports the runtime instead.

```html
<script type="module" src="/host-whisperer-plugin.js"></script>
```

## Runtime configuration

`createHostWhispererRuntime(config)` accepts:

- Integration ID and public application name
- Exact allowed origin
- Provider hint for escalation context
- A safe-context callback
- Up to 20 diagnostics with unique IDs
- Up to 20 recovery actions with unique IDs, each exposing `run(report?)`
- An optional escalation destination
- `revealDelayMs` — how long the dialog stays hidden after mount
- `deferUntilActivated` — register immediately but keep the customer UI dormant until `runtime.activate()` is called
- `anchorTo` — returns the element the dialog should sit beside, recomputed on scroll and resize, falling back to the bottom-right corner when it does not fit

The runtime rejects an origin mismatch, empty tool sets, excessive tool counts, and duplicate IDs.

The `report(label, detail)` callback passed to a recovery action appends events to the customer-visible activity timeline while the action runs, which is how the Host Whisperer ↔ host exchange streams onto the page.

## Customer WebMCP tool

| Tool | Purpose | Mutation |
| --- | --- | --- |
| `resolve_store_issue` | Start private inspection immediately when the customer asks for a fix; wait for visible in-page approval; return only a resolved-or-escalated customer message | One developer-allowlisted mutation after approval |

The tool is registered with `document.modelContext.registerTool()` and an abort signal. Its description states the bounded support operation and its approval and verification behavior without attempting to direct the browser agent's broader behavior. Destroying the runtime aborts registration, cancels a pending approval wait, and removes the Shadow DOM host.

The detailed context, diagnostic results, action ID, provider exchange, and verification summary remain inside the deterministic Host Whisperer runtime. They are not returned through WebMCP. The tool returns plain structured JSON deliberately limited to `status` and `customerMessage` so the browser agent communicates only whether the customer should retry or wait for a developer.

## Incident state machine

```text
reported
   -> investigating
   -> diagnosed
   -> awaiting_approval
   -> repairing
   -> verifying
   -> recovered

Any failed repair or failed verification -> escalated
```

The runtime owns the incident ID and every transition; the browser agent never receives or manages them. The single WebMCP call remains pending while the approval card is visible. Clicking **Yes, go ahead** resumes the internal workflow in that same call. Resetting or destroying the runtime cancels any pending approval wait.

## Demo persistence

The demo uses same-origin browser storage so navigation between its simulated surfaces preserves state:

| Storage | Key | Meaning |
| --- | --- | --- |
| IndexedDB | `host-whisperer-studio` | Latest integration profile — origin, app name, host, playbook. No token. |
| localStorage | `bigpink-demo-service` | `{ healthy, deploy, lastGood }` for the simulated checkout service |
| localStorage | `bigpink-demo-cart` | Cart contents, kept intact as evidence |
| localStorage | `host-whisperer-bigpink-installed` | `'false'` uninstalls; anything else, including absent, means installed |
| localStorage | `host-whisperer-bigpink-bundle-ready` | Legacy handoff flag for the install console |
| sessionStorage | `host-whisperer-bigpink-checkout-attempted` | Keeps the visible failed checkout intact across an accidental refresh in the current tab |

This is not a production package-delivery or deployment mechanism.

## Production hosting integration

Customer JavaScript must never contain provider credentials. The demo simulates the rollback in browser state. In the real design, a recovery handler calls a narrow, authenticated application endpoint:

```text
WebMCP tool callback
  -> same-site support endpoint
  -> authorization and policy check
  -> server-side provider integration
  -> sanitized result
```

Provider OAuth tokens or API keys remain server-side. Each endpoint should be tenant-scoped, rate-limited, auditable, and limited to one named diagnostic or recovery. High-blast-radius operations belong in an authenticated developer workflow, not the customer runtime.
