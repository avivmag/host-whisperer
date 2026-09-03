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

After that, when a customer hits a supported failure, the page offers help beside the error and registers one WebMCP delegation tool. The customer asks their own agent to hand the issue to Host Whisperer. One call privately gathers the allowlisted signals, files the report, inspects the incident, waits for visible customer approval, applies the bounded resolution, verifies the original symptom, and returns only whether the customer should retry or wait for a developer. The page shows a simple support-case timeline instead of exposing infrastructure details.

The working Big Pink demo is a storefront whose host is failing. Checkout returns **HTTP 503 Service Unavailable**. Five seconds after the error, an agent dialog animates in beside it. ChatGPT hands the issue to Host Whisperer with one WebMCP call and waits. The page shows generic progress—gathering data, filing the report, and sending it for inspection—then asks the customer to approve restoring checkout to its most recent verified version. Host Whisperer applies the simulated fix by changing the demo service state, verifies `POST /api/checkout` returns 200, and returns only “checkout is available again.” The cart is never touched and no order is placed before approval.

If a problem cannot be safely repaired in the customer page, Host Whisperer prepares a sanitized, customer-approved escalation packet for the developer. Cloud credentials and infrastructure operations never enter the customer context.

### Why WebMCP

This experience depends on the page, person, and agent sharing live state. Without WebMCP, a chatbot receives prose and guesses what happened. With WebMCP, the website exposes a precise support handoff with a bounded input, visible approval, and a minimal verified result.

Host Whisperer uses WebMCP at the point where it creates unique value: inside the installed customer website. The generated runtime registers one stateful support handoff tied to live page state, visible customer approval, developer-defined handlers, and post-action verification. This makes the existing site meaningfully better without turning the customer's agent into an infrastructure operator.

### How it was built

The configuration site is a React and TypeScript application. It stores integration profiles in IndexedDB and assembles a single-file plugin from a standalone ESM runtime plus an origin-bound configuration bootstrap. The host API token never leaves React component state: it is not persisted, and it does not appear in the downloaded file. A unit test enforces that.

The installed runtime uses the imperative `document.modelContext.registerTool` API with abortable registration lifecycles and plain structured JSON responses. It owns an incident state machine, a Shadow DOM widget that anchors itself beside the error it is offering to fix, recursive context sanitization, a visible approval gate with replay prevention, recovery verification, live progress reporting from a running recovery, and URL-fragment escalation packets. The production Vite build emits both the application and the self-hostable runtime.

### What we learned

The useful abstraction is not “let an agent click the website,” nor is it turning the customer's agent into an infrastructure operator. It is letting the website hand a bounded incident to a specialized support agent while keeping customer consent and verified success visible on the original page.

### What's next

Next steps include additional verified playbooks for authentication and data synchronization, signed one-time escalation delivery, framework packages built on the universal runtime, and authenticated developer-side connectors for infrastructure incidents.

## Required answers

- Submitter Type: Individual
- Country: Israel
- App Status: New
- Live URL: https://host-whisperer.onrender.com/?view=shop
- Testing instructions: Use the latest ChatGPT desktop app with Website Tools enabled and GPT-5.6 Sol or Terra. Open the live URL in its integrated browser. No setup is needed — the plugin is installed. Click **Checkout** to reproduce the 503. Wait five seconds for the agent dialog to appear beside the error, open it, and—while keeping that page open—tell Codex: “Ask Host Whisperer to fix checkout.” Codex makes one Website Tool call and waits while the page shows generic support progress. Click **Yes, go ahead** when asked; Host Whisperer finishes and verifies inside the same call. When Codex says checkout is available again, click **Try checkout again**. To see the same page without the plugin, use **Show it without the plugin** in the demo controls in the page footer. The developer's side is at `?view=integrate`.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: Google Chrome 152 with `WebMCPTesting` enabled and automated Vitest tool-contract tests. Add ChatGPT's in-app browser after the recorded interactive test.
- AI tools used: OpenAI Codex for product design, implementation, testing, deployment, and debugging; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:45

See [DEMO.md](DEMO.md) for the full beat-by-beat script. In outline:

**0:00–0:35 — The dead end.** An ordinary storefront. Click Checkout. Hold on **503 Service Unavailable**, `POST /api/checkout`, `upstream: checkout-service — no healthy instances`. Say the point: this is the store's server, not the customer's browser, and refreshing will not help. Then wait in silence for five seconds.

**0:35–0:45 — The offer.** The agent dialog animates in beside the error and nudges. Click **Ask Codex**.

**0:45–1:20 — Delegate visibly.** With the store open in the integrated browser, say only: “Ask Host Whisperer to fix checkout.” Codex calls one Website Tool and waits. The page shows gathering data, filing the report, and sending it for inspection; technical infrastructure details stay behind Host Whisperer.

**1:20–1:45 — Approve and resolve.** Show the customer-relevant effects of **Restore checkout service**, click **Yes, go ahead**, and read the generic progress as Host Whisperer applies and verifies it.

**1:45–2:00 — Prove it.** Verification reports HTTP 200. The card becomes **Try checkout again**. Click it; the order confirms.

**2:00–2:40 — Behind the scenes.** The animated diagram on `/` — customer and agent, the website's REST and WebMCP sides, the host, and Host Whisperer completing the triangle — then `?view=integrate`: pick a host, connect it, download one file, one script tag.

**2:40–2:45 — Close.** “Sixty seconds of setup turns every 5xx page into something the customer's own agent can hand to Host Whisperer for an approved, verified resolution.”
