# Product Specification

## One-sentence proposition

Host Whisperer lets developers generate and install a safe WebMCP support layer so customers can ask their browser agent to diagnose and resolve supported website problems where those problems occur.

## Problem

Web applications usually handle customer-facing failures with a generic message and a support link. The customer lacks technical context, support receives an incomplete report, and the website's useful live state disappears before anyone investigates it.

The website already knows the route, application version, error code, session state, and safe recovery options. It needs a structured, constrained way to share only the relevant evidence and actions with the customer's agent.

## Users

### Plugin operator

The person using Host Whisperer to configure an integration. They choose the target origin, application identity, support playbook, diagnostics, recoveries, and safety policy.

### Store developer

The owner of the target website and its trusted backend. They review the generated files and capabilities, connect handler stubs to application logic, and install the plugin.

### Customer

The person experiencing a problem on the installed website. They describe the symptom in normal language, supervise the agent's work, approve consequential actions, and see the verified result.

### Browser agent

ChatGPT or another WebMCP-capable browser agent. It discovers the tools registered by the active customer page and calls them in the supported order.

## End-to-end flow

1. A customer encounters a normal website error. Before installation, the website offers no Host Whisperer control.
2. An operator opens Host Whisperer and configures a support integration using a normal developer form.
3. Host Whisperer generates a runtime and an origin-bound adapter containing developer-selected diagnostics and recovery handlers.
4. The store developer receives the package in Northstar Admin, reviews its requested capabilities, and installs it.
5. The same customer-facing website now registers WebMCP tools after the relevant problem occurs.
6. The customer opens the page in a WebMCP-capable browser and asks ChatGPT for help.
7. ChatGPT reads safe context and runs the configured diagnostics.
8. ChatGPT explains the evidence and prepares an allowlisted recovery.
9. The customer sees the exact effects and approves the action in the website.
10. ChatGPT applies the recovery and verifies the original symptom is gone.
11. If recovery is unavailable or verification fails, the customer may approve a sanitized developer escalation.

## Demo scenario

Northstar Market contains an Aster H1 headphone cart using session schema version 1 while checkout expects version 2. The plugin exposes three diagnostics:

- Storefront and checkout reachability
- Inventory availability
- Cart-session compatibility

The only recovery is `rebuild_cart_session`. It creates a version 2 cart while preserving the original SKU and quantity. It cannot place an order or access payment information.

## Scope

The product supports problems for which the developer has explicitly supplied diagnostics and recovery actions. It is a generator and runtime for safe support contracts, not a universal autonomous operator.

### In scope

- Page/session context selected by the developer
- Safe client-side diagnostics
- Narrow calls to authenticated application endpoints
- Explicitly allowlisted recovery actions
- Visible approval for consequential actions
- Post-action verification
- Sanitized escalation

### Out of scope

- Arbitrary browser automation
- General shell or CLI access
- Raw cloud-provider access from customer JavaScript
- Credentials inside generated adapters
- Unrestricted infrastructure changes
- Guaranteed repair of unknown problems
- An embedded ChatGPT clone inside Host Whisperer

## Product language

Use precise claims:

- “Solve supported problems” instead of “solve any problem.”
- “Generate an integration package” instead of “install on any website automatically.”
- “Developer-approved tools” instead of “access to your hosting.”
- “Ask ChatGPT in a WebMCP-capable browser” instead of implying a webpage can inject a message into ChatGPT.

## Success criteria

- A fresh customer page shows no Host Whisperer UI before installation.
- The checkout error appears only after the customer clicks Checkout.
- The Integration Studio contains no ChatGPT button, WebMCP connection status, or registered tools.
- Host Whisperer generates a reviewable adapter and runtime package.
- Northstar Admin is the only demo surface that marks the plugin installed.
- After installation, the customer page exposes six WebMCP tools.
- A customer can complete diagnosis, consent, recovery, and verification in one coherent browser-agent session.
- No secret or payment data is exposed at any point.

