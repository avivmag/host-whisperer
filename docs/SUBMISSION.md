# Devpost Submission Draft

## Project

**Name:** Host Whisperer

**Tagline:** Give your website an AI support operator.

**Product walkthrough:** https://host-whisperer.onrender.com

**Live Studio:** https://host-whisperer.onrender.com/?view=integrate

**Working demo:** https://host-whisperer.onrender.com/?view=shop

**Repository:** https://github.com/avivmag/host-whisperer

## Description

### Inspiration

When checkout breaks, customers usually see “Something went wrong.” Support receives a vague report, asks for screenshots, and tries to reconstruct browser state long after the failure. The website knows what happened, but it has no safe, structured way to collaborate with the customer's agent.

Host Whisperer lets a developer give an existing website an AI support operator.

### What it does

The Host Whisperer Studio generates a framework-neutral JavaScript adapter containing developer-approved diagnostics and recovery actions. Once installed, it adds a Help widget and WebMCP tools directly to the website.

A customer describes the symptom normally. ChatGPT reads only safe application context, runs the approved diagnostics, explains the evidence, prepares a bounded recovery, waits for the customer to approve its exact effects, applies it, and verifies the original problem is gone. Every step appears in a visible Operator activity timeline.

The working Northstar demo shows the complete before-and-after journey. It begins without Host Whisperer: headphones are in the cart, checkout cannot read an outdated cart-session format, and the customer receives only a generic error. The developer moves to Studio, configures the safe boundary, generates the adapter, and visibly installs it on the demo store. When they return, the same broken website now has an AI support control. ChatGPT confirms that the store is healthy and inventory is available, identifies the incompatible session, and proposes rebuilding only the cart. After approval, it preserves the item and quantity, creates a current session, and proves checkout is ready. It cannot place an order or access payment data.

If a problem cannot be safely repaired in the customer page, Host Whisperer prepares a sanitized, customer-approved escalation packet for the developer. Cloud credentials and infrastructure operations never enter the customer context.

### Why WebMCP

This experience depends on the page, person, and agent sharing live state. Without WebMCP, a chatbot receives prose and guesses what happened. With WebMCP, the website exposes precise diagnostic and recovery capabilities with JSON Schemas and enforced boundaries.

Host Whisperer uses WebMCP at two levels. Studio tools let a developer configure the integration together with ChatGPT. The generated runtime then registers support tools inside the customer's website. This makes the installed site meaningfully better when its customer and agent use it together.

### How it was built

The Studio is a React and TypeScript application. It stores integration profiles in IndexedDB and generates an origin-bound adapter plus a standalone ESM runtime. Both Studio and runtime use the imperative `document.modelContext.registerTool` API with abortable registration lifecycles and compact MCP content responses.

The runtime owns an incident state machine, a Shadow DOM widget, recursive context sanitization, a visible approval gate, recovery verification, and URL-fragment escalation packets. The production Vite build emits both the Studio application and the self-hostable runtime.

### What we learned

The useful abstraction is not “let an agent click the website.” It is letting the website declare what evidence is safe, what recovery is allowed, what requires consent, and what counts as success. That turns ChatGPT from a generic answer bot into an operator the customer can understand and supervise.

### What's next

Next steps include additional verified playbooks for authentication and data synchronization, signed one-time escalation delivery, framework packages built on the universal runtime, and authenticated developer-side connectors for infrastructure incidents.

## Required answers

- Submitter Type: Individual
- Country: Israel
- App Status: New
- Live URL: https://host-whisperer.onrender.com/?view=shop
- Testing instructions: Open the live Northstar URL and click **Restart full story** if needed. Click Checkout to reproduce the generic error; no developer configuration is exposed on the customer site. Separately open the Host Whisperer Studio at `?view=integrate`, generate the support plugin, and install it on the Northstar demo. Return to Northstar and click Checkout again. The new **Ask AI to fix this** control appears. Open it and say “Fix checkout safely” in ChatGPT. Watch the live activity timeline, approve the proposed recovery in the page, then let ChatGPT apply and verify it.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: Google Chrome 152 with `WebMCPTesting` enabled and automated Vitest tool-contract tests. Add ChatGPT's in-app browser after the recorded interactive test.
- AI tools used: OpenAI Codex for product design, implementation, testing, deployment, and debugging; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:35

**0:00–0:20 — Start before installation.** Open Northstar, reproduce the broken checkout, and show that the customer has only a generic error. Say: “This customer is stuck, and this website has no safe way for an AI to help yet.”

**0:20–0:55 — Configure and install.** Separately open the developer-only Host Whisperer Studio, show the app boundary and verified playbook, generate the adapter, then click **Install on Northstar demo**. Briefly show the real download and install-tag controls beside the demo shortcut.

**0:55–1:10 — Show the transformation.** Return to Northstar and click Checkout again. The same error occurs, but **Ask AI to fix this** now appears. Open it and tell ChatGPT only: “Fix checkout safely.”

**1:10–1:45 — Investigate visibly.** Keep the widget open while the animated timeline shows safe context, healthy storefront, available inventory, and the outdated cart-session evidence. Explain that no payment data, credentials, URL queries, or arbitrary DOM content were shared.

**1:45–2:10 — Approve and repair.** Show the precise effects of **Rebuild cart session**, click **Approve recovery**, and let ChatGPT apply and verify it.

**2:10–2:25 — Prove the result.** Show **Everything is running smoothly**, the Aster H1 still present, no order placed, and the completed activity timeline.

**2:25–2:35 — Close.** “Host Whisperer turns a website that can only report an error into one that can safely help ChatGPT diagnose, repair, and verify it.”
