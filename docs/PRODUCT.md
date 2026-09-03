# Product Specification

> This specification describes the product fiction used for the WebMCP Challenge demonstration. Host Whisperer is being built solely for that hackathon and is not intended for production or post-hackathon use. Competition goals and requirements are authoritative in [HACKATHON.md](HACKATHON.md).

## One-sentence proposition

Host Whisperer lets developers install a safe WebMCP support layer in one file, so that when their host fails, a stranded customer can ask their browser agent to delegate the issue, approve a bounded resolution, and retry after Host Whisperer verifies it — on the page where the failure happened.

## Problem

When a website's host fails, the customer gets a generic message and a support link. The failure is not theirs to fix and not theirs to understand: they cannot see which service is down, they cannot tell a retry from a real outage, and the website's useful live state disappears before anyone investigates it. Support receives an incomplete report hours later.

The website already knows the route, application version, error code, session state, and safe recovery options. It needs a structured, constrained way to hand that evidence to Host Whisperer without making the customer's agent interpret infrastructure details.

## Users

### Plugin operator

The developer who runs the website. On the connect page they name their origin, pick their host, connect the hosting account, and download one JavaScript file to drop into their pages. That file carries the private diagnostics and the single recovery Host Whisperer is allowed to propose.

### Customer

The person experiencing a problem on the installed website. They describe the symptom in normal language, supervise the agent's work, approve consequential actions, and see the verified result.

### Browser agent

ChatGPT or another WebMCP-capable browser agent. It discovers the single support handoff registered by the active customer page, delegates the issue, waits, and repeats the customer-safe outcome.

## End-to-end flow

1. A customer clicks Checkout and the website's host fails the request with HTTP 503. The page can report the failure but cannot help.
2. Five seconds later, the installed plugin offers help beside the error: a small agent dialog that nudges for attention.
3. With the store still open in the integrated browser, the customer tells their agent: **"Ask Host Whisperer to fix checkout."** The page's single Website Tool gives that request an unambiguous delegation target.
4. ChatGPT calls the single `ask_host_whisperer_to_fix_issue` WebMCP tool. It does not inspect source code, the DOM, network logs, other integrations, or the web.
5. Inside that call, Host Whisperer gathers the allowlisted context, files a support report, and inspects it. Technical evidence stays inside the runtime; the customer sees only generic support-case progress.
6. The website shows the customer-relevant effects of the bounded resolution. The WebMCP call remains pending until the customer clicks **Yes, go ahead**.
7. Host Whisperer applies the developer-approved resolution, streams generic progress, and verifies the original symptom internally.
8. The tool returns only `resolved` or `needs_developer` plus a short customer message. ChatGPT tells the customer to retry only after a verified resolution.
9. The customer retries checkout and the order goes through.
10. If recovery is unavailable or verification fails, the customer may approve a sanitized developer escalation instead of being told the problem is solved.

The developer's side of this is one page and one file: connect the host, download the plugin, add one `<script>` tag.

## Demo scenario

Big Pink — an inflatable-flamingo store — has one Gerald XL flamingo in the cart. Checkout fails with **HTTP 503 Service Unavailable** because deploy `dep-8f2c1a` of the store's `checkout-service` is crash-looping (OOMKilled) on its host. This is deliberately a *server* failure: the customer did nothing wrong, and no amount of retrying or cache-clearing will help.

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
- The customer page exposes one high-level WebMCP delegation tool; implementation details remain inside Host Whisperer.
- A customer can complete diagnosis, consent, recovery, verification, and a successful retry in one coherent browser-agent session.
- No secret or payment data is exposed at any point.
