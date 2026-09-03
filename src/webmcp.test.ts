import { describe, expect, it, vi } from 'vitest';
import { registerWebMcpTools } from './webmcp';

describe('WebMCP registration', () => {
  it('registers concise discoverable tools with abortable lifecycle', async () => {
    const tools: Array<{ name: string; description: string; execute: (input: unknown) => unknown }> = [];
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: vi.fn(async (tool) => { tools.push(tool); }) } });
    const controller = await registerWebMcpTools();
    expect(tools.map((tool) => tool.name)).toContain('list_provider_recipes');
    expect(tools.map((tool) => tool.name)).toContain('create_project_room');
    expect(tools.every((tool) => tool.name.length <= 30 && tool.description.length <= 500)).toBe(true);
    const result = await tools.find((tool) => tool.name === 'list_provider_recipes')!.execute({ provider: 'render' });
    expect(result).toMatchObject({ content: [{ type: 'text' }] });
    expect(controller?.signal.aborted).toBe(false);
    controller?.abort();
    expect(controller?.signal.aborted).toBe(true);
  });
});
