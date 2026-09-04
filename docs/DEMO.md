# Demo Video Script

Target: **under three minutes**, with narration, as required by [HACKATHON.md](HACKATHON.md).

The video has two parts. Part one shows the offer: a customer stuck on a server error, unstuck by their own agent. Part two shows how it works and how a developer installs it. Part one is the submission — record it first and record it well.

## Before recording

- Use ChatGPT's in-app browser, or a Chrome build with WebMCP enabled, so the agent is real.
- Desktop width, at least 1280px. The agent dialog anchors beside the error at desktop width and falls back to the bottom-right corner on narrow windows.
- Use the latest ChatGPT desktop app, select GPT-5.6 Sol or Terra, and enable **Website Tools** under Settings → Browser → Permissions.
- Open `/?view=shop` and click **Recreate outage** in the footer. The plugin is installed by default; there is no setup to perform.
- Confirm the bag shows one Gerald XL and the page shows no error yet.

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

8. Keep the store open in the integrated browser. In the Codex conversation, say only: **"Fix checkout on this page."** Do not mention `@Browser`; that explicitly routes to visual browser control instead of the page's Website Tool.
9. Codex calls `resolve_store_issue` immediately and reports its result. It must not ask the customer to confirm or approve anything, or inspect the repository, source code, DOM, network logs, other integrations, or the web.
10. Read the simple page timeline: **Gathering incident data → Filing support report → Sending for inspection**. Explain that the technical evidence stays with Host Whisperer rather than being handed to the customer or their agent.
11. The page names the only allowlisted resolution for this failure while the WebMCP call is still open.
12. Do not send another chat message: Host Whisperer applies the repair inside the same call, with nothing to click.
13. Read the remaining generic progress: **Applying resolution → Verifying service → Issue resolved**.
14. Codex receives only the verified result and tells the customer that checkout is available again.

### 4. The close

15. The error card becomes **Checkout is back online**, and the button becomes **Try checkout again**.
16. Click it. The order confirms. Same cart, same item, no order placed on the customer's behalf.

## Part two — behind the scenes (1:40 – 2:45)

### 5. How it works

1. Open `/`. Let the diagram play. Narrate over it rather than reading it.
2. Name the four parties: the customer and their agent; the website, split into its ordinary **REST API** and the **WebMCP** surface the plugin adds; the **host**; and **Host Whisperer**, which sits between the website and the host and completes the triangle.
3. Follow the seven steps: the request travels over the API to the website and on to its host, the failure travels back down the same API, the customer is stuck — then the agent calls through WebMCP to Host Whisperer, Host Whisperer works the host back and forth, the answer comes back, and traffic flows both ways again with the customer unblocked.
4. Make the honest point at step eight: if it cannot be fixed, the customer gets a truthful handoff and a sanitized report for the developer, not a false success.

### 6. The developer's side

5. Open `/?view=integrate`.
6. Open the integration page. Point out the Big Pink URL and demo token already filled in, pick a host, review that host's recognizable permission names, then click **Connect**.
7. Use the integration diagram to show that WebMCP is installed on the customer website while the API token stays with Host Whisperer for its private exchange with the host.
8. Say the security line while the connected state appears: the token goes to Host Whisperer's server, it is never stored in the browser, and it never appears in the file you download.
9. Click **Download plugin**. One JavaScript file: the WebMCP runtime plus this website's diagnostics and the recovery actions the developer allowlisted.
10. Show the install tag — one `<script type="module">` — and say that this is the entire integration.

## Closing line

Sixty seconds of developer setup turns every 5xx page on a website from a dead end into a support case the customer's own agent can hand to Host Whisperer for a bounded, verified resolution.

## Escalation, if you have time

If recovery is unavailable or verification fails, the same tool returns `needs_developer` instead of claiming success. The runtime marks the case escalated and the page tells the customer it was sent to the developer.

## Demo controls

In the footer of `/?view=shop`, on the left:

- **Recreate outage** restores the broken deploy and clears the error, leaving the plugin installed.
- **Show it without the plugin** removes the plugin so the 503 is a genuine dead end. Use it for a before/after cut. **Turn the plugin back on** restores it.
