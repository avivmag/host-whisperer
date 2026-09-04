# Implementation Status

Last audited: 2026-09-03

## Hackathon priority

This repository exists solely for OpenAI's WebMCP Challenge. The governing objective, rubric, submission requirements, and freeze policy are in [HACKATHON.md](HACKATHON.md). The submission deadline is September 4, 2026 at 1:00 AM PT (11:00 AM IDT), following the Devpost extension. Until submission, incomplete judged artifacts and live end-to-end verification take priority over production-oriented work.

## Repository state at audit

- Branch: `main`
- Last committed revision: `8e7d33d`
- The demo rework described below is present as uncommitted changes in `src/App.tsx`, `src/studio.ts`, `src/runtime/index.ts`, `src/styles.css`, both test files, and the documentation.
- Validation after the Website Tool routing fix: 14 tests passed across 3 files, and both builds passed (`dist/assets/index-*.js` and `dist/runtime/host-whisperer.js`, 21.44 kB).
- The rework had not been deployed at the time of the audit.

## Verified in the browser

Before the latest delegation change, the flow was checked at 1440px against `npm run dev`, and the plugin download was re-checked against the production build served by `vite preview`. The new one-tool handoff is unit- and build-verified but still needs a final run in ChatGPT's in-app browser:

- `/?view=shop` — Checkout produces the 503 card; the agent dialog appears five seconds later, anchored beside the error, and nudges. It falls back to the bottom-right corner at 760px.
- The runtime now registers one high-level tool. The intended sequence is: ChatGPT delegates once → Host Whisperer gathers and inspects privately → **it applies the one allowlisted repair without asking** → Host Whisperer verifies internally → ChatGPT receives only the retry message.
- `/` — the diagram auto-plays all seven steps; the tone changes to red on failure steps and mint on recovery; the customer's face changes with it.
- `/?view=about` — gives a concise project introduction, clearly labels simulated host operations, links to the walkthrough and live demo, and identifies the creator.
- `/?view=integrate` — the Big Pink URL and a disposable demo token are prefilled. Connecting removes the token field, repeats the selected provider's reviewed permissions in the success card, and enables the download. The typed token appears in neither `localStorage`, `sessionStorage`, IndexedDB, nor the downloaded plugin.
- The production download is one self-contained JavaScript file containing `registerTool` and no credentials.

## Implemented

- 5xx host-outage incident: `POST /api/checkout` 503, crash-looping deploy, bounded rollback, verified retry
- Delayed, error-anchored, nudging agent dialog (`revealDelayMs` and `anchorTo` on the runtime config)
- Storefront-load WebMCP registration with failure-activated UI, refresh-resilient incident display, and an immediate flamingo progress bar during agent work
- Live streaming of the Host Whisperer ↔ host exchange into the customer's timeline (`report` callback on a recovery action)
- Animated seven-step inline-SVG flow diagram with auto-play, step list, and prev/next/pause
- Website integration page: architecture diagram, host dropdown without AWS, provider-specific permission preview, prefilled demo token, simulated handshake without a token fingerprint, one-file plugin download, install tag
- Plugin installed by default, so the demo needs no setup; before/after still available in demo controls
- One runtime WebMCP delegation tool, registered only by the installed customer runtime
- Single uninterrupted call: `resolve_store_issue` inspects, repairs, and verifies internally without another chat message or any customer prompt
- Registration-aware UI: the panel says connected only after `registerTool()` succeeds and gives current model/settings guidance if registration fails
- Stable same-document registration: runtime remounts transfer the existing tool handler instead of unregistering and re-registering it
- Safe-context filtering and output limits
- Incident-bound repairs, replay prevention, and post-recovery verification
- Sanitized escalation preview and URL-fragment packet
- Separate standalone ESM runtime build
- Automated tests for the surfaces, the token boundary, the runtime contract, and the security helpers
- Render static-site configuration
- `prefers-reduced-motion` guards on the diagram and the dialog

## Known limits

- The rollback and the host handshake are simulated in browser state. No provider API is contacted. Real provider access would require narrow authenticated server-side endpoints with credentials held on the server.
- Under `npm run dev`, the plugin download falls back to a two-file form, because the built runtime is not served there. The production build serves `/runtime/host-whisperer.js`, and the download is then a single self-contained file. Record the developer segment against a build if the single-file claim matters on camera.
- `/?view=admin` still works but is off the demo path and out of navigation.

## Next sequence

1. Review the diff and commit it in coherent commits.
2. Run the complete journey once more in ChatGPT's in-app browser, not only in Chrome.
3. Push to `main` only after review; Render deploys from `main`.
4. Verify all live routes and the standalone runtime artifact.
5. Record the video against [DEMO.md](DEMO.md).
6. Update Devpost text and media only after the live behavior matches this documentation.
