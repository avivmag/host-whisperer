import { openDB } from 'idb';
import { getRecipe } from './recipes';
import { isSensitiveKey, sanitizeExternalText } from './security';
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

export async function hydrateRooms() {
  if (!dbPromise) return;
  cache = await (await dbPromise).getAll(STORE_NAME);
  emit();
}

async function persist(room: ProjectRoom) {
  cache = [room, ...cache.filter((item) => item.intent.id !== room.intent.id)];
  if (dbPromise) await (await dbPromise).put(STORE_NAME, room);
  emit();
}

export function findRoom(projectId: string) { return cache.find((room) => room.intent.id === projectId); }

export async function createRoom(input: { name: string; goal: string; provider: ProviderId; recipeId: string; requirements?: string[]; configKeys?: string[] }) {
  const recipe = getRecipe(input.recipeId);
  if (!recipe || recipe.provider !== input.provider) throw new Error('The recipe does not belong to the selected provider.');
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const room: ProjectRoom = {
    intent: { id, name: input.name.trim(), goal: input.goal.trim(), provider: input.provider, recipeId: recipe.id, requirements: input.requirements ?? [], configKeys: input.configKeys ?? [], createdAt: now, updatedAt: now },
    plan: {
      projectId: id, recipeId: recipe.id, capability: recipe.capability, artifacts: recipe.artifacts, commands: recipe.commands,
      connection: { kind: recipe.mcpUrl ? 'mcp' : 'manual', url: recipe.mcpUrl, instructions: recipe.mcpUrl ? `Connect ${recipe.providerName}'s official MCP using OAuth.` : `Use ${recipe.providerName}'s CLI or dashboard.` },
      cost: recipe.cost, warnings: recipe.handoffNotes,
    },
    stage: 'planned', operations: [], incidents: [],
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
  if (!room) throw new Error('Project room not found.');
  const recipe = getRecipe(room.intent.recipeId)!;
  if (!recipe.supportedOperations.includes(type)) throw new Error(`${type} is not supported by this recipe.`);
  if (type === 'update_config') {
    const changes = (args.changes ?? {}) as Record<string, unknown>;
    const sensitive = Object.keys(changes).find(isSensitiveKey);
    if (sensitive) throw new Error(`Sensitive key ${sensitive} must be changed in the provider's secure UI.`);
  }
  const mutating = ['create', 'update_config', 'redeploy'].includes(type);
  const handoff: ProviderHandoff = { provider: room.intent.provider, serverUrl: recipe.mcpUrl, suggestedTool: suggestedTool(room.intent.provider, type), arguments: args, postcondition: 'Record the provider result in Host Whisperer, then verify status.' };
  const operation: OperationRecord = { id: crypto.randomUUID(), type, status: 'prepared', approvalRequired: mutating, handoff, createdAt: new Date().toISOString() };
  await persist({ ...room, stage: mutating ? 'awaiting_approval' : 'executing', operations: [...room.operations, operation] });
  return operation;
}

export async function approveOperation(projectId: string, operationId: string) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Project room not found.');
  const operations = room.operations.map((op) => op.id === operationId ? { ...op, status: 'approved' as const, approvedAt: new Date().toISOString() } : op);
  await persist({ ...room, stage: 'approved', operations });
}

export async function recordResult(projectId: string, input: { operationId: string; status: 'succeeded' | 'failed'; summary: string; resourceId?: string; url?: string; logExcerpt?: string }) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Project room not found.');
  const target = room.operations.find((op) => op.id === input.operationId);
  if (!target) throw new Error('Operation not found.');
  if (target.approvalRequired && !target.approvedAt) throw new Error('This operation has not been approved in the UI.');
  const operations = room.operations.map((op) => op.id === input.operationId ? { ...op, status: input.status, summary: sanitizeExternalText(input.summary, 600), resourceId: input.resourceId, url: input.url, logExcerpt: input.logExcerpt ? sanitizeExternalText(input.logExcerpt) : undefined, completedAt: new Date().toISOString() } : op);
  await persist({ ...room, stage: input.status, operations });
  return operations.find((op) => op.id === input.operationId)!;
}

export async function recordDiagnosis(projectId: string, input: Omit<Incident, 'id' | 'createdAt'>) {
  const room = findRoom(projectId);
  if (!room) throw new Error('Project room not found.');
  const incident: Incident = { ...input, id: crypto.randomUUID(), cause: sanitizeExternalText(input.cause, 500), evidence: input.evidence.map((item) => sanitizeExternalText(item, 400)), createdAt: new Date().toISOString() };
  await persist({ ...room, stage: input.fixKind === 'configuration' ? 'fix_pending' : 'diagnosing', incidents: [...room.incidents, incident] });
  return incident;
}

export async function importRooms(value: unknown) {
  if (!Array.isArray(value)) throw new Error('Import must contain an array of project rooms.');
  for (const room of value as ProjectRoom[]) {
    if (!room?.intent?.id || !getRecipe(room.intent.recipeId)) throw new Error('Import contains an invalid project room.');
    await persist(room);
  }
}
