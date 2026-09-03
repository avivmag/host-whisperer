# Demo Runbook

## The complete before-and-after story

### 1. Reproduce the problem before Host Whisperer

1. Open `https://host-whisperer.onrender.com/?view=shop`.
2. Click **Restart full story** if this browser has run the demo before.
3. Click **Checkout** and show the `CART_SESSION_OUTDATED` error.
4. Point out that there is no AI support button. The customer only receives a generic error.
5. Click **Configure Host Whisperer** to switch from the customer site to the developer journey.

### 2. Configure and generate the plugin

1. Show the journey bar: the error was reproduced and configuration is the active step.
2. Confirm **Northstar Shop**, the exact website origin, Render, and the verified broken-cart playbook.
3. Explain that the form can also be configured by ChatGPT through the Studio's WebMCP tools.
4. Click **Generate support plugin**.
5. Show the generated adapter. Point out the allowlisted context, diagnostic, recovery, and verification functions.
6. Click **Install on Northstar demo**. This button simulates adding the generated adapter and runtime files to the demo website; real developers use the adjacent downloads and install tag.
7. Wait for **Host Whisperer is installed**, then click **Return to Northstar**.

### 3. Let the customer's AI operate the website

1. Show that the same checkout is still broken, but **Ask AI to fix this** now exists.
2. Click it and keep the panel open.
3. In ChatGPT, say only: **“Fix checkout safely.”**
4. The panel animates each WebMCP step as ChatGPT reads safe context and runs the developer-approved diagnostics.
5. Show store health passing, inventory passing, and cart compatibility failing.
6. When ChatGPT prepares **Rebuild cart session**, show the precise effects and click **Approve recovery**.
7. Let ChatGPT apply the recovery and call verification.
8. Finish on **Everything is running smoothly**, with the same Aster H1 still in the cart and the completed activity timeline visible.

The page cannot inject a message into ChatGPT. The single short request in step 3 is therefore the minimum honest customer interaction; everything after it is driven by the page's WebMCP tools.

Use **Reset error only** to repeat just the repair, or **Restart full story** to remove the simulated installation and return to the opening state.

## Optional escalation

If recovery cannot be verified, call `prepare_developer_escalation`. The first call previews the sanitized packet. After the customer approves sharing in the widget, a second call returns a Host Whisperer URL whose fragment contains the report. The packet is labeled untrusted evidence and is not uploaded to a Host Whisperer backend.
