# Host Whisperer

> **Hackathon project:** This repository exists solely as an entry for [OpenAI's WebMCP Challenge](https://openai.com/webmcp-challenge/). It is a deterministic competition demo, not a production product and not intended for real-world use. See the [challenge mission, judging strategy, requirements, and deadline](docs/HACKATHON.md).

**When a website's host fails, its customers get a dead end. Host Whisperer turns that page into something their own agent can fix.**

A developer connects their hosting account and drops one JavaScript file into their site. When a customer later hits a supported failure, that page registers six WebMCP tools, and ChatGPT can inspect minimal context, run the developer's diagnostics, propose the one allowlisted recovery, wait for the customer to approve it on the page, apply it, and verify the original symptom is gone before claiming success.

The configuration product does not embed ChatGPT and does not itself need WebMCP. WebMCP belongs in the generated plugin running on the customer website.

## Live surfaces

- [How it works](https://host-whisperer.onrender.com/) — the animated nine-step flow
- [Connect your host](https://host-whisperer.onrender.com/?view=integrate) — the developer's whole setup
- [Northstar Market](https://host-whisperer.onrender.com/?view=shop) — **the demo**: the storefront with the plugin installed
- [Standalone runtime](https://host-whisperer.onrender.com/runtime/host-whisperer.js)
- [Northstar Admin](https://host-whisperer.onrender.com/?view=admin) — legacy install console, off the demo path

The live deployment may lag behind the current worktree. See [implementation status](docs/STATUS.md) before relying on it.

## Product flow

```text
Developer connects their host and drops in one file
                    ↓
Customer clicks Checkout — the host returns HTTP 503
                    ↓
Five seconds later, the page offers help beside the error
                    ↓
Customer asks their agent, in one sentence, to fix it
                    ↓
ChatGPT reads safe context and runs the developer's diagnostics
                    ↓
ChatGPT proposes the one allowlisted recovery
                    ↓
Customer approves it on the page — until then, it will not run
                    ↓
The repair runs, streaming the host conversation into the page
                    ↓
ChatGPT verifies the symptom is gone, and the retry succeeds
```

In the Northstar demo, `POST /api/checkout` returns 503 because deploy `dep-8f2c1a` of the store's checkout service is crash-looping. The only recovery rolls that service back to `dep-8e0b47`, the last deploy that passed health checks. It leaves the cart untouched, places no order, and reads no payment data. The rollback is simulated in browser state; real provider access would require narrow authenticated server-side endpoints.

## Runtime tools

- `get_support_context`
- `run_support_diagnostics`
- `prepare_recovery`
- `apply_recovery`
- `verify_recovery`
- `prepare_developer_escalation`

These tools are registered by the installed runtime in `src/runtime/index.ts`. They are bounded by exact origin, developer-supplied handlers, incident identity, visible customer consent, single-use transitions, and post-recovery verification.

## Documentation

- [Hackathon mission and submission target](docs/HACKATHON.md)
- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
- [Implementation status and next work](docs/STATUS.md)
- [Demo video script](docs/DEMO.md)
- [Devpost submission draft](docs/SUBMISSION.md)
- [Research archive](docs/research/README.md)
- [Instructions for coding agents](AGENTS.md)

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm test -- --run
npm run build
git diff --check
```

The production command builds both the React application and the self-hostable runtime at `dist/runtime/host-whisperer.js`.

Use ChatGPT's in-app browser or a WebMCP-enabled Chrome build for the real agent flow. In an ordinary browser, the installed widget provides a limited self-service fallback, but that fallback is not the primary WebMCP demonstration.

## Technology

React, TypeScript, Vite, IndexedDB, Shadow DOM, inline SVG animation, localStorage for deterministic demo state, and the imperative `document.modelContext.registerTool()` API.

## License

[MIT](LICENSE)
