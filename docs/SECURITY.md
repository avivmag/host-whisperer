# Security Model

## Trust zones

### Customer browser

Untrusted for provider credentials and broad administrative authority. It may hold ordinary customer session state and expose only the minimum context needed for the active support incident.

### Browser agent

Allowed to discover and invoke the tools registered by the active page. It is not automatically trusted to perform consequential actions. Tool input, order, incident identity, and approval must be validated by the runtime and backend.

### Website backend

Trusted to authenticate the customer, enforce tenant and resource scope, call provider integrations, and return sanitized results. This layer does not yet exist in the deterministic demo.

### Developer/operator environment

Trusted for installation, provider authorization, playbook selection, and high-impact maintenance. These capabilities must not leak into customer-facing tools.

## Security invariants

1. Exact origin binding: the runtime refuses to start outside the configured origin.
2. Explicit capability lists: only configured diagnostics and actions become callable.
3. Minimal context: callbacks provide selected fields; the runtime does not scrape arbitrary DOM content.
4. Recursive sanitization: secret-like keys are removed, token-shaped strings are redacted, and URL queries/fragments are stripped from contextual paths.
5. Bounded inputs and outputs: descriptions, results, arrays, tool counts, and escalation packets have size limits.
6. Incident binding: every call after context creation must present the active incident ID.
7. Diagnosis before repair: a recovery cannot be prepared before a failing diagnostic exists.
8. Visible consent: a prepared recovery cannot run until the customer approves the exact action in the page.
9. Single-use transition: recovery runs only from `awaiting_approval`; replay after execution is rejected.
10. Verification: the runtime never reports recovery until the configured verification function succeeds.
11. Separate escalation consent: preparing a report does not reveal its link until the customer approves sharing.
12. No browser credentials: cloud and hosting credentials are never generated into the adapter or returned to the agent.

## Hosting-access boundary

“Access to hosting” must mean access to narrowly designed support operations, not provider-console equivalence.

Acceptable examples:

- Read a sanitized health result for the current service
- Retry a failed user-scoped job
- Refresh a stale session
- Purge a cache entry scoped to the current tenant or resource
- Request a rollback proposal for developer approval

Unacceptable customer-side examples:

- Execute arbitrary CLI or shell commands
- Read environment variables or raw logs
- List provider credentials
- Restart, delete, or redeploy an unrestricted service
- Change account-level infrastructure

## Backend requirements for future provider playbooks

- Provider OAuth or API credentials stored encrypted on the server
- Customer and tenant authorization on every call
- Named endpoints rather than arbitrary commands
- Idempotency keys for mutations
- Rate limits and abuse detection
- Audit log containing actor, incident, action, target, and outcome
- Sanitized provider responses
- Confirmation proportional to blast radius
- Developer-only workflow for global or destructive operations

## Escalation packet

The demo encodes its sanitized packet into a URL fragment. Fragments are not normally sent in HTTP requests, but they may still be copied, logged by client code, captured in screenshots, or exposed by extensions. The packet is therefore bounded, contains no credentials by design, and is labeled `customer_supplied_untrusted_evidence`.

Production should use a signed, expiring, one-time report stored behind authenticated developer access.

## Known limitations

- The demo repair changes localStorage rather than calling a real backend.
- The demo installation state is same-origin localStorage, not an authenticated deployment.
- The current runtime supports only one active incident per page instance.
- Agent identity is not used as an authorization boundary.
