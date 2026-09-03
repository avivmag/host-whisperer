# Host Whisperer

Create, debug, and operate cloud projects through conversation.

Host Whisperer is a WebMCP-native project room for indie developers. A human chooses a provider and describes a goal; an agent turns it into a visible provider plan, waits for approval, hands the action to the provider's official MCP, and records the result for later debugging and maintenance.

## Why WebMCP

Provider MCP servers can operate infrastructure, but they do not own the web page where a person reviews a plan. Host Whisperer uses WebMCP to keep the human, agent, and visible interface synchronized. The page exposes structured tools for creating rooms, preparing operations, recording provider results, and diagnosing failures. Write operations cannot pass the approval gate through an agent call—the user must click the visible approval control.

## Provider support

| Provider | Starter | Status |
| --- | --- | --- |
| AWS | Lambda API | Handoff ready |
| Google Cloud | Cloud Run service | Handoff ready |
| Cloudflare | Worker + Assets | Handoff ready |
| Vercel | Next.js app | Handoff ready |
| Netlify | Web app + Function | Handoff ready |
| Render | Static site | Live tested |
| Shopify | Hydrogen storefront | Manual CLI handoff |

These labels are deliberate: Render earned its live-tested label through the recorded failure-and-recovery proof. MCP-B is a compatibility/testing option, not a hosting provider.

## Run locally

Requirements: Node.js 22+ and a WebMCP-capable browser.

```bash
npm install
npm run dev
```

Open the page in ChatGPT's in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. In an ordinary browser the human interface works, but the page reports that WebMCP is unavailable.

## Verify

```bash
npm test
npm run build
```

The intentional Render proof fixture has two outcomes:

```bash
cd demo/render-static
npm install
npm run build # expected to fail with a missing PUBLIC_SITE_TITLE message
PUBLIC_SITE_TITLE="It shipped." npm run build # expected to pass
```

See [the demo runbook](docs/DEMO.md) for the complete create → fail → diagnose → approve → fix → redeploy flow.

## Security model

- Provider OAuth remains between the user, agent host, and official vendor MCP.
- Host Whisperer stores project rooms locally in IndexedDB and supports JSON export/import.
- Secret-like configuration keys are refused in chat-mediated fixes.
- Provider responses and logs are marked untrusted, escaped by React, length-limited, and token-redacted.
- Create, configuration, and redeploy operations require a user click before a result can be recorded.
- Source-code repairs become structured Codex handoffs; the browser app does not silently patch repositories.

## Research archive

The tracked source index and findings live in [`docs/research`](docs/research). To cache the official challenge, WebMCP, security, provider MCP, and deployment documentation locally:

```bash
npm run research:sync
```

Raw snapshots are intentionally gitignored and remain subject to their original sites' licenses and terms.

## License

[MIT](LICENSE)
