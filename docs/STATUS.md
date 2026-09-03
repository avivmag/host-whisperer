# Implementation Status

Last audited: 2026-09-03

## Repository state at audit

- Branch: `main`
- Last committed revision before the external redesign: `60f0e07`
- The external redesign is present as uncommitted changes in `index.html`, `src/App.tsx`, `src/runtime/index.ts`, and `src/styles.css`.
- Those changes were deliberately preserved and inspected as the current visual source of truth.
- Baseline validation after the redesign: 12 tests passed; application and standalone runtime builds passed.
- Validation after removing Studio-side WebMCP: 11 tests passed across 3 files; application and standalone runtime builds passed; dependency tree is clean.
- The redesigned files had not been deployed at the time of the audit.

## Implemented

- Visually distinct Host Whisperer, Northstar Admin, and Northstar Market surfaces
- Walkthrough, integration, admin, customer, and escalation routes
- IndexedDB integration-profile persistence
- Generated framework-neutral adapter preview
- Separate standalone ESM runtime build
- Demo handoff from generated package to Northstar Admin
- Demo installation state shared with Northstar Market
- Deterministic `CART_SESSION_OUTDATED` incident
- Shadow DOM customer support widget
- Six runtime WebMCP tools
- Safe-context filtering and output limits
- Incident-bound approval and replay prevention
- Recovery verification
- Customer-approved escalation preview and URL-fragment packet
- Automated tests for the surfaces, runtime contract, and security helpers
- Render static-site configuration
- WebMCP removed from the Host Whisperer walkthrough and Integration Studio
- Customer runtime is the only code that calls `document.modelContext.registerTool()`

## Architecture correction completed locally

The previous concept registered four WebMCP tools in Host Whisperer Studio. That behavior and its test have been removed. Studio now uses an ordinary developer form, and its copy explains that WebMCP lives in the generated customer plugin.

### Clarify hosting access

The demo currently repairs local cart state and does not connect to Render or another provider. Future provider access requires a trusted backend with narrow endpoints. Do not imply the browser plugin has direct hosting credentials.

### Verify the external redesign

Before deployment:

- Inspect all redesigned routes at desktop and mobile sizes.
- Rehearse reset, generation, admin installation, customer diagnosis, approval, and verification.
- Update screenshots after the new UI is live.
- Confirm the runtime widget remains readable over Northstar Market.

## Next implementation sequence

1. Re-run unit tests and both builds after the architecture correction.
2. Run the complete local browser journey.
3. Review the external redesign diff and commit it together with the architecture correction in coherent commits.
4. Push only after review; Render will deploy from `main`.
5. Verify all live routes and the standalone runtime artifact.
6. Update Devpost text and media only after the live behavior matches this documentation.
