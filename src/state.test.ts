import { describe, expect, it } from 'vitest';
import { approveOperation, findRoom, prepareOperation, recordDiagnosis, recordResult, reportIncident } from './state';

describe('operation approval', () => {
  it('blocks an external write result until the human approves it', async () => {
    const room = await reportIncident({ name: 'Proof', reportedIssue: 'The latest deployment is failing.', provider: 'render', recipeId: 'render-static' });
    const operation = await prepareOperation(room.intent.id, 'update_config', { changes: { PUBLIC_SITE_TITLE: 'Recovered' } });

    await expect(recordResult(room.intent.id, { operationId: operation.id, status: 'succeeded', summary: 'created' })).rejects.toThrow('not been approved');
    await approveOperation(room.intent.id, operation.id);
    await expect(recordResult(room.intent.id, { operationId: operation.id, status: 'succeeded', summary: 'created' })).resolves.toMatchObject({ status: 'succeeded' });
    await expect(recordResult(room.intent.id, { operationId: operation.id, status: 'failed', summary: 'overwrite' })).rejects.toThrow('already been recorded');
  });

  it('refuses secret material in chat-mediated configuration changes', async () => {
    const room = await reportIncident({ name: 'Safe config', reportedIssue: 'The deployment cannot read its configuration.', provider: 'render', recipeId: 'render-static' });
    await expect(prepareOperation(room.intent.id, 'update_config', { changes: { API_TOKEN: 'never' } })).rejects.toThrow('secure UI');
    await expect(prepareOperation(room.intent.id, 'update_config', { changes: { VALUE: 'ghp_abcdefghijklmnop' } })).rejects.toThrow('secure UI');
  });

  it('moves from a plain-English report through evidence to verified recovery', async () => {
    const room = await reportIncident({ name: 'Checkout', reportedIssue: 'Customers say checkout returns an error.', provider: 'render', recipeId: 'render-static' });
    expect(room.stage).toBe('reported');
    const check = await prepareOperation(room.intent.id, 'health_check', { url: 'https://example.com' });
    expect(check.approvalRequired).toBe(false);
    await expect(recordResult(room.intent.id, { operationId: check.id, status: 'succeeded', summary: 'Checkout responds normally.' })).resolves.toMatchObject({ status: 'succeeded' });
    expect(findRoom(room.intent.id)?.stage).toBe('recovered');
  });

  it('only approves prepared changes and diagnoses completed evidence', async () => {
    const room = await reportIncident({ name: 'Guardrails', reportedIssue: 'The public service returns a blank page.', provider: 'render', recipeId: 'render-static' });
    const check = await prepareOperation(room.intent.id, 'fetch_logs');
    await expect(approveOperation(room.intent.id, check.id)).rejects.toThrow('does not require approval');
    await expect(recordDiagnosis(room.intent.id, {
      operationId: check.id,
      cause: 'The build command is wrong.',
      confidence: 'high',
      evidence: ['Build output names the wrong directory.'],
      fixKind: 'configuration',
      proposedChanges: ['Update the publish directory.'],
      verification: ['Check the public URL.'],
    })).rejects.toThrow('Finish the evidence operation');
  });
});
