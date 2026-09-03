# Devpost Submission Draft

This draft describes the implemented architecture. Do not submit it until `docs/STATUS.md` confirms that the redesigned live deployment has been tested in ChatGPT's in-app browser.

## Project

**Name:** Host Whisperer

**Tagline:** When your host fails, your customers' agents can fix it.

**Product walkthrough:** https://host-whisperer.onrender.com

**Connect your host:** https://host-whisperer.onrender.com/?view=integrate

**Working demo:** https://host-whisperer.onrender.com/?view=shop

**Repository:** https://github.com/avivmag/host-whisperer

## Description

### Inspiration

When a website's host goes down, its customers see “Something went wrong” and leave. The failure is not theirs to fix and not theirs to understand — they cannot tell a transient blip from a real outage, and no amount of refreshing helps. Support gets a vague report hours later and tries to reconstruct browser state long after the evidence is gone.

The website knows exactly what happened. It had no safe, structured way to say so to the customer's agent. Host Whisperer gives it one.

### What it does

A developer connects their hosting account on one page and downloads one JavaScript file. That file carries the WebMCP runtime plus the diagnostics they approve and the single recovery they allow. One `<script>` tag installs it.

After that, when a customer hits a supported failure, the page offers help beside the error and registers six WebMCP tools. The customer asks their own agent, in one sentence, to fix it. ChatGPT reads only safe application context, runs the approved diagnostics, explains the evidence, prepares the bounded recovery, waits for the customer to approve its exact effects on the page, applies it, and verifies the original symptom is gone before claiming success. Every step appears in a visible activity timeline — including the repair's own conversation with the host, streamed live.

The working Northstar demo is a storefront whose host is failing. Checkout returns **HTTP 503 Service Unavailable**: deploy `dep-8f2c1a` of the store's checkout service is crash-looping. Five seconds after the error, an agent dialog animates in beside it. ChatGPT finds that the storefront and the cart are healthy and the checkout service is not, proposes rolling that one service back to `dep-8e0b47` — the last deploy that passed health checks — and cannot run it until the customer approves it on the page. The rollback streams its host exchange into the timeline, verification confirms `POST /api/checkout` returns 200, and the retry places the order. The cart is never touched and no order is placed before approval.

If a problem cannot be safely repaired in the customer page, Host Whisperer prepares a sanitized, customer-approved escalation packet for the developer. Cloud credentials and infrastructure operations never enter the customer context.

### Why WebMCP

This experience depends on the page, person, and agent sharing live state. Without WebMCP, a chatbot receives prose and guesses what happened. With WebMCP, the website exposes precise diagnostic and recovery capabilities with JSON Schemas and enforced boundaries.

Host Whisperer uses WebMCP at the point where it creates unique value: inside the installed customer website. The generated runtime registers six support tools tied to live page state, visible customer approval, and developer-defined handlers. This makes the existing site meaningfully better when its customer and browser agent use it together.

### How it was built

The configuration site is a React and TypeScript application. It stores integration profiles in IndexedDB and assembles a single-file plugin from a standalone ESM runtime plus an origin-bound configuration bootstrap. The host API token never leaves React component state: it is not persisted, and it does not appear in the downloaded file. A unit test enforces that.

The installed runtime uses the imperative `document.modelContext.registerTool` API with abortable registration lifecycles and compact MCP content responses. It owns an incident state machine, a Shadow DOM widget that anchors itself beside the error it is offering to fix, recursive context sanitization, a visible approval gate with replay prevention, recovery verification, live progress reporting from a running recovery, and URL-fragment escalation packets. The production Vite build emits both the application and the self-hostable runtime.

### What we learned

The useful abstraction is not “let an agent click the website.” It is letting the website declare what evidence is safe, what recovery is allowed, what requires consent, and what counts as success. That turns ChatGPT from a generic answer bot into an operator the customer can understand and supervise.

### What's next

Next steps include additional verified playbooks for authentication and data synchronization, signed one-time escalation delivery, framework packages built on the universal runtime, and authenticated developer-side connectors for infrastructure incidents.

## Required answers

- Submitter Type: Individual
- Country: Israel
- App Status: New
- Live URL: https://host-whisperer.onrender.com/?view=shop
- Testing instructions: Open the live URL. No setup is needed — the plugin is installed. Click **Checkout** to reproduce the 503. Wait five seconds for the agent dialog to appear beside the error, open it, and say “Fix checkout safely” in ChatGPT. Watch the live activity timeline, approve the proposed recovery when the page asks, then let ChatGPT apply and verify it and click **Try checkout again**. To see the same page without the plugin, use **Show it without the plugin** in the demo controls. The developer's side is at `?view=integrate`.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: Google Chrome 152 with `WebMCPTesting` enabled and automated Vitest tool-contract tests. Add ChatGPT's in-app browser after the recorded interactive test.
- AI tools used: OpenAI Codex for product design, implementation, testing, deployment, and debugging; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:45

See [DEMO.md](DEMO.md) for the full beat-by-beat script. In outline:

**0:00–0:35 — The dead end.** An ordinary storefront. Click Checkout. Hold on **503 Service Unavailable**, `POST /api/checkout`, `upstream: checkout-service — no healthy instances`. Say the point: this is the store's server, not the customer's browser, and refreshing will not help. Then wait in silence for five seconds.

**0:35–0:45 — The offer.** The agent dialog animates in beside the error and nudges. Click **Ask Codex**.

**0:45–1:20 — Investigate visibly.** Say only: “Fix checkout safely.” The timeline shows safe context, a healthy storefront, an intact cart, and the failing checkout service. Note that the page shared seven allowlisted fields — no payment data, credentials, query strings, or scraped DOM.

**1:20–1:45 — Approve and repair.** Show the exact effects of **Roll back the checkout service**, click **Approve recovery**, and read the host conversation as it streams in: connect with read-only deploy scope, read deploy history, read logs, request rollback, host confirms.

**1:45–2:00 — Prove it.** Verification reports HTTP 200. The card becomes **Try checkout again**. Click it; the order confirms.

**2:00–2:40 — Behind the scenes.** The animated diagram on `/` — customer and agent, the website's REST and WebMCP sides, the host, and Host Whisperer completing the triangle — then `?view=integrate`: pick a host, connect it, download one file, one script tag.

**2:40–2:45 — Close.** “Sixty seconds of setup turns every 5xx page into something the customer's own agent can diagnose, get permission for, repair, and prove.”
