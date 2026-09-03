import { describe, expect, it, vi } from 'vitest';
import { approveOperation } from './state';
import { registerWebMcpTools } from './webmcp';

describe('WebMCP registration', () => {
  it('registers concise discoverable tools with abortable lifecycle', async () => {
    const tools: Array<{ name: string; description: string; execute: (input: unknown) => unknown }> = [];
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: vi.fn(async (tool) => { tools.push(tool); }) } });
    const controller = await registerWebMcpTools();
    expect(tools.map((tool) => tool.name)).toContain('list_provider_connections');
    expect(tools.map((tool) => tool.name)).toContain('report_incident');
    expect(tools.every((tool) => tool.name.length <= 30 && tool.description.length <= 500)).toBe(true);
    const result = await tools.find((tool) => tool.name === 'list_provider_connections')!.execute({ provider: 'render' });
    expect(result).toMatchObject({ content: [{ type: 'text' }] });
    expect(controller?.signal.aborted).toBe(false);

    const report = await tools.find((tool) => tool.name === 'report_incident')!.execute({ projectName: 'Proof', reportedIssue: 'The deployment fails during its build.', provider: 'render', recipeId: 'render-static' }) as { content: Array<{ text: string }> };
    const incidentId = JSON.parse(report.content[0].text).context.id;
    const replacement = await registerWebMcpTools();
    expect(controller?.signal.aborted).toBe(true);

    const repairTool = [...tools].reverse().find((tool) => tool.name === 'prepare_repair')!;
    const repair = await repairTool.execute({ incidentId, action: 'update_config', arguments: { changes: { PUBLIC_SITE_TITLE: 'Recovered' } } }) as { content: Array<{ text: string }> };
    const repairResult = JSON.parse(repair.content[0].text);
    expect(repairResult).not.toHaveProperty('executionHandoff');

    await approveOperation(incidentId, repairResult.operationId);
    const approvedRegistration = await registerWebMcpTools();
    const contextTool = [...tools].reverse().find((tool) => tool.name === 'get_incident_context')!;
    const context = await contextTool.execute({ incidentId }) as { content: Array<{ text: string }> };
    expect(JSON.parse(context.content[0].text).latestOperation.executionHandoff.suggestedTool).toBe('update_environment_variables');
    expect(replacement?.signal.aborted).toBe(true);
    approvedRegistration?.abort();
  });
});
