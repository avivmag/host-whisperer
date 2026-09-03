# Devpost Submission Draft

## Project

**Name:** Host Whisperer

**Tagline:** Give your website an AI support operator.

**Live Studio:** https://host-whisperer.onrender.com

**Working demo:** https://host-whisperer.onrender.com/?view=shop

**Repository:** https://github.com/avivmag/host-whisperer

## Description

### Inspiration

When checkout breaks, customers usually see “Something went wrong.” Support receives a vague report, asks for screenshots, and tries to reconstruct browser state long after the failure. The website knows what happened, but it has no safe, structured way to collaborate with the customer's agent.

Host Whisperer lets a developer give an existing website an AI support operator.

### What it does

The Host Whisperer Studio generates a framework-neutral JavaScript adapter containing developer-approved diagnostics and recovery actions. Once installed, it adds a Help widget and WebMCP tools directly to the website.

A customer describes the symptom normally. ChatGPT reads only safe application context, runs the approved diagnostics, explains the evidence, prepares a bounded recovery, waits for the customer to approve its exact effects, applies it, and verifies the original problem is gone. Every step appears in a visible Operator activity timeline.

The working Northstar demo starts with a familiar commerce failure: headphones are in the cart, but checkout cannot read an outdated cart-session format. The operator confirms that the store is healthy and inventory is available, identifies the incompatible session, and proposes rebuilding only the cart. After approval, it preserves the item and quantity, creates a current session, and proves checkout is ready. It cannot place an order or access payment data.

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
- Testing instructions: Open the live URL in ChatGPT's in-app browser. The checkout failure is present by default. Click **Help me fix this**, then ask: “I can't buy these headphones. Find the problem and fix it safely.” Allow the agent to inspect context and run diagnostics. Ask it to prepare `rebuild_cart_session`; confirm execution fails before clicking **Approve recovery**. After approval, let it apply and verify the repair. Use **Reset broken-cart demo** to repeat.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: Google Chrome 152 with `WebMCPTesting` enabled and automated Vitest tool-contract tests. Add ChatGPT's in-app browser after the recorded interactive test.
- AI tools used: OpenAI Codex for product design, implementation, testing, deployment, and debugging; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:35

**0:00–0:15 — Show the product working.** Start on the broken checkout beside ChatGPT. Say: “This customer cannot buy their headphones. Instead of opening a ticket, they ask the website's Host Whisperer operator.”

**0:15–0:50 — Investigate.** Ask ChatGPT to find the problem safely. Keep the Help widget open while context and diagnostic events appear. Show healthy storefront, available inventory, and the outdated cart-session evidence.

**0:50–1:15 — Explain.** Let ChatGPT explain that the product and checkout service are fine, but this browser's cart uses an old format. Emphasize that payment data, credentials, URL queries, and arbitrary page content were never shared.

**1:15–1:50 — Approve and repair.** Prepare **Rebuild cart session**. Show its precise effects and the rejected pre-approval execution. Click **Approve recovery**, then let ChatGPT apply it.

**1:50–2:05 — Verify.** Show “Checkout is ready,” the Aster H1 still present, no order placed, and the completed Operator activity timeline.

**2:05–2:25 — Developer experience.** Jump to Studio. Show the configuration, generated adapter, runtime download, and Studio's own WebMCP tools.

**2:25–2:35 — Close.** “Host Whisperer lets developers define the boundaries once, then gives every customer an AI operator inside the website where the problem actually happens.”
