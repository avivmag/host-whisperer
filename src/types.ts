export const providers = ['aws', 'gcp', 'cloudflare', 'vercel', 'netlify', 'render', 'shopify'] as const;
export type ProviderId = (typeof providers)[number];

export type SupportPlaybook = 'commerce-cart';
export type SupportStage = 'idle' | 'reported' | 'investigating' | 'diagnosed' | 'awaiting_approval' | 'repairing' | 'verifying' | 'recovered' | 'escalated';

export interface SupportIntegration {
  id: string;
  appName: string;
  allowedOrigin: string;
  provider: ProviderId;
  resourceRef?: string;
  playbook: SupportPlaybook;
  createdAt: string;
  updatedAt: string;
  bundlePrepared: boolean;
}

export interface DiagnosticResult {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  summary: string;
}

export interface OperatorActivity {
  id: string;
  actor: 'customer' | 'agent' | 'runtime';
  label: string;
  detail: string;
  status: 'running' | 'succeeded' | 'failed' | 'approval';
  createdAt: string;
}

export interface SupportIncident {
  id: string;
  description: string;
  stage: SupportStage;
  safeContext?: Record<string, unknown>;
  diagnostics: DiagnosticResult[];
  pendingActionId?: string;
  approvedActionId?: string;
  escalationApproved: boolean;
  activity: OperatorActivity[];
  createdAt: string;
}

export interface EscalationPacket {
  version: 1;
  integrationId: string;
  appName: string;
  providerHint: ProviderId;
  createdAt: string;
  symptom: string;
  safeContext: Record<string, unknown>;
  diagnostics: DiagnosticResult[];
  activity: OperatorActivity[];
  trust: 'customer_supplied_untrusted_evidence';
}
