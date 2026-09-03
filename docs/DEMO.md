# Demo Runbook

This is the target judged flow. Before recording, confirm that the implementation gaps in `docs/STATUS.md` are closed and that the deployed build matches the worktree.

## Preparation

- Use ChatGPT's in-app browser for the customer WebMCP portion.
- Open the Host Whisperer Studio and Northstar Admin in separate tabs if that makes the three roles easier to follow.
- On Northstar Market, click **Restart full story** before rehearsing.
- Confirm the error, package-ready flag, plugin installation, and cart recovery are all reset.

## 1. Customer reaches a dead end

1. Open `https://host-whisperer.onrender.com/?view=shop`.
2. Show that this is Northstar Market, not Host Whisperer or an admin dashboard.
3. Confirm there is no error and no Host Whisperer support control initially.
4. Click **Checkout**.
5. Show the generic checkout error and `CART_SESSION_OUTDATED`.
6. Emphasize that the uninstrumented website can report the problem but cannot help the customer's agent investigate it.

## 2. Operator generates the integration

1. Separately open `https://host-whisperer.onrender.com/?view=integrate`.
2. Show the Host Whisperer identity and normal developer configuration form.
3. Confirm the application name, exact allowed origin, provider hint, and commerce cart playbook.
4. Point out the customer-safe boundary and generated adapter.
5. Click **Generate support plugin**.
6. Briefly show the adapter, runtime, and install-tag controls.
7. Click **Send package to Northstar Admin**.

Do not mention configuring Studio with ChatGPT. Studio generates the plugin; it is not a WebMCP surface.

## 3. Store developer installs it

1. Open `https://host-whisperer.onrender.com/?view=admin`.
2. Establish the Northstar Admin identity and **Store developer** role.
3. Review the received files and requested website capabilities.
4. Explain that the store owner—not Host Whisperer and not the customer agent—controls installation.
5. Click **Install plugin on storefront**.
6. Wait for **Host Whisperer is active**.
7. Click **Test on storefront**.

## 4. Customer asks ChatGPT for help

1. Back on Northstar Market, click **Checkout** again.
2. The same error appears, followed by the installed **Ask AI to fix this** control.
3. Open the control and keep its activity timeline visible.
4. In the ChatGPT conversation, say: **“Fix checkout safely.”**
5. ChatGPT should call `get_support_context` and `run_support_diagnostics`.
6. Show the individual activity events: storefront reachable, inventory available, and cart-session compatibility failed.
7. Explain that the page shared a small allowlist of structured values, not payment data, credentials, query strings, or arbitrary DOM content.

The webpage cannot silently submit a message to ChatGPT. The short customer request is the minimum honest handoff; subsequent work happens through WebMCP.

## 5. Customer approves and ChatGPT verifies

1. ChatGPT calls `prepare_recovery` with `rebuild_cart_session`.
2. Show the recovery card and its exact effects.
3. Click **Approve recovery** in Northstar Market.
4. ChatGPT calls `apply_recovery` and then `verify_recovery`.
5. Show **Everything is running smoothly**.
6. Confirm the same Aster H1 and quantity remain in the cart and no order was placed.
7. End with the completed activity timeline visible.

## Optional escalation

If recovery is unavailable or verification fails, ChatGPT calls `prepare_developer_escalation`. The first call previews the sanitized packet. After separate customer approval, a second call returns an escalation URL whose fragment contains the report. The report is labeled untrusted evidence.

## Reset controls

- **Reset error only** restores cart schema version 1 but leaves the plugin installed.
- **Restart full story** restores the broken cart and clears both package and installation demo flags.
