# Host Whisperer

Host Whisperer generates a safe WebMCP support layer for an existing website.

A developer configures and installs a framework-neutral plugin. When a customer later experiences a supported problem, ChatGPT can use the tools registered by that customer page to inspect minimal context, run diagnostics, propose an allowlisted recovery, wait for visible approval, apply it, and verify the result.

The configuration product does not embed ChatGPT and does not itself need WebMCP. WebMCP belongs in the generated plugin running on the customer website.

## Live surfaces

- [Product walkthrough](https://host-whisperer.onrender.com/)
- [Host Whisperer Integration Studio](https://host-whisperer.onrender.com/?view=integrate)
- [Northstar Admin](https://host-whisperer.onrender.com/?view=admin)
- [Northstar Market](https://host-whisperer.onrender.com/?view=shop)
- [Standalone runtime](https://host-whisperer.onrender.com/runtime/host-whisperer.js)

The live deployment may lag behind the current worktree. See [implementation status](docs/STATUS.md) before relying on it.

## Product flow

```text
Customer encounters an ordinary website error
                    ↓
Developer configures Host Whisperer
                    ↓
Host Whisperer generates adapter + runtime
                    ↓
Store developer installs them through Northstar Admin
                    ↓
Customer page registers WebMCP support tools
                    ↓
ChatGPT diagnoses, requests approval, repairs, and verifies
```

The Northstar demo uses an outdated cart session. The recovery migrates only the cart schema, preserves the original product and quantity, and cannot place an order or access payment information.

## Runtime tools

- `get_support_context`
- `run_support_diagnostics`
- `prepare_recovery`
- `apply_recovery`
- `verify_recovery`
- `prepare_developer_escalation`

These tools are registered by the installed runtime in `src/runtime/index.ts`. They are bounded by exact origin, developer-supplied handlers, incident identity, visible customer consent, single-use transitions, and post-recovery verification.

## Documentation

- [Product specification](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security model](docs/SECURITY.md)
- [Implementation status and next work](docs/STATUS.md)
- [Demo runbook](docs/DEMO.md)
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

React, TypeScript, Vite, IndexedDB, Shadow DOM, localStorage for deterministic demo state, and the imperative `document.modelContext.registerTool()` API.

## License

[MIT](LICENSE)
