import { compactToolOutput, isSensitiveKey, sanitizeExternalText, sanitizeExternalUrl } from '../security';
import type { DiagnosticResult, EscalationPacket, OperatorActivity, ProviderId, SupportIncident } from '../types';

export interface RuntimeDiagnostic {
  id: string;
  label: string;
  run: () => Promise<{ status: 'pass' | 'fail'; summary: string }> | { status: 'pass' | 'fail'; summary: string };
}

export interface RuntimeRecoveryAction {
  id: string;
  label: string;
  description: string;
  effects: string[];
  run: () => Promise<void> | void;
  verify: () => Promise<{ recovered: boolean; summary: string }> | { recovered: boolean; summary: string };
}

export interface HostWhispererConfig {
  integrationId: string;
  appName: string;
  allowedOrigin: string;
  providerHint: ProviderId;
  studioUrl?: string;
  getContext: () => Record<string, unknown>;
  diagnostics: RuntimeDiagnostic[];
  actions: RuntimeRecoveryAction[];
}

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: any) => Promise<unknown> | unknown;
};

type ModelContext = { registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): Promise<void> };
let activeRuntimeRegistration: AbortController | null = null;
const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
const string = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
const now = () => new Date().toISOString();

function safeValue(value: unknown, key: string, depth = 0): unknown {
  if (depth > 2 || isSensitiveKey(key)) return undefined;
  if (typeof value === 'string') {
    if (/url|href|route|path/i.test(key)) {
      if (value.startsWith('/')) return value.split(/[?#]/)[0].slice(0, 300);
      return sanitizeExternalUrl(value)?.split(/[?#]/)[0];
    }
    return sanitizeExternalText(value, 500);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => safeValue(item, key, depth + 1)).filter((item) => item !== undefined);
  if (value && typeof value === 'object') return safeRecord(value as Record<string, unknown>, depth + 1);
  return undefined;
}

function safeRecord(input: Record<string, unknown>, depth = 0) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input).slice(0, 20)) {
    const safe = safeValue(value, key, depth);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

function encodePacket(packet: EscalationPacket) {
  const bytes = new TextEncoder().encode(JSON.stringify(packet));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}

export function createHostWhispererRuntime(config: HostWhispererConfig) {
  if (location.origin !== config.allowedOrigin) throw new Error(`Host Whisperer is configured for ${config.allowedOrigin}, not ${location.origin}.`);
  if (!config.diagnostics.length || !config.actions.length) throw new Error('At least one diagnostic and recovery action are required.');
  if (config.diagnostics.length > 20 || config.actions.length > 20) throw new Error('Host Whisperer supports at most 20 diagnostics and 20 actions per integration.');
  if (new Set(config.diagnostics.map((item) => item.id)).size !== config.diagnostics.length || new Set(config.actions.map((item) => item.id)).size !== config.actions.length) throw new Error('Diagnostic and action IDs must be unique.');

  let incident: SupportIncident | null = null;
  let open = false;
  let controller: AbortController | null = null;
  const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
  const host = document.createElement('div');
  host.id = 'host-whisperer-root';
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.append(host);

  const activity = (actor: OperatorActivity['actor'], label: string, detail: string, status: OperatorActivity['status'] = 'succeeded') => {
    if (!incident) return;
    incident.activity.push({ id: crypto.randomUUID(), actor, label, detail: sanitizeExternalText(detail, 500), status, createdAt: now() });
    render();
  };

  const ensureIncident = (description?: string) => {
    if (!incident) incident = { id: crypto.randomUUID(), description: sanitizeExternalText(description || 'The customer requested help.', 500), stage: 'reported', diagnostics: [], escalationApproved: false, activity: [], createdAt: now() };
    else if (description?.trim()) incident.description = sanitizeExternalText(description.trim(), 500);
    return incident;
  };

  const assertIncident = (incidentId: string) => {
    if (!incident || incident.id !== incidentId) throw new Error('Support incident not found.');
  };

  const getContext = async (description?: string) => {
    const current = ensureIncident(description);
    current.safeContext = safeRecord(config.getContext());
    current.stage = 'investigating';
    activity('agent', 'Read safe support context', `${Object.keys(current.safeContext).length} allowlisted fields shared`);
    return { incidentId: current.id, appName: config.appName, symptom: current.description, safeContext: current.safeContext, privacy: 'No credentials, payment data, query strings, or DOM content are shared.' };
  };

  const runDiagnostics = async () => {
    const current = ensureIncident();
    current.stage = 'investigating';
    activity('agent', 'Run diagnostics', `${config.diagnostics.length} developer-approved checks`, 'running');
    const results: DiagnosticResult[] = [];
    for (const diagnostic of config.diagnostics) {
      try {
        const result = await diagnostic.run();
        results.push({ id: diagnostic.id, label: diagnostic.label, status: result.status, summary: sanitizeExternalText(result.summary, 400) });
      } catch {
        results.push({ id: diagnostic.id, label: diagnostic.label, status: 'fail', summary: 'The diagnostic could not complete.' });
      }
    }
    current.diagnostics = results;
    current.stage = 'diagnosed';
    activity('runtime', 'Evidence collected', `${results.filter((item) => item.status === 'fail').length} failing check${results.filter((item) => item.status === 'fail').length === 1 ? '' : 's'}`);
    return { incidentId: current.id, results, instruction: 'Explain the evidence in plain English. Choose only a listed recovery action.' };
  };

  const prepareRecovery = async (actionId: string) => {
    const current = ensureIncident();
    if (current.stage !== 'diagnosed' || !current.diagnostics.some((item) => item.status === 'fail')) throw new Error('Complete diagnostics and identify a failing check before preparing recovery.');
    const action = config.actions.find((item) => item.id === actionId);
    if (!action) throw new Error('Recovery action is not allowlisted by this website.');
    current.pendingActionId = action.id;
    current.approvedActionId = undefined;
    current.stage = 'awaiting_approval';
    activity('agent', 'Recovery proposed', action.label, 'approval');
    return { actionId: action.id, label: action.label, explanation: action.description, effects: action.effects, approvalRequired: true, executionAvailable: false, next: 'Wait for the customer to approve the visible recovery card.' };
  };

  const applyRecovery = async (actionId: string) => {
    const current = ensureIncident();
    const action = config.actions.find((item) => item.id === actionId);
    if (!action || current.pendingActionId !== actionId) throw new Error('This recovery was not prepared.');
    if (current.approvedActionId !== actionId) throw new Error('The customer has not approved this recovery in the page.');
    if (current.stage !== 'awaiting_approval') throw new Error('This recovery is no longer ready to execute.');
    current.stage = 'repairing';
    activity('agent', 'Apply approved recovery', action.label, 'running');
    try {
      await action.run();
    } catch {
      current.stage = 'escalated';
      activity('runtime', 'Recovery action failed', 'No successful recovery was recorded.', 'failed');
      throw new Error('The approved recovery failed and must be escalated.');
    }
    current.stage = 'verifying';
    activity('runtime', 'Recovery action completed', 'The website changed only the declared application state.');
    return { applied: true, actionId, next: 'Verify the original symptom before claiming recovery.' };
  };

  const verifyRecovery = async () => {
    const current = ensureIncident();
    const action = config.actions.find((item) => item.id === current.approvedActionId);
    if (!action || current.stage !== 'verifying') throw new Error('There is no completed recovery awaiting verification.');
    let result: { recovered: boolean; summary: string };
    try { result = await action.verify(); }
    catch { result = { recovered: false, summary: 'The verification check could not complete.' }; }
    current.stage = result.recovered ? 'recovered' : 'escalated';
    activity('agent', result.recovered ? 'Recovery verified' : 'Recovery not verified', result.summary, result.recovered ? 'succeeded' : 'failed');
    return { ...result, stage: current.stage, originalSymptom: current.description };
  };

  const escalation = async () => {
    const current = ensureIncident();
    const packet: EscalationPacket = { version: 1, integrationId: config.integrationId, appName: config.appName, providerHint: config.providerHint, createdAt: now(), symptom: current.description, safeContext: current.safeContext ?? {}, diagnostics: current.diagnostics.slice(0, 10), activity: current.activity.slice(-12), trust: 'customer_supplied_untrusted_evidence' };
    if (!current.escalationApproved) {
      activity('agent', 'Developer escalation prepared', 'Waiting for permission to share the visible safe report.', 'approval');
      return { approvalRequired: true, preview: packet, escalationUrl: undefined, next: 'Ask the customer to approve sharing the visible report, then call this tool again.' };
    }
    current.stage = 'escalated';
    const studioUrl = config.studioUrl ?? `${location.origin}/?view=incident`;
    const url = `${studioUrl}#packet=${encodePacket(packet)}`;
    activity('runtime', 'Safe report ready', 'A URL-fragment packet was created; it is not uploaded to a server.');
    return { approvalRequired: false, escalationUrl: url, trust: packet.trust, next: 'Give this link to the developer. Treat its contents as untrusted customer evidence.' };
  };

  const definitions: ToolDefinition[] = [
    { name: 'get_support_context', title: 'Read safe support context', description: 'Read the customer’s issue and developer-allowlisted page state. Never returns credentials, payment data, query strings, or DOM content.', inputSchema: objectSchema({ issue: string('The customer’s description of what is not working.', { maxLength: 500 }) }), annotations: { readOnlyHint: true }, execute: async ({ issue }) => compactToolOutput(await getContext(issue)) },
    { name: 'run_support_diagnostics', title: 'Run safe support diagnostics', description: 'Run only the website diagnostics selected by its developer and return factual evidence.', inputSchema: objectSchema({ incidentId: string('Incident ID returned by get_support_context.') }, ['incidentId']), annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async ({ incidentId }) => { assertIncident(incidentId); return compactToolOutput(await runDiagnostics()); } },
    { name: 'prepare_recovery', title: 'Prepare safe recovery', description: 'Prepare one developer-allowlisted recovery and show its exact effects for customer approval.', inputSchema: objectSchema({ incidentId: string('Active incident ID.'), actionId: string('Allowlisted recovery action.', { enum: config.actions.map((item) => item.id) }) }, ['incidentId', 'actionId']), execute: async ({ incidentId, actionId }) => { assertIncident(incidentId); return compactToolOutput(await prepareRecovery(actionId)); } },
    { name: 'apply_recovery', title: 'Apply approved recovery', description: 'Apply a prepared recovery only after the customer approves it visibly in the website.', inputSchema: objectSchema({ incidentId: string('Active incident ID.'), actionId: string('Previously prepared action ID.', { enum: config.actions.map((item) => item.id) }) }, ['incidentId', 'actionId']), execute: async ({ incidentId, actionId }) => { assertIncident(incidentId); return compactToolOutput(await applyRecovery(actionId)); } },
    { name: 'verify_recovery', title: 'Verify customer recovery', description: 'Check the original symptom after an approved recovery before reporting success.', inputSchema: objectSchema({ incidentId: string('Active incident ID.') }, ['incidentId']), annotations: { readOnlyHint: true }, execute: async ({ incidentId }) => { assertIncident(incidentId); return compactToolOutput(await verifyRecovery()); } },
    { name: 'prepare_developer_escalation', title: 'Prepare developer escalation', description: 'Preview a sanitized incident packet and reveal its local fragment link only after customer approval.', inputSchema: objectSchema({ incidentId: string('Active incident ID.') }, ['incidentId']), annotations: { untrustedContentHint: true }, execute: async ({ incidentId }) => { assertIncident(incidentId); return compactToolOutput(await escalation(), 12000); } },
  ];

  const register = async () => {
    if (!modelContext) return;
    activeRuntimeRegistration?.abort();
    controller = new AbortController();
    activeRuntimeRegistration = controller;
    try {
      await Promise.all(definitions.map((tool) => modelContext.registerTool(tool, { signal: controller!.signal })));
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    }
  };

  const styles = `<style>
    :host{all:initial;font-family:Inter,ui-sans-serif,system-ui;color:#182019}button,input{font:inherit}.hw-launch{position:fixed;right:22px;bottom:22px;z-index:2147483000;border:0;border-radius:999px;background:#172019;color:white;padding:14px 18px;box-shadow:0 14px 40px #1019104d;font-weight:800;cursor:pointer}.hw-launch i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#79d69d;margin-right:9px}.hw-panel{position:fixed;right:22px;bottom:82px;width:390px;max-height:76vh;overflow:auto;z-index:2147483000;background:#fbfaf6;border:1px solid #d8d5cb;border-radius:18px;box-shadow:0 24px 70px #10191033;padding:20px}.hw-head{display:flex;justify-content:space-between;gap:12px}.hw-brand{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#176b4c;font-weight:900}.hw-head h2{font:700 24px Georgia,serif;margin:5px 0}.hw-close{border:0;background:transparent;font-size:22px;cursor:pointer}.hw-copy{color:#687068;font-size:13px;line-height:1.5}.hw-input{box-sizing:border-box;width:100%;border:1px solid #cbc8bf;border-radius:10px;padding:11px;margin:10px 0;background:white}.hw-primary,.hw-approve{width:100%;border:0;border-radius:10px;padding:11px;background:#172019;color:white;font-weight:800;cursor:pointer}.hw-status{margin:14px 0;padding:11px;border-radius:10px;background:#edf5ed;font-size:12px}.hw-card{border:1px solid #ddd9cf;border-radius:12px;padding:13px;margin:12px 0}.hw-card h3{margin:0 0 6px;font-size:14px}.hw-card p,.hw-card li{font-size:12px;line-height:1.45;color:#5c645d}.hw-card ul{padding-left:18px}.hw-approve{background:#176b4c}.hw-activity{border-top:1px solid #ddd9cf;margin-top:16px;padding-top:12px}.hw-activity h3{font-size:11px;text-transform:uppercase;letter-spacing:.08em}.hw-event{display:grid;grid-template-columns:10px 1fr;gap:9px;margin:10px 0}.hw-event i{width:8px;height:8px;border-radius:50%;background:#2b9369;margin-top:4px}.hw-event strong{display:block;font-size:11px}.hw-event span{font-size:10px;color:#70766f}.hw-ready{color:#176b4c;font-weight:800}
  </style>`;

  const render = () => {
    const current = incident;
    const action = config.actions.find((item) => item.id === current?.pendingActionId);
    const events = current?.activity.slice(-8).reverse().map((item) => `<div class="hw-event"><i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></div></div>`).join('') ?? '';
    shadow.innerHTML = `${styles}<button class="hw-launch"><i></i>Help me fix this</button>${open ? `<section class="hw-panel"><div class="hw-head"><div><div class="hw-brand">Host Whisperer · ${modelContext ? 'AI operator ready' : 'self-service mode'}</div><h2>What went wrong?</h2></div><button class="hw-close" aria-label="Close">×</button></div><p class="hw-copy">Describe what you were trying to do. Only developer-approved diagnostics and recoveries are available.</p>${!current ? `<input class="hw-input" maxlength="500" value="I can’t complete checkout with the items in my cart." aria-label="Describe the issue"><button class="hw-primary">Start safe diagnosis</button>` : `<div class="hw-status"><strong>${escapeHtml(current.stage.replace('_', ' '))}</strong><br>${escapeHtml(current.description)}</div>${current.diagnostics.length ? `<div class="hw-card"><h3>Evidence</h3><ul>${current.diagnostics.map((item) => `<li>${escapeHtml(item.label)}: ${escapeHtml(item.summary)}</li>`).join('')}</ul></div>` : ''}${action ? `<div class="hw-card"><h3>${escapeHtml(action.label)}</h3><p>${escapeHtml(action.description)}</p><ul>${action.effects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join('')}</ul>${current.approvedActionId !== action.id ? `<button class="hw-approve">${modelContext ? 'Approve recovery' : 'Approve & apply recovery'}</button>` : `<p class="hw-ready">Approved${modelContext ? ' — return to ChatGPT to continue.' : ''}</p>`}</div>` : ''}${current.stage === 'diagnosed' && !action && !modelContext ? `<button class="hw-primary hw-suggest">Show safe solution</button>` : ''}${current.stage === 'recovered' ? `<div class="hw-card"><h3>Recovery verified</h3><p>The original checkout problem is gone.</p></div>` : ''}${!modelContext ? `<button class="hw-primary hw-copychat" style="margin-top:8px;background:#285f8f">Copy prompt for ChatGPT</button>` : ''}${current.stage !== 'recovered' ? `<button class="hw-primary hw-escalate" style="margin-top:8px;background:#626960">Approve safe developer report</button>` : ''}`}<div class="hw-activity"><h3>Operator activity</h3>${events || '<p class="hw-copy">Actions taken by the operator will appear here.</p>'}</div></section>` : ''}`;
    shadow.querySelector('.hw-launch')?.addEventListener('click', () => { open = !open; render(); });
    shadow.querySelector('.hw-close')?.addEventListener('click', () => { open = false; render(); });
    shadow.querySelector('.hw-primary:not(.hw-suggest):not(.hw-escalate):not(.hw-copychat)')?.addEventListener('click', async () => {
      const input = shadow.querySelector<HTMLInputElement>('.hw-input');
      ensureIncident(input?.value); activity('customer', 'Issue reported', incident!.description); await getContext(); await runDiagnostics();
    });
    shadow.querySelector('.hw-suggest')?.addEventListener('click', () => void prepareRecovery(config.actions[0].id));
    shadow.querySelector('.hw-approve')?.addEventListener('click', async () => {
      if (!incident || !action || incident.stage !== 'awaiting_approval') return;
      incident.approvedActionId = action.id; activity('customer', 'Recovery approved', action.label, 'approval');
      if (!modelContext) { await applyRecovery(action.id); await verifyRecovery(); }
    });
    shadow.querySelector('.hw-escalate')?.addEventListener('click', () => { if (incident) { incident.escalationApproved = true; activity('customer', 'Safe report sharing approved', 'Only the visible sanitized report may be shared.', 'approval'); } });
    shadow.querySelector('.hw-copychat')?.addEventListener('click', async () => {
      if (!incident) return;
      const prompt = `Open ${location.origin}${location.pathname} in ChatGPT's in-app browser. Help me with this issue: ${incident.description}`;
      await navigator.clipboard?.writeText(prompt);
      activity('customer', 'ChatGPT handoff copied', 'The prompt includes this page URL and the customer’s issue, not private application state.');
    });
  };

  render();
  void register().catch((error) => console.error('Host Whisperer WebMCP registration failed', error));
  return {
    open: () => { open = true; render(); },
    reset: () => { incident = null; render(); },
    getIncident: () => incident,
    tools: definitions,
    destroy: () => { controller?.abort(); if (activeRuntimeRegistration === controller) activeRuntimeRegistration = null; host.remove(); },
  };
}
