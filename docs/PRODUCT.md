# Product Specification

> This specification describes the product fiction used for the WebMCP Challenge demonstration. Host Whisperer is being built solely for that hackathon and is not intended for production or post-hackathon use. Competition goals and requirements are authoritative in [HACKATHON.md](HACKATHON.md).

## One-sentence proposition

Host Whisperer lets developers install a safe WebMCP support layer in one file, so that when their host fails, a stranded customer can ask their own browser agent to diagnose it, approve a bounded repair, and watch it verified — on the page where the failure happened.

## Problem

When a website's host fails, the customer gets a generic message and a support link. The failure is not theirs to fix and not theirs to understand: they cannot see which service is down, they cannot tell a retry from a real outage, and the website's useful live state disappears before anyone investigates it. Support receives an incomplete report hours later.

The website already knows the route, application version, error code, session state, and safe recovery options. It needs a structured, constrained way to share only the relevant evidence and actions with the customer's agent.

## Users

### Plugin operator

The developer who runs the website. On the connect page they name their origin, pick their host, connect the hosting account, and download one JavaScript file to drop into their pages. That file carries the diagnostics and the single recovery their customers' agents are allowed to propose.

### Customer

The person experiencing a problem on the installed website. They describe the symptom in normal language, supervise the agent's work, approve consequential actions, and see the verified result.

### Browser agent

ChatGPT or another WebMCP-capable browser agent. It discovers the tools registered by the active customer page and calls them in the supported order.

## End-to-end flow

1. A customer clicks Checkout and the website's host fails the request with HTTP 503. The page can report the failure but cannot help.
2. Five seconds later, the installed plugin offers help beside the error: a small agent dialog that nudges for attention.
3. The customer opens it and asks their agent, in one sentence, to fix checkout.
4. ChatGPT reads safe context through `get_support_context` and runs the developer's diagnostics through `run_support_diagnostics`.
5. ChatGPT explains the evidence — the storefront and cart are healthy; one deploy of the checkout service is crash-looping — and calls `prepare_recovery` for the only allowlisted action.
6. The website shows the exact effects of that action. The customer approves it on the page. Until they do, `apply_recovery` refuses.
7. `apply_recovery` runs, and the Host Whisperer ↔ host exchange streams into the customer's activity timeline as it happens: connect, read deploy history, read logs, request rollback, host confirms.
8. `verify_recovery` re-checks the original symptom. Only then is success reported, and the page invites the customer to retry.
9. The customer retries checkout and the order goes through.
10. If recovery is unavailable or verification fails, the customer may approve a sanitized developer escalation instead of being told the problem is solved.

The developer's side of this is one page and one file: connect the host, download the plugin, add one `<script>` tag.

## Demo scenario

Northstar Market has one Aster H1 headphone in the cart. Checkout fails with **HTTP 503 Service Unavailable** because deploy `dep-8f2c1a` of the store's `checkout-service` is crash-looping (OOMKilled) on its host. This is deliberately a *server* failure: the customer did nothing wrong, and no amount of retrying or cache-clearing will help.

The plugin exposes three diagnostics:

- Storefront health — pass; pages and assets serve normally
- Cart contents — pass; the cart is intact
- Checkout service — **fail**; 503 on 14 consecutive attempts, deploy `dep-8f2c1a` crash-looping

The only recovery is `roll_back_checkout_service`. It restores `dep-8e0b47`, the last deploy that passed health checks. It leaves the cart exactly as it is, places no order, and reads no payment data. It reports each step of its conversation with the host as it happens, so the customer watches the repair rather than waiting on a spinner.

The repair is simulated in browser state. Real provider access would require the server-side design described under Out of scope.

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

- The checkout error appears only after the customer clicks Checkout, and reads unmistakably as a 5xx server fault.
- No Host Whisperer control appears until five seconds after the error, and then it appears beside the error.
- Turning the plugin off restores a genuine dead end, with no agent offer at all.
- The connect page contains no ChatGPT button, WebMCP connection status, or registered tools.
- The downloaded plugin contains the runtime and the developer's configuration, and contains no credentials.
- The customer page exposes six WebMCP tools.
- A customer can complete diagnosis, consent, recovery, verification, and a successful retry in one coherent browser-agent session.
- No secret or payment data is exposed at any point.
