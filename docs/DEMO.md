# Demo Runbook

## The complete before-and-after story

### 1. Reproduce the problem before Host Whisperer

1. Open `https://host-whisperer.onrender.com/?view=shop`.
2. Click **Restart full story** if this browser has run the demo before.
3. Click **Checkout** and show the `CART_SESSION_OUTDATED` error.
4. Point out that there is no AI support button or developer configuration link. The customer only receives a generic error.
5. Leave Northstar open and separately open the developer Studio at `https://host-whisperer.onrender.com/?view=integrate`.

### 2. Configure and generate the plugin in Host Whisperer

1. Confirm **Northstar Shop**, the exact website origin, Render, and the verified broken-cart playbook.
2. Explain that this is a separate developer-only surface and that the form can also be configured by ChatGPT through the Studio's WebMCP tools.
3. Click **Generate support plugin**.
4. Show the generated adapter. Point out the allowlisted context, diagnostic, recovery, and verification functions.
5. Click **Send package to Northstar Admin**. This transfers the generated demo package without pretending that an external service can silently modify the store.
6. Wait for **Integration package is ready**, then click **Open Northstar Admin**.

### 3. Install it in the store's admin page

1. Point out the completely different Northstar Admin interface and the **Store developer** role.
2. Review the two received files and the four requested capabilities.
3. Click **Install plugin on storefront**.
4. Wait for **Host Whisperer is active**, then click **Test on storefront**.

### 4. Let the customer's AI operate the website

1. Click **Checkout** again. The same error occurs, but **Ask AI to fix this** now appears.
2. Click the new support control and keep the panel open.
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
