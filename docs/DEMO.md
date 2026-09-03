# Demo Runbook

## Customer recovery

1. Open `https://host-whisperer.onrender.com/?view=shop` inside ChatGPT's in-app browser.
2. Show the failed Aster H1 checkout and click **Help me fix this** so the operator timeline remains visible.
3. Tell ChatGPT: “I can't buy these headphones. Find the problem and fix it safely.”
4. ChatGPT calls `get_support_context`; show the safe fields and the matching activity event.
5. ChatGPT calls `run_support_diagnostics`; show that the store is healthy, inventory is available, and cart-session compatibility fails.
6. Explain that the browser exposes error code `CART_SESSION_OUTDATED`, not payment data or arbitrary DOM content.
7. ChatGPT calls `prepare_recovery` with `rebuild_cart_session`.
8. Show the visible effects and demonstrate that `apply_recovery` fails before approval.
9. Click **Approve recovery** in the website.
10. ChatGPT calls `apply_recovery`, then `verify_recovery`.
11. Show **Checkout is ready**, the original headphones still in the cart, and the complete operator activity timeline.

Use **Reset broken-cart demo** between recordings. The reset restores schema v1 deterministically.

## Developer generation

1. Return to the Studio.
2. Briefly show application name, bound origin, provider hint, and the verified commerce playbook.
3. Point out the generated universal adapter and customer-safe boundary.
4. Explain that ChatGPT can configure the same form through Studio WebMCP tools.
5. Prepare the bundle and show that the developer—not the agent—must click the download controls.

## Optional escalation

If recovery cannot be verified, call `prepare_developer_escalation`. The first call only previews the sanitized packet. After the customer approves sharing in the widget, a second call returns a Host Whisperer URL whose fragment contains the report. The packet is labeled untrusted evidence and is not uploaded to a Host Whisperer backend.
