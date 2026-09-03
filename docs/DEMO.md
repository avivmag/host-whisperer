# Demo Video Script

Target: **under three minutes**, with narration, as required by [HACKATHON.md](HACKATHON.md).

The video has two parts. Part one shows the offer: a customer stuck on a server error, unstuck by their own agent. Part two shows how it works and how a developer installs it. Part one is the submission — record it first and record it well.

## Before recording

- Use ChatGPT's in-app browser, or a Chrome build with WebMCP enabled, so the agent is real.
- Desktop width, at least 1280px. The agent dialog anchors beside the error at desktop width and falls back to the bottom-right corner on narrow windows.
- Open `/?view=shop` and click **Reset the outage**. The plugin is installed by default; there is no setup to perform.
- Confirm the cart shows one Aster H1 and the page shows no error yet.

## Part one — the offer (0:00 – 1:40)

### 1. The dead end

1. Open `https://host-whisperer.onrender.com/?view=shop`. Establish that this is an ordinary storefront, not a Host Whisperer surface.
2. Click **Checkout**.
3. Hold on the error. Read the numbers out loud: **503 Service Unavailable**, `POST /api/checkout`, `upstream: checkout-service — no healthy instances`.
4. Say the point of the whole project: this is the store's server, not the customer's browser. Refreshing will not help. Normally this is where the customer leaves.
5. **Wait.** Let the silence run for the full five seconds.

### 2. The offer

6. The agent dialog animates in beside the error and keeps nudging. Do not rush past it.
7. Click **Ask Codex**. The support panel opens with its activity timeline visible.

### 3. The repair

8. In the Codex conversation, say only: **"@Browser ask Host Whisperer to fix checkout."**
9. Codex calls `ask_host_whisperer_to_fix_issue` once and waits. It does not inspect the repository, source code, DOM, network logs, other integrations, or the web.
10. Read the simple page timeline: **Gathering incident data → Filing support report → Sending for inspection**. Explain that the technical evidence stays with Host Whisperer rather than being handed to the customer or their agent.
11. The page shows the customer-relevant effects of the only allowlisted resolution while the WebMCP call remains open.
12. Click **Approve resolution**. Do not send another chat message: Host Whisperer continues inside the same pending call.
13. Read the remaining generic progress: **Applying approved resolution → Verifying service → Issue resolved**.
14. Codex receives only the verified result and tells the customer that checkout is available again.

### 4. The close

15. The error card becomes **Checkout is back online**, and the button becomes **Try checkout again**.
16. Click it. The order confirms. Same cart, same item, no order placed before approval.

## Part two — behind the scenes (1:40 – 2:45)

### 5. How it works

1. Open `/`. Let the diagram play. Narrate over it rather than reading it.
2. Name the four parties: the customer and their agent; the website, split into its ordinary **REST API** and the **WebMCP** surface the plugin adds; the **host**; and **Host Whisperer**, which sits between the website and the host and completes the triangle.
3. Follow the nine steps: request, the website asks the host, the host fails, the failure reaches the customer, the customer is stuck — then the agent steps in over WebMCP, Host Whisperer works the problem with the host, the answer comes back, and the customer is unblocked.
4. Make the honest point at step eight: if it cannot be fixed, the customer gets a truthful handoff and a sanitized report for the developer, not a false success.

### 6. The developer's side

5. Open `/?view=integrate`.
6. Set the website origin, pick the host from the dropdown, paste the host API token, click **Connect**.
7. Say the security line while the connected state appears: the token goes to Host Whisperer's server, it is never stored in the browser, and it never appears in the file you download.
8. Click **Download plugin**. One JavaScript file: the WebMCP runtime plus this website's diagnostics and its single allowed recovery.
9. Show the install tag — one `<script type="module">` — and say that this is the entire integration.

## Closing line

Sixty seconds of developer setup turns every 5xx page on a website from a dead end into a support case the customer's own agent can hand to Host Whisperer for an approved, verified resolution.

## Escalation, if you have time

If recovery is unavailable or verification fails, the same tool returns `needs_developer` instead of claiming success. The runtime marks the case escalated and the page tells the customer it was sent to the developer.

## Demo controls

On `/?view=shop`:

- **Reset the outage** restores the broken deploy and clears the error, leaving the plugin installed.
- **Show it without the plugin** removes the plugin so the 503 is a genuine dead end. Use it for a before/after cut. **Turn the plugin back on** restores it.
