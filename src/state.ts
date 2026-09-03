import { openDB } from 'idb';
import { getRecipe } from './recipes';
import { containsSensitiveValue, isSensitiveKey, sanitizeExternalText, sanitizeExternalUrl } from './security';
import type { Incident, OperationRecord, OperationType, ProjectRoom, ProviderHandoff, ProviderId } from './types';

const DB_NAME = 'host-whisperer';
const STORE_NAME = 'rooms';
const listeners = new Set<() => void>();
let cache: ProjectRoom[] = [];

const dbPromise = typeof indexedDB === 'undefined' ? null : openDB(DB_NAME, 1, {
  upgrade(db) { db.createObjectStore(STORE_NAME, { keyPath: 'intent.id' }); },
});

export const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getSnapshot = () => cache;
const emit = () => listeners.forEach((listener) => listener());

const currentStages = new Set<ProjectRoom['stage']>(['reported', 'investigating', 'diagnosed', 'awaiting_approval', 'repairing', 'verifying', 'recovered', 'failed']);

function migrateStoredRoom(value: ProjectRoom): ProjectRoom {
  const legacy = value as ProjectRoom & { intent: ProjectRoom['intent'] & { goal?: string }; stage: string };
  if (legacy.intent.reportedIssue && currentStages.has(legacy.stage as ProjectRoom['stage'])) return value;

  const legacyStages: Record<string, ProjectRoom['stage']> = {
    draft: 'reported', planned: 'reported', approved: 'repairing', executing: 'repairing', succeeded: 'verifying',
    diagnosing: 'investigating', fix_pending: 'awaiting_approval', fixed: 'recovered',
  };
  return {
    ...value,
    intent: {
      id: legacy.intent.id,
      name: legacy.intent.name,
      reportedIssue: sanitizeExternalText(legacy.intent.reportedIssue || legacy.intent.goal || 'Imported incident report.', 800),
      resourceRef: legacy.intent.resourceRef,
      provider: legacy.intent.provider,
      recipeId: legacy.intent.recipeId,
      createdAt: legacy.intent.createdAt,
      updatedAt: legacy.intent.updatedAt,
    },
    stage: currentStages.has(legacy.stage as ProjectRoom['stage']) ? legacy.stage as ProjectRoom['stage'] : legacyStages[legacy.stage] ?? 'reported',
    operations: Array.isArray(value.operations) ? value.operations : [],
    incidents: Array.isArray(value.incidents) ? value.incidents : [],
  };
}

export async function hydrateRooms() {
  if (!dbPromise) return;
  const db = await dbPromise;
  const stored = await db.getAll(STORE_NAME) as ProjectRoom[];
  cache = stored.map(migrateStoredRoom);
  await Promise.all(cache.map((room, index) => room === stored[index] ? Promise.resolve() : db.put(STORE_NAME, room)));
  emit();
}

async function persist(room: ProjectRoom) {
  cache = [room, ...cache.filter((item) => item.intent.id !== room.intent.id)];
  if (dbPromise) await (await dbPromise).put(STORE_NAME, room);
  emit();
}

export function findRoom(incidentId: string) { return cache.find((room) => room.intent.id === incidentId); }

export async function reportIncident(input: { name: string; reportedIssue: string; provider: ProviderId; recipeId: string; resourceRef?: string }) {
  const recipe = getRecipe(input.recipeId);
  if (!recipe || recipe.provider !== input.provider) throw new Error('The recipe does not belong to the selected provider.');
  if (!input.name.trim() || input.reportedIssue.trim().length < 8) throw new Error('A project name and a clear issue report are required.');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const room: ProjectRoom = {
    intent: { id, name: input.name.trim(), reportedIssue: sanitizeExternalText(input.reportedIssue.trim(), 800), resourceRef: input.resourceRef?.trim() ? sanitizeExternalText(input.resourceRef.trim(), 500) : undefined, provider: input.provider, recipeId: recipe.id, createdAt: now, updatedAt: now },
    plan: {
      projectId: id, recipeId: recipe.id, capability: recipe.capability, artifacts: recipe.artifacts, commands: recipe.commands,
      connection: { kind: recipe.mcpUrl ? 'mcp' : 'manual', url: recipe.mcpUrl, instructions: recipe.mcpUrl ? `Connect ${recipe.providerName}'s official MCP using OAuth.` : `Use ${recipe.providerName}'s CLI or dashboard.` },
      cost: recipe.cost, warnings: recipe.handoffNotes,
    },
    stage: 'reported', operations: [], incidents: [],
  };
  await persist(room);
  return room;
}

