# Devpost submission draft

## Project

**Name:** Host Whisperer

**Tagline:** Create, debug, and operate cloud projects through conversation.

**Live app:** https://host-whisperer.onrender.com

**Repository:** https://github.com/avivmag/host-whisperer

## Description

### Inspiration

Deploying a small project often means translating one goal across source code, cloud dashboards, CLIs, logs, cost pages, and provider-specific terminology. That is a high-friction experience for an indie developer, especially when something fails. Host Whisperer explores a simpler model: keep the human, the agent, and the state of the project in one visible operations room.

### What it does

A user chooses a provider and describes what they want to ship. Host Whisperer turns that conversation into a provider-specific project plan with expected artifacts, commands, cost assumptions, connection instructions, and supported maintenance actions. The app exposes this shared state through WebMCP so an agent can create and inspect project rooms, prepare provider actions, record results, diagnose failures, and prepare safe fixes.

Mutating operations do not silently execute. Create, configuration, and redeploy actions stop at a visible approval card that only the human can approve. Provider logs are treated as untrusted evidence, token-shaped values are redacted, and secret-like configuration keys are refused. Code incidents become structured Codex repair briefs instead of invisible browser-side edits.

The catalog includes narrow starter recipes for AWS, Google Cloud, Cloudflare, Vercel, Netlify, Render, and Shopify. These are not rankings or promises of identical support. Render is labeled live tested; the remaining recipes are honestly labeled handoff ready or manual.

### Why WebMCP

An infrastructure MCP can operate a provider, but it does not own the web page where a person reviews intent, understands cost assumptions, grants approval, and sees durable history. WebMCP lets Host Whisperer expose the same state and actions visible in the interface directly to the agent. The conversation becomes a controller for the web application without bypassing the user-facing safety boundary.

This creates an interaction that was previously awkward: a person can discuss a goal in natural language, inspect the agent's concrete plan in the page, approve a narrowly scoped operation, and then continue the same conversation using real deployment evidence. The page remains the shared source of truth throughout creation, diagnosis, repair, and maintenance.

### How it was built

Host Whisperer is a React and TypeScript static application. It registers imperative tools with `document.modelContext.registerTool`, using JSON Schemas, concise descriptions, read-only and untrusted-content annotations, abortable registration lifecycles, and MCP content-block responses. Project rooms are stored locally in IndexedDB and can be exported or imported as JSON.

Provider recipes produce explicit handoff objects for official provider MCP servers. Security helpers reject secret-like keys, redact token-shaped output, truncate logs and tool responses, and prevent a mutating provider result from being recorded before visible approval.

### Live deployment proof

The Render recipe was exercised end to end against a private GitHub repository. The first build intentionally failed because `PUBLIC_SITE_TITLE` was absent. The Render logs identified the exact configuration failure. After human approval, the agent merged the non-secret variable and Render automatically redeployed the same commit. The recovery reached `live`, and https://host-whisperer-proof.onrender.com returned HTTP 200 with the approved title, “It shipped.”

### What we learned

The most useful agent experience is not a giant tool that can do everything. It is a small set of tools with clear state transitions, honest capability labels, compact responses, and visible human checkpoints. WebMCP is especially valuable as the coordination layer between a conversational agent and a page whose state the user can understand and control.

### What's next

Next steps include verified provider-specific adapters beyond Render, richer health and cost history, encrypted opt-in synchronization across devices, and reusable maintenance playbooks for common incidents.

## Required form answers

- Submitter Type: Individual
- Country: Israel
- App Status: New
- Live URL: https://host-whisperer.onrender.com
- Testing instructions: Open the app in ChatGPT's in-app browser or Chrome with WebMCP enabled. Ask the agent to list Render recipes, create a Render project room, and prepare a create action. Confirm that the visible approval card must be clicked before a mutating result can be recorded.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: TODO — record the exact WebMCP-capable client and version after the final manual browser test.
- AI tools used: OpenAI Codex for product design, implementation, research, testing, deployment, and debugging; Render's official MCP server for the live infrastructure proof; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:30

**0:00–0:20 — Problem.** Deploying one small app means jumping among chat, a repository, cloud dashboards, logs, and provider documentation. Host Whisperer makes the web page a shared operations room for the person and agent.

**0:20–0:45 — Project room.** Open the live app, point out the provider recipes and honest capability labels, choose Render, and create a room from a short goal.

**0:45–1:15 — WebMCP.** Ask the agent to inspect the room and prepare creation. Show the visible plan, cost assumptions, official MCP handoff, and the human-only approval card. Explain that the tools are registered through `document.modelContext.registerTool` and operate the same state shown on screen.

**1:15–1:50 — Failure and diagnosis.** Show the recorded first Render deployment and its missing `PUBLIC_SITE_TITLE` log. Explain that external logs are untrusted, redacted evidence. Show the high-confidence configuration diagnosis.

**1:50–2:15 — Repair.** Approve the non-secret configuration fix. Show the recovery deployment and open https://host-whisperer-proof.onrender.com with “It shipped.”

**2:15–2:30 — Impact.** Explain that the same project room remains useful after launch for inspection, logs, health checks, configuration changes, redeployment, and structured Codex code-fix handoffs.
