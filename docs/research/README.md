# Host Whisperer research

This directory is the tracked, reviewable index for challenge research. Run `npm run research:sync` to place raw snapshots in gitignored `.research-cache/`. The sync report records retrieval failures without failing the entire run.

## Findings that shape the product

- The challenge rewards a working WebMCP app whose human-and-agent experience is coherent, useful, creative, and non-trivial. It requires a live URL, public licensed repository, written description, and public narrated video under three minutes.
- WebMCP is a page-owned JavaScript tool surface. Host Whisperer owns visible project state and safe handoffs; vendor MCP servers continue to own authenticated provider operations.
- WebMCP security guidance calls for concise schemas and outputs, read-only annotations, untrusted-content annotations, and explicit user interaction for sensitive actions.
- Cloudflare, Vercel, Netlify, Render, AWS, and Google Cloud provide official MCP capabilities with different lifecycle coverage. Shopify's Storefront MCP is commerce-facing, so project deployment remains a CLI/dashboard handoff.
- MCP-B is a compatibility and protocol-bridge layer, not a hosting provider.

## Support language

`live-tested` means the complete handoff was verified against the provider. `handoff-ready` means the recipe and official integration path are documented but not claimed as end-to-end tested. `manual` means Host Whisperer creates a structured CLI/dashboard handoff.
