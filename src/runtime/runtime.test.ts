import { afterEach, describe, expect, it } from 'vitest';
import { createHostWhispererRuntime } from './index';

afterEach(() => document.querySelectorAll('#host-whisperer-root').forEach((node) => node.remove()));

describe('generated support runtime', () => {
  it('diagnoses, blocks unapproved repair, applies approval, and verifies recovery', async () => {
    let recovered = false;
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async () => undefined } });
    const runtime = createHostWhispererRuntime({
      integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render',
      getContext: () => ({ route: '/checkout?session=private', API_TOKEN: 'never', nested: { password: 'hidden', safe: 'visible' } }),
      diagnostics: [{ id: 'cart', label: 'Cart session', run: () => ({ status: 'fail', summary: 'Cart format is outdated.' }) }],
      actions: [{ id: 'rebuild', label: 'Rebuild cart', description: 'Preserve items in a fresh cart.', effects: ['No purchase'], run: () => { recovered = true; }, verify: () => ({ recovered, summary: 'Checkout is ready.' }) }],
    });
    const tool = (name: string) => runtime.tools.find((item) => item.name === name)!;
    const context = await tool('get_support_context').execute({ issue: 'Checkout fails for my cart.' }) as { content: Array<{ text: string }> };
    const contextValue = JSON.parse(context.content[0].text);
    expect(contextValue.safeContext).toEqual({ route: '/checkout', nested: { safe: 'visible' } });
    const incidentId = contextValue.incidentId;
    await tool('run_support_diagnostics').execute({ incidentId });
    await tool('prepare_recovery').execute({ incidentId, actionId: 'rebuild' });
    await expect(tool('apply_recovery').execute({ incidentId, actionId: 'rebuild' })).rejects.toThrow('not approved');

    runtime.open();
    const approve = document.querySelector('#host-whisperer-root')?.shadowRoot?.querySelector<HTMLButtonElement>('.hw-approve');
    expect(approve).toBeTruthy();
    approve!.click();
    await tool('apply_recovery').execute({ incidentId, actionId: 'rebuild' });
    const verification = await tool('verify_recovery').execute({ incidentId }) as { content: Array<{ text: string }> };
    expect(JSON.parse(verification.content[0].text)).toMatchObject({ recovered: true, stage: 'recovered' });
    await expect(tool('apply_recovery').execute({ incidentId, actionId: 'rebuild' })).rejects.toThrow('no longer ready');
    runtime.destroy();
  });

  it('rejects another incident ID and withholds escalation links before consent', async () => {
    const runtime = createHostWhispererRuntime({ integrationId: 'test', appName: 'Shop', allowedOrigin: location.origin, providerHint: 'render', getContext: () => ({ route: '/cart' }), diagnostics: [{ id: 'health', label: 'Health', run: () => ({ status: 'pass', summary: 'Online' }) }], actions: [{ id: 'retry', label: 'Retry', description: 'Retry', effects: ['Retry'], run: () => undefined, verify: () => ({ recovered: true, summary: 'Ready' }) }] });
    const tool = (name: string) => runtime.tools.find((item) => item.name === name)!;
    const context = await tool('get_support_context').execute({ issue: 'The cart is broken.' }) as { content: Array<{ text: string }> };
    const incidentId = JSON.parse(context.content[0].text).incidentId;
    await expect(tool('run_support_diagnostics').execute({ incidentId: 'wrong' })).rejects.toThrow('not found');
    await tool('run_support_diagnostics').execute({ incidentId });
    await expect(tool('prepare_recovery').execute({ incidentId, actionId: 'retry' })).rejects.toThrow('failing check');
    const escalation = await tool('prepare_developer_escalation').execute({ incidentId }) as { content: Array<{ text: string }> };
    expect(JSON.parse(escalation.content[0].text)).toMatchObject({ approvalRequired: true });
    expect(JSON.parse(escalation.content[0].text).escalationUrl).toBeUndefined();
    runtime.open();
    document.querySelector('#host-whisperer-root')?.shadowRoot?.querySelector<HTMLButtonElement>('.hw-escalate')?.click();
    const shared = await tool('prepare_developer_escalation').execute({ incidentId }) as { content: Array<{ text: string }> };
    expect(JSON.parse(shared.content[0].text).escalationUrl).toContain('#packet=');
    runtime.destroy();
  });
});
