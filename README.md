# Host Whisperer

> **Hackathon project:** This repository exists solely as an entry for [OpenAI's WebMCP Challenge](https://openai.com/webmcp-challenge/). It is a deterministic competition demo, not a production product and not intended for real-world use. See the [challenge mission, judging strategy, requirements, and deadline](docs/HACKATHON.md).

**When a website's host fails, its customers get a dead end. Host Whisperer turns that page into something their own agent can fix.**

A developer connects their hosting account and drops one JavaScript file into their site. When a customer later hits a supported failure, that page registers one WebMCP handoff. ChatGPT delegates the support request to Host Whisperer, which privately gathers the approved signals, inspects the incident, waits for visible customer approval, applies the one allowlisted resolution, verifies it, and returns only what the customer needs to know.

The configuration product does not embed ChatGPT and does not itself need WebMCP. WebMCP belongs in the generated plugin running on the customer website.

## Live surfaces

- [How it works](https://host-whisperer.onrender.com/) — the animated seven-step flow
- [About](https://host-whisperer.onrender.com/?view=about) — project context, prototype limitations, video, and creator
- [Connect your host](https://host-whisperer.onrender.com/?view=integrate) — the developer's whole setup
- [Big Pink](https://host-whisperer.onrender.com/?view=shop) — **the demo**: the storefront with the plugin installed
- [Standalone runtime](https://host-whisperer.onrender.com/runtime/host-whisperer.js)
- [Big Pink Admin](https://host-whisperer.onrender.com/?view=admin) — legacy install console, off the demo path

The live deployment may lag behind the current worktree. See [implementation status](docs/STATUS.md) before relying on it.

## Product flow

```text
Developer connects their host and drops in one file
                    ↓
Customer clicks Checkout — the host returns HTTP 503
                    ↓
Five seconds later, the page offers help beside the error
                    ↓
With the page open in the integrated browser, customer asks:
“Ask Host Whisperer to fix checkout.”
                    ↓
ChatGPT delegates one support request through WebMCP
                    ↓
Host Whisperer gathers data, files the report, and inspects it privately
                    ↓
Customer approves it on the page — until then, it will not run
                    ↓
Host Whisperer applies and verifies the developer-approved resolution
                    ↓
ChatGPT receives “resolved,” and the customer retries successfully
```

In the Big Pink demo, `POST /api/checkout` returns 503 because deploy `dep-8f2c1a` of the store's checkout service is crash-looping. The only recovery rolls that service back to `dep-8e0b47`, the last deploy that passed health checks. It leaves the cart untouched, places no order, and reads no payment data. The rollback is simulated in browser state; real provider access would require narrow authenticated server-side endpoints.

## Runtime tool

- `ask_host_whisperer_to_fix_issue`

The installed runtime registers this tool in `src/runtime/index.ts`. The tool delegates to a deterministic support agent inside the runtime and returns only a resolved-or-escalated customer message. The internal workflow remains bounded by exact origin, developer-supplied handlers, visible customer consent, a single-use recovery transition, and post-recovery verification.

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
