# Three-minute demo runbook

1. Open [Host Whisperer](https://host-whisperer.onrender.com) in ChatGPT's in-app browser and show **AI operator ready**.
2. Say: “My Render deployment failed and I don't understand the error. Investigate it for me.”
3. Let the agent open an incident room from that plain-English symptom.
4. Ask the agent to inspect the service and fetch the relevant logs through read-only provider MCP operations.
5. Record the evidence line `Missing required configuration: PUBLIC_SITE_TITLE` and ask for an explanation without cloud jargon.
6. Show the diagnosis, confidence level, and proposed non-secret configuration repair.
7. Ask the agent to prepare the repair. Point out that its provider execution handoff is withheld until the visible **Approve repair** button is clicked.
8. Approve `PUBLIC_SITE_TITLE=It shipped.`, apply it through Render MCP, and show the recovery deploy.
9. Run the health check tied to the original symptom and open [the verified proof](https://host-whisperer-proof.onrender.com).
10. End on the recovered incident state: the user never needed a CLI, dashboard, or provider vocabulary.

Never show OAuth tokens, API keys, workspace IDs, or other account identifiers in the recording.

## Verified proof

The full sequence was verified on Render on 2026-09-03 using commit `33cb0d6`:

- The initial deploy reached `build_failed` with `Missing required configuration: PUBLIC_SITE_TITLE`.
- The user approved the non-secret configuration update `PUBLIC_SITE_TITLE=It shipped.`.
- Render automatically started a recovery deploy, which reached `live`.
- [`https://host-whisperer-proof.onrender.com`](https://host-whisperer-proof.onrender.com) returned HTTP 200 and rendered the approved title.
