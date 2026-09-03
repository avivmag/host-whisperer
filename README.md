# Host Whisperer

Your AI operator for when software breaks.

Host Whisperer lets a non-expert describe a production problem in plain English. The agent investigates the existing deployment with the provider's official MCP, explains the likely cause, prepares the smallest repair, waits for human approval, and verifies that the original symptom is gone.

**Live app:** [host-whisperer.onrender.com](https://host-whisperer.onrender.com)

## The missing layer between chat and provider MCPs

Provider MCP servers expose infrastructure operations. They do not provide a durable incident workflow or the web interface where a person can understand what the agent found and control what happens next.

Host Whisperer adds that operating layer:

1. **Report** — the user describes the symptom without knowing cloud terminology.
2. **Investigate** — the agent inspects status, logs, and health through read-only provider tools.
3. **Explain** — evidence becomes a concise, plain-English diagnosis with a confidence level.
4. **Approve** — a configuration or redeploy repair appears in the page for human approval.
5. **Verify** — the agent checks the original symptom and records the recovery.

WebMCP keeps this incident state shared between the human interface and the agent. The page exposes structured tools for reporting incidents, preparing evidence checks, recording provider evidence, explaining diagnoses, preparing repairs, and verifying recovery.

## WebMCP safety properties

- Read-only evidence checks do not require approval.
- Mutating execution handoffs are withheld from WebMCP responses until the user clicks the visible approval control.
- Provider logs are untrusted data, never agent instructions.
- Secret-like configuration keys are refused in chat-mediated repairs.
- Token-shaped content is redacted and long output is truncated.
- A mutating provider result cannot be recorded before visible approval.
- Source-code incidents become structured Codex repair briefs.

The approval flow coordinates the Host Whisperer workflow; it is not a cryptographic restriction on provider tools an agent might access independently.

## Provider connections

| Provider | Project type | Status |
| --- | --- | --- |
| AWS | Lambda API | Handoff ready |
| Google Cloud | Cloud Run service | Handoff ready |
| Cloudflare | Worker + Assets | Handoff ready |
| Vercel | Next.js app | Handoff ready |
| Netlify | Web app + Function | Handoff ready |
| Render | Static site | Live tested |
| Shopify | Hydrogen storefront | Manual CLI handoff |

These are connection recipes, not provider rankings or claims of identical support. Render earned its live-tested label through the recorded failure, diagnosis, repair, and recovery proof. MCP-B is a compatibility/testing option, not a hosting provider.

## Run locally

Requirements: Node.js 22+ and a WebMCP-capable browser.

```bash
npm install
npm run dev
```

Open the page in ChatGPT's in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. The human interface remains usable without WebMCP, but agent tools are unavailable.

## Verify

```bash
npm test
npm run build
```

The intentional Render incident fixture has two outcomes:

```bash
cd demo/render-static
npm install
npm run build # expected to fail with a missing PUBLIC_SITE_TITLE message
PUBLIC_SITE_TITLE="It shipped." npm run build # expected to pass
```

See [the demo runbook](docs/DEMO.md) for the plain-English report → investigate → explain → approve → repair → verify flow.

## Persistence and credentials

- Provider OAuth remains between the user, agent host, and official vendor MCP.
- Host Whisperer stores incident rooms locally in IndexedDB and supports JSON export/import.
- The application does not store cloud credentials.
- External content is escaped by React before it is rendered.

## Research archive

The tracked source index and findings live in [`docs/research`](docs/research). To cache the official challenge, WebMCP, security, provider MCP, and deployment documentation locally:

```bash
npm run research:sync
```

Raw snapshots are intentionally gitignored and remain subject to their original sites' licenses and terms.

## License

[MIT](LICENSE)
