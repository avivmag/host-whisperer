# Host Whisperer

Generate an AI support operator for an existing website.

Host Whisperer gives developers a framework-neutral JavaScript adapter that adds a customer Help widget and structured WebMCP tools to their site. A customer describes a problem normally; ChatGPT reads only developer-approved context, runs bounded diagnostics, explains the evidence, proposes an allowlisted recovery, waits for visible approval, and verifies the outcome.

**Product walkthrough:** [host-whisperer.onrender.com](https://host-whisperer.onrender.com)

**Developer Studio:** [host-whisperer.onrender.com/?view=integrate](https://host-whisperer.onrender.com/?view=integrate)

**Working customer demo:** [host-whisperer.onrender.com/?view=shop](https://host-whisperer.onrender.com/?view=shop)

**Northstar Admin:** [host-whisperer.onrender.com/?view=admin](https://host-whisperer.onrender.com/?view=admin)

## Why WebMCP

A conventional support widget can display canned answers or send a transcript. Host Whisperer makes the website itself agent-operable. The agent works with the same live application state and approval controls the customer can see, without guessing through the UI or receiving unrestricted access.

The project uses WebMCP twice:

1. **Studio tools** let a developer and ChatGPT configure an integration together and prepare its install bundle.
2. **Generated runtime tools** let a customer and ChatGPT investigate and recover inside the instrumented website.

The runtime registers:

- `get_support_context`
- `run_support_diagnostics`
- `prepare_recovery`
- `apply_recovery`
- `verify_recovery`
- `prepare_developer_escalation`

## Demonstrated incident

The Northstar sample store contains an intentionally outdated cart session. Checkout fails with `CART_SESSION_OUTDATED`, while the product remains in stock and the store stays healthy.

Host Whisperer identifies the incompatible session, proposes **Rebuild cart session**, and displays its exact effects. The repair cannot execute until the customer clicks the visible approval button. It then migrates only the cart state, preserves the item and quantity, and verifies checkout readiness. It never places an order or reads payment information.

Every agent action is shown in the widget's **Operator activity** timeline, making the WebMCP execution visible in the demo.

## Safety boundary

- The adapter is bound to one configured origin.
- Only developer-supplied diagnostics and recovery handlers are callable.
- Context is allowlisted and recursively sanitized.
- Credential-like fields, token-shaped content, URL queries, and DOM content are excluded.
- Recovery requires visible customer approval and cannot be replayed as a different incident.
- Success is not reported until the configured verification check passes.
- Developer escalation requires separate sharing consent and produces a sanitized URL-fragment packet; no incident backend receives it.
- Cloud credentials and provider administration remain in the developer's authenticated environment, never the customer page.

The sample shop is deterministic demonstration software. It does not impersonate Amazon, process payments, or claim installation on websites that do not include the adapter.

## Generated installation

Studio prepares two self-hostable files:

- `host-whisperer.js` — the universal ESM runtime.
- `host-whisperer-adapter.js` — origin-bound application diagnostics and recovery handlers.

The developer reviews and connects the generated handler stubs to their application, copies both files into their own public assets, and installs the adapter:

```html
<script type="module" src="/support/host-whisperer-adapter.js"></script>
```

## Run and verify

```bash
npm install
npm test
npm run build
npm run dev
```

Open the deployed app in ChatGPT's in-app browser, or in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled. Without WebMCP, the installed widget remains usable in local self-service mode.

See [docs/DEMO.md](docs/DEMO.md) for the exact judged flow and [docs/SUBMISSION.md](docs/SUBMISSION.md) for the Devpost copy and video script.

## Technology

React, TypeScript, Vite, IndexedDB, the imperative `document.modelContext.registerTool` API, and a standalone framework-neutral ESM runtime. The application and runtime are both produced by the production build.

## License

[MIT](LICENSE)