function suggestedTool(provider: ProviderId, action: OperationType) {
  const map: Record<ProviderId, Partial<Record<OperationType, string>>> = {
    render: { create: 'create_static_site', inspect: 'get_service', fetch_logs: 'list_logs', update_config: 'update_environment_variables', redeploy: 'trigger_deploy', health_check: 'get_service' },
    vercel: { create: 'deploy_to_vercel', inspect: 'get_project', fetch_logs: 'get_deployment_build_logs', redeploy: 'deploy_to_vercel', health_check: 'web_fetch_vercel_url' },
    cloudflare: { create: 'workers_build', inspect: 'get_worker', fetch_logs: 'query_worker_observability', redeploy: 'workers_build', health_check: 'query_worker_observability' },
    netlify: { create: 'deploy_site', inspect: 'get_project', fetch_logs: 'get_deploy', redeploy: 'deploy_site', health_check: 'get_deploy' },
    aws: { create: 'call_aws', inspect: 'call_aws', fetch_logs: 'call_aws', update_config: 'call_aws', redeploy: 'call_aws', health_check: 'call_aws' },
    gcp: { create: 'deploy', inspect: 'get_service', fetch_logs: 'list_logs', update_config: 'update_service', redeploy: 'deploy', health_check: 'get_service' },
    shopify: { create: 'shopify_cli_handoff', inspect: 'shopify_cli_handoff', redeploy: 'shopify_cli_handoff', health_check: 'shopify_cli_handoff' },
  };
  return map[provider][action] ?? 'provider_dashboard_handoff';
}

export async function prepareOperation(projectId: string, type: OperationType, args: Record<string, unknown> = {}) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Incident room not found.');
  const recipe = getRecipe(room.intent.recipeId)!;
  if (!recipe.supportedOperations.includes(type)) throw new Error(`${type} is not supported by this recipe.`);
  if (type === 'update_config') {
    const changes = (args.changes ?? {}) as Record<string, unknown>;
    const sensitive = Object.entries(changes).find(([key, value]) => isSensitiveKey(key) || containsSensitiveValue(value));
    if (sensitive) throw new Error(`Sensitive configuration ${sensitive[0]} must be changed in the provider's secure UI.`);
  }
  const mutating = ['create', 'update_config', 'redeploy'].includes(type);
  const handoff: ProviderHandoff = { provider: room.intent.provider, serverUrl: recipe.mcpUrl, suggestedTool: suggestedTool(room.intent.provider, type), arguments: args, postcondition: 'Record the provider result in Host Whisperer, then verify status.' };
  const operation: OperationRecord = { id: crypto.randomUUID(), type, status: 'prepared', approvalRequired: mutating, handoff, createdAt: new Date().toISOString() };
  await persist({ ...room, stage: mutating ? 'awaiting_approval' : 'investigating', operations: [...room.operations, operation] });
  return operation;
}

export async function approveOperation(projectId: string, operationId: string) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Incident room not found.');
  const target = room.operations.find((op) => op.id === operationId);
  if (!target) throw new Error('Operation not found.');
  if (!target.approvalRequired) throw new Error('This read-only operation does not require approval.');
  if (target.status !== 'prepared') throw new Error('Only a prepared operation can be approved.');
  const operations = room.operations.map((op) => op.id === operationId ? { ...op, status: 'approved' as const, approvedAt: new Date().toISOString() } : op);
  await persist({ ...room, stage: 'repairing', operations });
}

export async function recordResult(projectId: string, input: { operationId: string; status: 'succeeded' | 'failed'; summary: string; resourceId?: string; url?: string; logExcerpt?: string }) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Incident room not found.');
  const target = room.operations.find((op) => op.id === input.operationId);
  if (!target) throw new Error('Operation not found.');
  if (target.approvalRequired && !target.approvedAt) throw new Error('This operation has not been approved in the UI.');
  const expectedStatus = target.approvalRequired ? 'approved' : 'prepared';
  if (target.status !== expectedStatus) throw new Error('This operation has already been recorded or is not ready.');
  const operations = room.operations.map((op) => op.id === input.operationId ? { ...op, status: input.status, summary: sanitizeExternalText(input.summary, 600), resourceId: input.resourceId ? sanitizeExternalText(input.resourceId, 500) : undefined, url: sanitizeExternalUrl(input.url), logExcerpt: input.logExcerpt ? sanitizeExternalText(input.logExcerpt) : undefined, completedAt: new Date().toISOString() } : op);
  const stage = input.status === 'failed' ? 'investigating' : target.type === 'health_check' ? 'recovered' : target.approvalRequired ? 'verifying' : 'investigating';
  await persist({ ...room, stage, operations });
  return operations.find((op) => op.id === input.operationId)!;
}

export async function recordDiagnosis(projectId: string, input: Omit<Incident, 'id' | 'createdAt'>) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Incident room not found.');
  const evidenceOperation = room.operations.find((op) => op.id === input.operationId);
  if (!evidenceOperation) throw new Error('Evidence operation not found.');
  if (!['succeeded', 'failed'].includes(evidenceOperation.status)) throw new Error('Finish the evidence operation before recording a diagnosis.');
  const incident: Incident = { ...input, id: crypto.randomUUID(), cause: sanitizeExternalText(input.cause, 500), evidence: input.evidence.map((item) => sanitizeExternalText(item, 400)), proposedChanges: input.proposedChanges.map((item) => sanitizeExternalText(item, 400)), verification: input.verification.map((item) => sanitizeExternalText(item, 400)), createdAt: new Date().toISOString() };
  await persist({ ...room, stage: 'diagnosed', incidents: [...room.incidents, incident] });
  return incident;
}

export async function importRooms(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Import must contain an array of incident rooms.');
  for (const room of value as ProjectRoom[]) {
    if (!room?.intent?.id || !room.intent.reportedIssue || !getRecipe(room.intent.recipeId)) throw new Error('Import contains an invalid incident room.');
    await persist(room);
  }
}
