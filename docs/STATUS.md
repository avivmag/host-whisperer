# Implementation Status

Last audited: 2026-09-03

## Hackathon priority

This repository exists solely for OpenAI's WebMCP Challenge. The governing objective, rubric, submission requirements, and freeze policy are in [HACKATHON.md](HACKATHON.md). The submission deadline is September 3, 2026 at 1:00 PM PT (11:00 PM IDT). Until submission, incomplete judged artifacts and live end-to-end verification take priority over production-oriented work.

## Repository state at audit

- Branch: `main`
- Last committed revision: `8e7d33d`
- The demo rework described below is present as uncommitted changes in `src/App.tsx`, `src/studio.ts`, `src/runtime/index.ts`, `src/styles.css`, both test files, and the documentation.
- Validation after the rework: `npx tsc -b` clean, 13 tests passed across 3 files, and both builds passed (`dist/assets/index-*.js` and `dist/runtime/host-whisperer.js`, 22.34 kB).
- The rework had not been deployed at the time of the audit.

## Verified in the browser

Checked at 1440px against `npm run dev`, and the plugin download re-checked against the production build served by `vite preview`:

- `/?view=shop` — Checkout produces the 503 card; the agent dialog appears five seconds later, anchored beside the error, and nudges. It falls back to the bottom-right corner at 760px.
- All six tools are registered and were driven end to end through the real `document.modelContext` API: context → diagnostics → prepare → **apply refused before approval** → approve on the page → apply → verify. The host conversation streams into the activity timeline. The retry then reaches order confirmation.
- `/` — the diagram auto-plays all nine steps; the tone changes to red on failure steps and mint on recovery; the customer's face changes with it.
- `/?view=integrate` — connecting masks the token to a fingerprint and enables the download. The typed token appears in neither `localStorage`, `sessionStorage`, IndexedDB, nor the DOM, and not in the downloaded plugin.
- The production download is one self-contained 23 kB file containing `registerTool` and no credentials.

## Implemented

- 5xx host-outage incident: `POST /api/checkout` 503, crash-looping deploy, bounded rollback, verified retry
- Delayed, error-anchored, nudging agent dialog (`revealDelayMs` and `anchorTo` on the runtime config)
- Live streaming of the Host Whisperer ↔ host exchange into the customer's timeline (`report` callback on a recovery action)
- Animated nine-step inline-SVG flow diagram with auto-play, step list, and prev/next/pause
- Connect-your-host page: host dropdown, token field, simulated handshake, masked fingerprint, one-file plugin download, install tag
- Plugin installed by default, so the demo needs no setup; before/after still available in demo controls
- Six runtime WebMCP tools, registered only by the installed customer runtime
- Safe-context filtering and output limits
- Incident-bound approval, replay prevention, and post-recovery verification
- Customer-approved escalation preview and URL-fragment packet
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
