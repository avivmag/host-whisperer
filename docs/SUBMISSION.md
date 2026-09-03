# Devpost submission draft

## Project

**Name:** Host Whisperer

**Tagline:** Your AI operator for when software breaks.

**Live app:** https://host-whisperer.onrender.com

**Repository:** https://github.com/avivmag/host-whisperer

## Description

### Inspiration

When a deployment breaks, a non-expert usually receives an error written for an operator. Resolving it means translating one symptom across cloud dashboards, CLIs, logs, source code, and provider terminology. Provider MCP servers expose the necessary operations, but people still need an understandable and trustworthy way to supervise the investigation.

Host Whisperer asks the user for only what they already know: what appears to be broken. ChatGPT becomes the software operator.

### What it does

A user selects the provider they already use and describes the symptom in plain English—for example, “My latest deployment failed and I don’t understand the error.” Host Whisperer opens a persistent incident room and guides the agent through five stages:

1. Report the symptom.
2. Investigate deployment status, logs, and health with read-only provider MCP operations.
3. Explain the likely cause without cloud jargon, including evidence and confidence.
4. Prepare the smallest repair and wait for visible human approval.
5. Verify the original symptom is gone and preserve the recovery record.

Read-only investigation happens automatically. Configuration and redeploy operations require one understandable approval. Secret-like keys are refused, token-shaped output is redacted, and provider logs are treated as untrusted evidence. If the diagnosis points to source code, Host Whisperer creates a structured Codex repair brief.

Connection recipes cover AWS, Google Cloud, Cloudflare, Vercel, Netlify, Render, and Shopify without ranking the providers or pretending their capabilities are identical. Render is the live-tested incident path.

### Why WebMCP

Provider MCPs are the machinery; Host Whisperer is the incident room. WebMCP lets the agent operate the same structured state the person can see: the reported symptom, evidence checks, diagnosis, proposed repair, approval state, and verification result.

This is materially better than leaving the process inside an ephemeral chat transcript. The page gives a non-expert a stable explanation and a visible control point, while the agent gets precise tools and explicit state transitions instead of guessing through UI or reconstructing context. Mutating execution handoffs are withheld from WebMCP responses until the user clicks the approval control in the page.

### How it was built

Host Whisperer is a React and TypeScript static application. It registers imperative tools with `document.modelContext.registerTool`, using JSON Schemas, concise descriptions, read-only and untrusted-content annotations, abortable registration lifecycles, and MCP content-block responses.

The incident state machine is stored locally in IndexedDB and can be exported or imported as JSON. Provider connection recipes produce explicit handoffs for official provider MCP servers. Security helpers reject secret-like configuration, redact token-shaped content, limit external output, and prevent a mutating result from entering the incident record before visible approval.

### Live incident proof

The Render path was exercised end to end against a private GitHub repository. The user reported a failed deployment. Read-only Render evidence identified `Missing required configuration: PUBLIC_SITE_TITLE`. After a plain-English diagnosis and human approval, the agent merged the non-secret value. Render automatically redeployed the same commit, reached `live`, and https://host-whisperer-proof.onrender.com returned HTTP 200 with the approved title, “It shipped.”

### What we learned

The valuable product is not another collection of cloud commands. Provider MCPs already supply those. The missing piece is a consistent incident protocol that lets an AI perform the operator’s work while a non-expert understands the problem, controls changes, and receives proof of recovery.

### What's next

Next steps include verified incident adapters beyond Render, policy-based approval for low-risk reversible repairs, richer health and cost history, encrypted opt-in synchronization, and reusable recovery playbooks learned from previous incidents.

## Required form answers

- Submitter Type: Individual
- Country: Israel
- App Status: New
- Live URL: https://host-whisperer.onrender.com
- Testing instructions: Open the app in ChatGPT's in-app browser or Chrome with WebMCP enabled. Say, “My Render deployment failed and I don't understand the error. Investigate it for me.” Let the agent report the incident and prepare read-only evidence checks. After a diagnosis, ask it to prepare a repair and confirm that the execution handoff is unavailable until the visible approval button is clicked.
- Public repository: https://github.com/avivmag/host-whisperer
- Tested clients: Google Chrome 152 with `WebMCPTesting` enabled for native `document.modelContext` registration and UI detection; automated Vitest contract tests cover tool discovery and execution. Add ChatGPT's in-app browser after the recorded interactive demo.
- AI tools used: OpenAI Codex for product design, implementation, research, testing, deployment, and debugging; Render's official MCP server for the live incident proof; Devpost's MCP server for challenge requirements and submission preparation.
- Learning derived: Significant
- Career AI value: Yes

## Video script — target 2:30

**0:00–0:20 — The problem.** “When software breaks, cloud providers give people operator tools and operator language. Host Whisperer lets you describe the symptom normally, then ChatGPT becomes the operator.”

**0:20–0:45 — Report.** Open the live app, show **AI operator ready**, choose Render, and say: “My deployment failed and I don't understand the error.” Show the incident room created through WebMCP.

**0:45–1:15 — Investigate.** Let the agent inspect status and fetch logs with the provider MCP. Show that read-only evidence checks need no approval and external logs are visibly treated as untrusted data.

**1:15–1:45 — Explain.** Show the missing `PUBLIC_SITE_TITLE` evidence and the plain-English diagnosis. Point out its confidence, proposed repair, and verification plan.

**1:45–2:10 — Repair.** Ask the agent to prepare the repair. Show that the execution handoff is withheld until you click **Approve repair**. Apply the approved value through Render MCP.

**2:10–2:30 — Verify.** Show the recovery deploy, open https://host-whisperer-proof.onrender.com, and conclude: “I never opened a CLI or learned Render’s terminology. I described the problem; my AI operator solved and verified it.”
