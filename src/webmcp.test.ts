import { describe, expect, it, vi } from 'vitest';
import { registerWebMcpTools } from './webmcp';

describe('Studio WebMCP registration', () => {
  it('lets an agent configure the visible generator without downloading files', async () => {
    const tools: Array<{ name: string; description: string; execute: (input: any) => Promise<any> | any }> = [];
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: vi.fn(async (tool) => { tools.push(tool); }) } });
    const controller = await registerWebMcpTools();
    expect(tools.map((tool) => tool.name)).toEqual(['create_integration_profile', 'select_support_playbook', 'configure_recovery_action', 'prepare_install_bundle']);
    expect(tools.every((tool) => tool.name.length <= 30 && tool.description.length <= 500)).toBe(true);

    const create = await tools[0].execute({ appName: 'Northstar Shop', allowedOrigin: location.origin, provider: 'render' });
    expect(JSON.parse(create.content[0].text).profile.appName).toBe('Northstar Shop');
    const prepared = await tools[3].execute({ confirmOrigin: location.origin });
    expect(JSON.parse(prepared.content[0].text)).toMatchObject({ prepared: true, downloaded: false });

    const replacement = await registerWebMcpTools();
    expect(controller?.signal.aborted).toBe(true);
    replacement?.abort();
  });
});
