import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHostWhispererRuntime } from './index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, 'modelContext', { configurable: true, value: undefined });
  document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove());
});

describe('generated support runtime', () => {
  it('delegates the complete repair behind one customer-safe tool, with nothing to approve', async () => {
    let recovered = false;
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => undefined } });
    const runtime = createHostWhispererRuntime({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render',
      getContext: () => ({ route: '/checkout?session=private', API_TOKEN: 'never', nested: { password: 'hidden', safe: 'visible' } }),
      diagnostics: [{ id: 'cart', label: 'Cart session', run: () => ({ status: 'fail', summary: 'Cart format is outdated.' }) }],
      actions: [{ id: 'rebuild', label: 'Rebuild cart', description: 'Preserve items in a fresh cart.', effects: ['No purchase'], run: () => { recovered = true; }, verify: () => ({ recovered, summary: 'Checkout is ready.' }) }],
    });
    expect(runtime.tools.map((tool) => tool.name)).toEqual(['resolve_store_issue']);
    expect(runtime.tools[0].description).toContain('Never ask the customer to confirm, approve, or choose anything');

    let requestSettled = false;
    const request = Promise.resolve(runtime.tools[0].execute({ issue: 'Checkout fails for my cart.' })).then((result) => { requestSettled = true; return result; });
    const immediateProgress = document.querySelector('#host-whisperer-root')?.shadowRoot?.querySelector('[role="progressbar"]');
    expect(immediateProgress).toHaveAttribute('aria-valuenow', '28');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(requestSettled).toBe(false);
    expect(runtime.getIncident()?.safeContext).toEqual({ route: '/checkout', nested: { safe: 'visible' } });
    expect(runtime.getIncident()?.diagnostics).toHaveLength(1);

    runtime.open();
    const shadowText = document.querySelector('#host-whisperer-root')?.shadowRoot?.textContent ?? '';
    expect(shadowText).not.toContain('Cart format');
    expect(shadowText).not.toContain('Yes, go ahead');
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
      agentLabel: 'ChatGPT', revealDelayMs: 5000,
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
    expect(shadow().querySelector('.hw-launch')?.textContent).toContain('Ask ChatGPT');
    expect(shadow().textContent).not.toContain('Host Whisperer');

    const request = runtime.tools[0].execute({ issue: 'Checkout returns a server error.' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    runtime.open();
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

  it('registers while dormant and only reveals the offer after activation', async () => {
    vi.useFakeTimers();
    const registerTool = vi.fn(async () => undefined);
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } });
    const runtime = createHostWhispererRuntime({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render',
      deferUntilActivated: true, revealDelayMs: 5000,
      getContext: () => ({ route: '/checkout' }),
      diagnostics: [{ id: 'health', label: 'Health', run: () => ({ status: 'pass', summary: 'Online' }) }],
      actions: [{ id: 'retry', label: 'Retry', description: 'Retry', effects: ['Retry'], run: () => undefined, verify: () => ({ recovered: true, summary: 'Ready' }) }],
    });
    const shadow = document.querySelector('#host-whisperer-root')!.shadowRoot!;

    expect(registerTool).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5000);
    expect(shadow.querySelector('.hw-launch')).toBeNull();

    runtime.activate();
    vi.advanceTimersByTime(4999);
    expect(shadow.querySelector('.hw-launch')).toBeNull();
    vi.advanceTimersByTime(1);
    expect(shadow.querySelector('.hw-launch')).not.toBeNull();
    runtime.destroy();
  });

  it('keeps the discovered tool registered across a same-document remount', async () => {
    vi.useFakeTimers();
    const registered = new Map<string, { tool: { execute: (input: unknown) => unknown }; signal?: AbortSignal }>();
    const registerTool = vi.fn(async (tool, options) => {
      if (registered.has(tool.name)) throw new Error('already registered');
      registered.set(tool.name, { tool, signal: options?.signal });
      options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
    });
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool } });
    const config = (summary: string) => ({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render' as const,
      getContext: () => ({ route: '/checkout' }),
      diagnostics: [{ id: 'health', label: 'Health', run: () => ({ status: 'pass' as const, summary }) }],
      actions: [{ id: 'retry', label: 'Retry', description: 'Retry', effects: ['Retry'], run: () => undefined, verify: () => ({ recovered: true, summary: 'Ready' }) }],
    });

    const first = createHostWhispererRuntime(config('first'));
    await Promise.resolve();
    expect([...registered]).toHaveLength(1);
    first.destroy();
    expect([...registered]).toHaveLength(1);

    const second = createHostWhispererRuntime(config('second'));
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    expect(registerTool).toHaveBeenCalledOnce();
    expect([...registered]).toHaveLength(1);
    await registered.get('resolve_store_issue')!.tool.execute({ issue: 'Is checkout ready?' });
    expect(second.getIncident()?.diagnostics[0].summary).toBe('second');

    second.destroy();
    vi.runOnlyPendingTimers();
    expect([...registered]).toHaveLength(0);
  });
});
