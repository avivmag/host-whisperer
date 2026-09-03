import { describe, expect, it } from 'vitest';
import { approveOperation, createRoom, prepareOperation, recordResult } from './state';

describe('operation approval', () => {
  it('blocks an external write result until the human approves it', async () => {
    const room = await createRoom({ name: 'Proof', goal: 'Deploy a static proof project.', provider: 'render', recipeId: 'render-static' });
    const operation = await prepareOperation(room.intent.id, 'create', { name: 'proof' });

    await expect(recordResult(room.intent.id, { operationId: operation.id, status: 'succeeded', summary: 'created' })).rejects.toThrow('not been approved');
    await approveOperation(room.intent.id, operation.id);
    await expect(recordResult(room.intent.id, { operationId: operation.id, status: 'succeeded', summary: 'created' })).resolves.toMatchObject({ status: 'succeeded' });
  });

  it('refuses secret material in chat-mediated configuration changes', async () => {
    const room = await createRoom({ name: 'Safe config', goal: 'Keep secret values out of chat.', provider: 'render', recipeId: 'render-static' });
    await expect(prepareOperation(room.intent.id, 'update_config', { changes: { API_TOKEN: 'never' } })).rejects.toThrow('secure UI');
  });
});
