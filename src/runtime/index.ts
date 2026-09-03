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
  run: (report?: (label: string, detail: string) => void) => Promise<void> | void;
  verify: () => Promise<{ recovered: boolean; summary: string }> | { recovered: boolean; summary: string };
}

export interface HostWhispererConfig {
  integrationId: string;
  appName: string;
  allowedOrigin: string;
  providerHint: ProviderId;
  studioUrl?: string;
  agentLabel?: string;
  revealDelayMs?: number;
  anchorTo?: () => Element | null;
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

  const agentLabel = config.agentLabel ?? 'Codex';
  let incident: SupportIncident | null = null;
  let open = false;
  let revealed = !config.revealDelayMs;
  let revealTimer: number | null = null;
  let anchorFrame: number | null = null;
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
        activity('runtime', diagnostic.label, result.summary, result.status === 'pass' ? 'succeeded' : 'failed');
      } catch {
        results.push({ id: diagnostic.id, label: diagnostic.label, status: 'fail', summary: 'The diagnostic could not complete.' });
        activity('runtime', diagnostic.label, 'The diagnostic could not complete.', 'failed');
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
      await action.run((label, detail) => activity('runtime', label, detail));
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
    :host{all:initial;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;color:#14170f;-webkit-font-smoothing:antialiased}
    button,input{font:inherit;color:inherit}
    .hw-launch{position:fixed;right:22px;bottom:22px;z-index:2147483000;display:block;width:292px;text-align:left;border:1px solid #c7cebb;border-radius:16px;background:#fff;color:#14170f;padding:14px 16px 13px;box-shadow:0 18px 44px rgba(28,38,18,.22);cursor:pointer;animation:hw-enter .5s cubic-bezier(.2,.9,.3,1.25) both,hw-nudge 4.4s 1.2s ease-in-out infinite}
    .hw-launch.anchored{right:auto;bottom:auto}
    .hw-launch::before{content:'';position:absolute;left:-8px;top:28px;width:14px;height:14px;background:#fff;border-left:1px solid #c7cebb;border-bottom:1px solid #c7cebb;transform:rotate(45deg);opacity:0}
    .hw-launch.anchored::before{opacity:1}
    .hw-launch:hover{border-color:#a9d431;box-shadow:0 22px 54px rgba(28,38,18,.27)}
    .hw-launch-head{display:flex;align-items:center;gap:9px;font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#4d7c0f}
    .hw-launch-head i{flex:none;width:9px;height:9px;border-radius:50%;background:#8fc61a;box-shadow:0 0 0 0 rgba(143,198,26,.55);animation:hw-pulse 2s infinite}
    .hw-launch-copy{display:block;margin:9px 0 0;font-size:14.5px;line-height:1.5;color:#14170f}
    .hw-launch-cta{display:inline-block;margin-top:11px;border:1px solid #a9d431;border-radius:999px;background:#cbf24d;color:#1a2405;font-size:13.5px;font-weight:700;padding:7px 15px}
    .hw-panel{position:fixed;right:22px;bottom:22px;width:392px;max-height:76vh;overflow:auto;z-index:2147483000;background:#fff;border:1px solid #c7cebb;border-radius:16px;box-shadow:0 28px 70px rgba(28,38,18,.24);padding:20px;animation:hw-arrive .25s ease-out}
    .hw-panel::-webkit-scrollbar{width:8px}.hw-panel::-webkit-scrollbar-thumb{background:#dde1d4;border-radius:8px}
    .hw-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .hw-brand{font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#4d7c0f}
    .hw-head h2{font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-size:23px;font-weight:600;letter-spacing:-.02em;margin:7px 0 0}
    .hw-close{border:0;background:transparent;color:#8b937f;font-size:23.5px;line-height:1;cursor:pointer;padding:0 2px}
    .hw-close:hover{color:#14170f}
    .hw-copy{color:#5b6353;font-size:14.5px;line-height:1.55;margin:8px 0 0}
    .hw-input{box-sizing:border-box;width:100%;border:1px solid #c7cebb;border-radius:9px;padding:11px;margin:12px 0 9px;background:#f6f7f2;color:#14170f;font-size:15px}
    .hw-input:focus{outline:0;border-color:#7ba90f;box-shadow:0 0 0 3px rgba(123,169,15,.18)}
    .hw-primary,.hw-approve{width:100%;border:1px solid #a9d431;border-radius:10px;padding:12px;background:#cbf24d;color:#1a2405;font-size:15.5px;font-weight:700;cursor:pointer}
    .hw-primary:hover,.hw-approve:hover{background:#d8fb6b}
    .hw-copychat,.hw-escalate{background:#fff;border-color:#c7cebb;color:#14170f;font-weight:600}
    .hw-copychat:hover,.hw-escalate:hover{background:#f1f3ec;border-color:#14170f}
    .hw-status{margin:14px 0;padding:11px 12px;border:1px solid #dde1d4;border-radius:10px;background:#f6f7f2;font-size:14px;color:#5b6353}
    .hw-status strong{color:#4d7c0f;font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em}
    .hw-card{border:1px solid #dde1d4;border-radius:12px;padding:14px;margin:12px 0;background:#fbfcf8;animation:hw-arrive .28s ease-out}
    .hw-card h3{margin:0 0 7px;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-size:16px;font-weight:600}
    .hw-card p,.hw-card li{font-size:14px;line-height:1.5;color:#5b6353}
    .hw-card ul{padding-left:17px;margin:8px 0}
    .hw-approve{margin-top:10px}
    .hw-ready{color:#4d7c0f;font-size:14px;font-weight:600;margin:10px 0 0}
    .hw-activity{border-top:1px solid #dde1d4;margin-top:16px;padding-top:13px}
    .hw-activity h3{margin:0;font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#8b937f}
    .hw-event{display:grid;grid-template-columns:8px 1fr;gap:10px;margin:11px 0;animation:hw-event-in .36s ease-out}
    .hw-event i{width:7px;height:7px;border-radius:50%;background:#0d7d6b;margin-top:4px;box-shadow:0 0 0 3px #e2f4f0}
    .hw-event.running i{background:#a55a00;box-shadow:0 0 0 3px #fbefdb;animation:hw-pulse 1s infinite}
    .hw-event.failed i{background:#b42318;box-shadow:0 0 0 3px #fdeceb}
    .hw-event.approval i{background:#7ba90f;box-shadow:0 0 0 3px #eff8d6}
    .hw-event strong{display:block;font:500 13px 'JetBrains Mono',ui-monospace,monospace;color:#14170f}
    .hw-event span{display:block;margin-top:2px;font-size:12.5px;color:#7d8674;line-height:1.45}
    .hw-agent-request{border:1px solid #bcdc70;background:#eff8d6;border-radius:12px;padding:14px;margin:12px 0}
    .hw-agent-request span{display:block;font:500 10.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#4d7c0f;margin-bottom:6px}
    .hw-agent-request strong{font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-size:18.5px;font-weight:600}
    .hw-agent-request p{color:#5b6353;font-size:13px;line-height:1.5;margin:8px 0 0}
    @keyframes hw-arrive{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}
    @keyframes hw-enter{from{opacity:0;transform:translateX(30px) scale(.93)}to{opacity:1;transform:none}}
    @keyframes hw-nudge{0%,84%,100%{transform:none}87%{transform:translateX(-6px) rotate(-1.7deg)}90%{transform:translateX(5px) rotate(1.4deg)}93%{transform:translateX(-3px) rotate(-.8deg)}96%{transform:translateX(1px)}}
    @media (prefers-reduced-motion:reduce){.hw-launch{animation:hw-enter .01s both}.hw-launch-head i{animation:none}}
    @keyframes hw-event-in{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}
    @keyframes hw-pulse{70%{box-shadow:0 0 0 8px transparent}}
  </style>`;

  const positionLauncher = () => {
    const launcher = shadow.querySelector<HTMLElement>('.hw-launch');
    if (!launcher) return;
    const anchor = config.anchorTo?.();
    const rect = anchor?.getBoundingClientRect();
    const width = launcher.offsetWidth || 292;
    const fits = rect && rect.right + width + 34 <= window.innerWidth && rect.bottom > 8 && rect.top < window.innerHeight - 8;
    if (!fits) {
      launcher.classList.remove('anchored');
      launcher.style.left = launcher.style.top = '';
      return;
    }
    launcher.classList.add('anchored');
    launcher.style.left = `${Math.round(rect!.right + 18)}px`;
    launcher.style.top = `${Math.round(Math.min(Math.max(rect!.top - 6, 14), window.innerHeight - launcher.offsetHeight - 14))}px`;
  };

  const schedulePosition = () => {
    if (anchorFrame !== null) return;
    anchorFrame = requestAnimationFrame(() => { anchorFrame = null; positionLauncher(); });
  };

  const render = () => {
    const current = incident;
    const action = config.actions.find((item) => item.id === current?.pendingActionId);
    const events = current?.activity.slice(-10).reverse().map((item) => `<div class="hw-event ${escapeHtml(item.status)}"><i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></div></div>`).join('') ?? '';
    const launcher = revealed && !open ? `<button class="hw-launch" aria-label="Ask ${escapeHtml(agentLabel)} about this error"><span class="hw-launch-head"><i></i>${escapeHtml(agentLabel)}</span><span class="hw-launch-copy">That\u2019s a server error on their side \u2014 not something you did. Want me to look into it?</span><span class="hw-launch-cta">Ask ${escapeHtml(agentLabel)}</span></button>` : '';
    shadow.innerHTML = `${styles}${launcher}${open ? `<section class="hw-panel"><div class="hw-head"><div><div class="hw-brand">Host Whisperer · ${modelContext ? 'AI operator ready' : 'self-service mode'}</div><h2>${current ? 'Working on your issue' : 'Get help without a ticket'}</h2></div><button class="hw-close" aria-label="Close">×</button></div><p class="hw-copy">Only developer-approved diagnostics and recoveries are available.</p>${!current ? (modelContext ? `<div class="hw-agent-request"><span>Tell ${escapeHtml(agentLabel)}</span><strong>“Fix checkout safely.”</strong><p>That one request lets the agent use the tools installed on this page. Its work will appear here live.</p></div>` : `<input class="hw-input" maxlength="500" value="I can’t complete checkout with the items in my cart." aria-label="Describe the issue"><button class="hw-primary">Start safe diagnosis</button>`) : `<div class="hw-status"><strong>${escapeHtml(current.stage.replace('_', ' '))}</strong><br>${escapeHtml(current.description)}</div>${current.diagnostics.length ? `<div class="hw-card"><h3>Evidence</h3><ul>${current.diagnostics.map((item) => `<li>${escapeHtml(item.label)}: ${escapeHtml(item.summary)}</li>`).join('')}</ul></div>` : ''}${action ? `<div class="hw-card"><h3>${escapeHtml(action.label)}</h3><p>${escapeHtml(action.description)}</p><ul>${action.effects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join('')}</ul>${current.approvedActionId !== action.id ? `<button class="hw-approve">${modelContext ? 'Approve recovery' : 'Approve & apply recovery'}</button>` : `<p class="hw-ready">Approved${modelContext ? ' — the AI can continue.' : ''}</p>`}</div>` : ''}${current.stage === 'diagnosed' && !action && !modelContext ? `<button class="hw-primary hw-suggest">Show safe solution</button>` : ''}${current.stage === 'recovered' ? `<div class="hw-card"><h3>Recovery verified</h3><p>The original checkout problem is gone.</p></div>` : ''}${!modelContext ? `<button class="hw-primary hw-copychat" style="margin-top:8px">Copy prompt for ChatGPT</button>` : ''}${current.stage !== 'recovered' ? `<button class="hw-primary hw-escalate" style="margin-top:8px">Approve safe developer report</button>` : ''}`}<div class="hw-activity"><h3>Live operator activity</h3>${events || '<p class="hw-copy">The AI’s steps will appear here as it uses each website tool.</p>'}</div></section>` : ''}`;
    positionLauncher();
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
  window.addEventListener('scroll', schedulePosition, { passive: true });
  window.addEventListener('resize', schedulePosition);
  if (config.revealDelayMs) revealTimer = window.setTimeout(() => { revealed = true; render(); }, config.revealDelayMs);
  void register().catch((error) => console.error('Host Whisperer WebMCP registration failed', error));
  return {
    open: () => { revealed = true; open = true; render(); },
    reset: () => { incident = null; render(); },
    getIncident: () => incident,
    tools: definitions,
    destroy: () => {
      controller?.abort();
      if (activeRuntimeRegistration === controller) activeRuntimeRegistration = null;
      if (revealTimer !== null) clearTimeout(revealTimer);
      if (anchorFrame !== null) cancelAnimationFrame(anchorFrame);
      window.removeEventListener('scroll', schedulePosition);
      window.removeEventListener('resize', schedulePosition);
      host.remove();
    },
  };
}
