import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHostWhispererRuntime } from './index';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove()); });

describe('generated support runtime', () => {
  it('delegates the complete repair behind one customer-safe tool and waits for approval', async () => {
    let recovered = false;
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => undefined } });
    const runtime = createHostWhispererRuntime({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render',
      getContext: () => ({ route: '/checkout?session=private', API_TOKEN: 'never', nested: { password: 'hidden', safe: 'visible' } }),
      diagnostics: [{ id: 'cart', label: 'Cart session', run: () => ({ status: 'fail', summary: 'Cart format is outdated.' }) }],
      actions: [{ id: 'rebuild', label: 'Rebuild cart', description: 'Preserve items in a fresh cart.', effects: ['No purchase'], run: () => { recovered = true; }, verify: () => ({ recovered, summary: 'Checkout is ready.' }) }],
    });
    expect(runtime.tools.map((tool) => tool.name)).toEqual(['ask_host_whisperer_to_fix_issue']);

    let requestSettled = false;
    const request = Promise.resolve(runtime.tools[0].execute({ issue: 'Checkout fails for my cart.' })).then((result) => { requestSettled = true; return result; });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSettled).toBe(false);
    expect(runtime.getIncident()?.safeContext).toEqual({ route: '/checkout', nested: { safe: 'visible' } });
    expect(runtime.getIncident()?.diagnostics).toHaveLength(1);

    runtime.open();
    const approve = document.querySelector('#host-whisperer-root')?.shadowRoot?.querySelector<HTMLButtonElement>('.hw-approve');
    expect(approve).toBeTruthy();
    expect(document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent).not.toContain('Cart format');
    approve!.click();
    const customerResult = await request as { status: string; customerMessage: string };
    expect(customerResult).toEqual({ status: 'resolved', customerMessage: 'Checkout is available again. Ask the customer to try again.' });
    expect(JSON.stringify(customerResult)).not.toContain('Cart format');
    expect(runtime.getIncident()?.stage).toBe('recovered');
    runtime.destroy();
  });

  it('returns a simple ready message when inspection finds no active failure', async () => {
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => undefined } });
    const runtime = createHostWhispererRuntime({ integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render', getContext: () => ({ route: '/cart' }), diagnostics: [{ id: 'health', label: 'Health', run: () => ({ status: 'pass', summary: 'Online' }) }], actions: [{ id: 'retry', label: 'Retry', description: 'Retry', effects: ['Retry'], run: () => undefined, verify: () => ({ recovered: true, summary: 'Ready' }) }] });
    const result = await runtime.tools[0].execute({ issue: 'Is checkout ready?' });
    expect(result).toEqual({ status: 'resolved', customerMessage: 'Checkout is available. Ask the customer to try again.' });
    expect(runtime.getIncident()?.stage).toBe('recovered');
    runtime.destroy();
  });

  it('does not claim the support agent is connected when tool registration fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => { throw new Error('disabled'); } } });
    const runtime = createHostWhispererRuntime({ integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render', getContext: () => ({ route: '/cart' }), diagnostics: [{ id: 'health', label: 'Health', run: () => ({ status: 'pass', summary: 'Online' }) }], actions: [{ id: 'retry', label: 'Retry', description: 'Retry', effects: ['Retry'], run: () => undefined, verify: () => ({ recovered: true, summary: 'Ready' }) }] });
    await Promise.resolve();
    await Promise.resolve();
    runtime.open();
    const text = document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent;
    expect(text).toContain('Website Tool unavailable');
    expect(text).not.toContain('support agent connected');
    runtime.destroy();
  });

  it('holds the offer of help back, then streams the host conversation', async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => undefined } });
    let healthy = false;
    const runtime = createHostWhispererRuntime({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render',
      agentLabel: 'Codex', revealDelayMs: 5000,
      getContext: () => ({ route: '/product/aster-h1', checkoutStatus: 503 }),
      diagnostics: [{ id: 'checkout_service', label: 'Checkout service', run: () => ({ status: 'fail', summary: 'HTTP 503 from checkout-service.' }) }],
      actions: [{
        id: 'roll_back_checkout_service', label: 'Roll back the checkout service', description: 'Restore the last healthy deploy.', effects: ['Cart untouched'],
        run: (report) => { report?.('Read deploy history', 'dep-8f2c1a failing'); report?.('Host confirmed rollback', 'checkout-service healthy'); healthy = true; },
        verify: () => ({ recovered: healthy, summary: 'Checkout returns HTTP 200.' }),
      }],
    });
    const shadow = () => document.querySelector('#host-whisperer-root')!.shadowRoot!;
    expect(shadow().querySelector('.hw-launch')).toBeNull();
    vi.advanceTimersByTime(5000);
    expect(shadow().querySelector('.hw-launch')?.textContent).toContain('Ask Codex');

    const request = runtime.tools[0].execute({ issue: 'Checkout returns a server error.' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    runtime.open();
    shadow().querySelector<HTMLButtonElement>('.hw-approve')!.click();
    await request;

    const labels = runtime.getIncident()!.activity.map((item) => item.label);
    expect(labels).toContain('Gathering incident data');
    expect(labels).toContain('Filing support report');
    expect(labels).toContain('Sending for inspection');
    expect(labels).toContain('Read deploy history');
    expect(labels).toContain('Host confirmed rollback');
    expect(labels).toContain('Issue resolved');
    runtime.destroy();
  });
});
