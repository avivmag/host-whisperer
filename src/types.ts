export const providers = ['aws', 'gcp', 'cloudflare', 'vercel', 'netlify', 'render', 'shopify'] as const;
export type ProviderId = (typeof providers)[number];
export type CapabilityStatus = 'proof-ready' | 'live-tested' | 'handoff-ready' | 'manual';
export type RoomStage = 'draft' | 'planned' | 'awaiting_approval' | 'approved' | 'executing' | 'succeeded' | 'failed' | 'diagnosing' | 'fix_pending' | 'fixed';
export type OperationType = 'create' | 'inspect' | 'fetch_logs' | 'update_config' | 'redeploy' | 'health_check';

export interface CostNote {
  summary: string;
  assumptions: string[];
  sourceUrl: string;
  checkedAt: string;
}

export interface ProviderRecipe {
  id: string;
  provider: ProviderId;
  providerName: string;
  name: string;
  description: string;
  runtime: string;
  capability: CapabilityStatus;
  mcpUrl?: string;
  docsUrl: string;
  artifacts: string[];
  commands: string[];
  supportedOperations: OperationType[];
  cost: CostNote;
  handoffNotes: string[];
}

export interface ProjectIntent {
  id: string;
  name: string;
  goal: string;
  provider: ProviderId;
  recipeId: string;
  requirements: string[];
  configKeys: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPlan {
  projectId: string;
  recipeId: string;
  capability: CapabilityStatus;
  artifacts: string[];
  commands: string[];
  connection: { kind: 'mcp' | 'manual'; url?: string; instructions: string };
  cost: CostNote;
  warnings: string[];
}

export interface ProviderHandoff {
  provider: ProviderId;
  serverUrl?: string;
  suggestedTool: string;
  arguments: Record<string, unknown>;
  postcondition: string;
}

export interface OperationRecord {
  id: string;
  type: OperationType;
  status: 'prepared' | 'approved' | 'executing' | 'succeeded' | 'failed';
  approvalRequired: boolean;
  approvedAt?: string;
  handoff: ProviderHandoff;
  summary?: string;
  resourceId?: string;
  url?: string;
  logExcerpt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Incident {
  id: string;
  operationId: string;
  cause: string;
  confidence: 'low' | 'medium' | 'high';
  evidence: string[];
  fixKind: 'configuration' | 'code';
  proposedChanges: string[];
  verification: string[];
  createdAt: string;
}

export interface ProjectRoom {
  intent: ProjectIntent;
  plan: ProviderPlan;
  stage: RoomStage;
  operations: OperationRecord[];
  incidents: Incident[];
}
