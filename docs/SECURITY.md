# Security Model

## Trust zones

### Customer browser

Untrusted for provider credentials and broad administrative authority. It may hold ordinary customer session state and expose only the minimum context needed for the active support incident.

### Browser agent

Allowed to discover and invoke the support handoff registered by the active page. It is not trusted with technical evidence or consequential-action authority. Incident state, action selection, execution, and verification remain inside the runtime and backend.

### Website backend

Trusted to authenticate the customer, enforce tenant and resource scope, call provider integrations, and return sanitized results. This layer does not yet exist in the deterministic demo.

### Developer/operator environment

Trusted for installation, provider authorization, playbook selection, and high-impact maintenance. These capabilities must not leak into customer-facing tools.

## Security invariants

1. Exact origin binding: the runtime refuses to start outside the configured origin.
2. One narrow handoff: the browser agent can request support but cannot invoke individual diagnostics or recovery actions.
3. Minimal context: callbacks provide selected fields; the runtime does not scrape arbitrary DOM content.
4. Recursive sanitization: secret-like keys are removed, token-shaped strings are redacted, and URL queries/fragments are stripped from contextual paths.
5. Bounded inputs and outputs: the issue description is bounded, and WebMCP returns only a status plus customer message.
6. Private incident binding: the runtime owns the active incident ID and never exposes it to the browser agent.
7. Diagnosis before repair: a recovery cannot be prepared before a failing diagnostic exists.
8. Developer-time consent: only the exact actions the developer allowlisted in the installed plugin can ever run; the runtime cannot invent one.
9. Single-use transition: recovery runs only from `repairing`, once per prepared incident; replay after execution is rejected.
10. Verification: the runtime never reports recovery until the configured verification function succeeds.
11. Honest escalation: an unavailable or unverified resolution returns `needs_developer`; it never becomes a false success.
12. No browser credentials: cloud and hosting credentials are never generated into the adapter or returned to the agent.

## Hosting-access boundary

“Access to hosting” must mean access to narrowly designed support operations, not provider-console equivalence.

Acceptable examples:

- Read a sanitized health result for the current service
- Retry a failed user-scoped job
- Refresh a stale session
- Purge a cache entry scoped to the current tenant or resource
- Request a rollback within the developer's allowlist

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
