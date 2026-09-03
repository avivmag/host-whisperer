# Three-minute demo runbook

1. Open Host Whisperer in ChatGPT's in-app browser and show **WebMCP ready**.
2. Ask ChatGPT to list Render recipes and create a project room for the Render proof site.
3. Ask it to prepare project creation. Approve the visible card, then call Render's `create_static_site` with this repository, build command `cd demo/render-static && npm ci && npm run build`, and publish path `demo/render-static/dist`.
4. Record the failed result and the log line `Missing required configuration: PUBLIC_SITE_TITLE`.
5. Ask the agent to diagnose the failure. Show that the log is treated as untrusted evidence.
6. Prepare the non-secret fix `{ "PUBLIC_SITE_TITLE": "It shipped." }` and approve it.
7. Call Render's `update_environment_variables`, then `trigger_deploy`; record and verify the successful URL.
8. End on the green deployment state and explain the seven recipe families and honest capability labels.

Never show OAuth tokens, API keys, account identifiers, or other secrets in the recording.
