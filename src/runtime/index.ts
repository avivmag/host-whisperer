import { isSensitiveKey, sanitizeExternalText, sanitizeExternalUrl } from '../security';
import type { DiagnosticResult, OperatorActivity, ProviderId, SupportIncident } from '../types';

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
  let approvalWaiter: { actionId: string; promise: Promise<boolean>; resolve: (approved: boolean) => void } | null = null;
  const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
  let registrationState: 'unsupported' | 'registering' | 'ready' | 'failed' = modelContext ? 'registering' : 'unsupported';
  const host = document.createElement('div');
  host.id = 'host-whisperer-root';
  const shadow = host.attachShadow({ mode: 'open' });
  document.body.append(host);

  const activity = (actor: OperatorActivity['actor'], label: string, detail: string, status: OperatorActivity['status'] = 'succeeded') => {
    if (!incident) return null;
    const id = crypto.randomUUID();
    incident.activity.push({ id, actor, label, detail: sanitizeExternalText(detail, 500), status, createdAt: now() });
    render();
    return id;
  };

  const finishActivity = (id: string | null, detail: string, status: OperatorActivity['status'] = 'succeeded') => {
    const event = incident?.activity.find((item) => item.id === id);
    if (!event) return;
    event.detail = sanitizeExternalText(detail, 500);
    event.status = status;
    render();
  };

  const ensureIncident = (description?: string) => {
    if (!incident) incident = { id: crypto.randomUUID(), description: sanitizeExternalText(description || 'The customer requested help.', 500), stage: 'reported', diagnostics: [], escalationApproved: false, activity: [], createdAt: now() };
    else if (description?.trim()) incident.description = sanitizeExternalText(description.trim(), 500);
    return incident;
  };

  const getContext = async (description?: string) => {
    const current = ensureIncident(description);
    current.safeContext = safeRecord(config.getContext());
    current.stage = 'investigating';
    activity('agent', 'Gathering incident data', 'Collecting only the website signals approved for support.');
    return { incidentId: current.id, appName: config.appName, symptom: current.description, safeContext: current.safeContext, privacy: 'No credentials, payment data, query strings, or DOM content are shared.' };
  };

  const runDiagnostics = async () => {
    const current = ensureIncident();
    current.stage = 'investigating';
    const filingEvent = activity('agent', 'Filing support report', 'Attaching the website’s approved health checks.', 'running');
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
    finishActivity(filingEvent, 'The support report is ready.');
    activity('runtime', 'Sending for inspection', 'Host Whisperer received the report and is choosing a safe response.');
    return { results };
  };

  const prepareRecovery = async (actionId: string) => {
    const current = ensureIncident();
    if (current.stage !== 'diagnosed' || !current.diagnostics.some((item) => item.status === 'fail')) throw new Error('Complete diagnostics and identify a failing check before preparing recovery.');
    const action = config.actions.find((item) => item.id === actionId);
    if (!action) throw new Error('Recovery action is not allowlisted by this website.');
    current.pendingActionId = action.id;
    current.approvedActionId = undefined;
    current.stage = 'awaiting_approval';
    activity('runtime', 'Resolution ready', 'A bounded resolution is ready for your approval.', 'approval');
    return { actionId: action.id, label: action.label, explanation: action.description, effects: action.effects, approvalRequired: true, executionAvailable: false, next: 'Wait for the customer to approve the visible recovery card.' };
  };

  const waitForRecoveryApproval = async (actionId: string) => {
    if (incident?.approvedActionId === actionId) return;
    if (!approvalWaiter || approvalWaiter.actionId !== actionId) {
      let resolve!: (approved: boolean) => void;
      const promise = new Promise<boolean>((settle) => { resolve = settle; });
      approvalWaiter = { actionId, promise, resolve };
    }
    const approved = await approvalWaiter.promise;
    if (!approved || incident?.approvedActionId !== actionId) throw new Error('Recovery approval was cancelled.');
  };

  const finishApprovalWait = (approved: boolean) => {
    const waiter = approvalWaiter;
    approvalWaiter = null;
    waiter?.resolve(approved);
  };

  const applyRecovery = async (actionId: string) => {
    const current = ensureIncident();
    const action = config.actions.find((item) => item.id === actionId);
    if (!action || current.pendingActionId !== actionId) throw new Error('This recovery was not prepared.');
    if (current.approvedActionId !== actionId) throw new Error('The customer has not approved this recovery in the page.');
    if (current.stage !== 'awaiting_approval') throw new Error('This recovery is no longer ready to execute.');
    current.stage = 'repairing';
    const applyingEvent = activity('agent', 'Applying approved resolution', 'Host Whisperer is working with the hosting service.', 'running');
    try {
      await action.run((label, detail) => activity('runtime', label, detail));
    } catch {
      current.stage = 'escalated';
      finishActivity(applyingEvent, 'Host Whisperer could not apply the bounded resolution.', 'failed');
      throw new Error('The approved recovery failed and must be escalated.');
    }
    finishActivity(applyingEvent, 'The hosting service completed the bounded resolution.');
    current.stage = 'verifying';
    activity('runtime', 'Verifying service', 'Checking that the original request succeeds now.');
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
    activity('agent', result.recovered ? 'Issue resolved' : 'Developer attention needed', result.recovered ? 'The service is responding normally again.' : 'Host Whisperer could not verify a safe resolution.', result.recovered ? 'succeeded' : 'failed');
    return { ...result, stage: current.stage, originalSymptom: current.description };
  };

  const askHostWhisperer = async (issue?: string) => {
    await getContext(issue);
    const diagnosis = await runDiagnostics();
    if (!diagnosis.results.some((item) => item.status === 'fail')) {
      incident!.stage = 'recovered';
      activity('agent', 'Issue resolved', 'The service is already responding normally.');
      return { status: 'resolved', customerMessage: 'Checkout is available. Ask the customer to try again.' };
    }

    const action = config.actions[0];
    await prepareRecovery(action.id);
    await waitForRecoveryApproval(action.id);
    try {
      await applyRecovery(action.id);
      const verification = await verifyRecovery();
      return verification.recovered
        ? { status: 'resolved', customerMessage: 'Checkout is available again. Ask the customer to try again.' }
        : { status: 'needs_developer', customerMessage: 'Host Whisperer could not verify a safe resolution. Tell the customer that the issue has been escalated.' };
    } catch {
      return { status: 'needs_developer', customerMessage: 'Host Whisperer could not complete a safe resolution. Tell the customer that the issue has been escalated.' };
    }
  };

  const definitions: ToolDefinition[] = [{
    name: 'ask_host_whisperer_to_fix_issue',
    title: 'Ask Host Whisperer to resolve this issue',
    description: 'Delegate a checkout or website failure to Host Whisperer. The website gathers its approved support signals, requests visible customer approval before changing service state, applies the allowlisted resolution, verifies the result, and returns a short customer-facing status.',
    inputSchema: objectSchema({ issue: string('A short customer description of what failed.', { maxLength: 500 }) }, ['issue']),
    execute: async ({ issue }) => askHostWhisperer(issue),
  }];

  const register = async () => {
    if (!modelContext) return;
    activeRuntimeRegistration?.abort();
    controller = new AbortController();
    activeRuntimeRegistration = controller;
    try {
      await Promise.all(definitions.map((tool) => modelContext.registerTool(tool, { signal: controller!.signal })));
      registrationState = 'ready';
      render();
    } catch (error) {
      if (!controller.signal.aborted) {
        registrationState = 'failed';
        render();
        console.error('Host Whisperer Website Tool registration failed', error);
      }
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
    .hw-primary,.hw-approve{width:100%;border:1px solid #a9d431;border-radius:10px;padding:12px;background:#cbf24d;color:#1a2405;font-size:15.5px;font-weight:700;cursor:pointer}
    .hw-primary:hover,.hw-approve:hover{background:#d8fb6b}
    .hw-primary{margin-top:12px;background:#fff;border-color:#c7cebb;color:#14170f;font-weight:600}
    .hw-primary:hover{background:#f1f3ec;border-color:#14170f}
    .hw-prompt{display:flex;align-items:center;gap:10px;margin:12px 0 0;padding:12px;border:1px solid #bcdc70;border-radius:12px;background:#eff8d6}
    .hw-prompt code{flex:1;font:500 14px 'JetBrains Mono',ui-monospace,monospace;line-height:1.5;color:#2f3627}
    .hw-copy-btn{flex:none;align-self:stretch;border:1px solid #a9d431;border-radius:9px;padding:0 14px;background:#cbf24d;color:#1a2405;font-size:13.5px;font-weight:700;cursor:pointer}
    .hw-copy-btn:hover{background:#d8fb6b}
    .hw-note{margin:11px 0 0;font-size:13px;line-height:1.5;color:#7d8674}
    .hw-warn{margin:11px 0 0;font-size:13px;line-height:1.5;color:#a55a00}
    .hw-status{margin:14px 0;padding:11px 12px;border:1px solid #dde1d4;border-radius:10px;background:#f6f7f2;font-size:14px;color:#5b6353}
    .hw-status strong{color:#4d7c0f;font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.12em}
    .hw-card{border:1px solid #dde1d4;border-radius:12px;padding:14px;margin:12px 0;background:#fbfcf8;animation:hw-arrive .28s ease-out}
    .hw-card h3{margin:0 0 7px;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-size:16px;font-weight:600}
    .hw-card p,.hw-card li{font-size:14px;line-height:1.5;color:#5b6353}
    .hw-card ul{padding-left:17px;margin:8px 0}
    .hw-approve{margin-top:12px}
    .hw-card.hw-good{border-color:#bcdc70;background:#eff8d6}
    .hw-activity{border-top:1px solid #dde1d4;margin-top:16px;padding-top:13px}
    .hw-activity.off{display:none}
    .hw-activity h3{margin:0;font:500 11.5px 'JetBrains Mono',ui-monospace,monospace;text-transform:uppercase;letter-spacing:.14em;color:#8b937f}
    .hw-activity-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .hw-ring{position:relative;width:32px;height:32px;flex:none}
    .hw-ring svg{width:32px;height:32px;transform:rotate(-90deg);display:block}
    .hw-ring circle{fill:none;stroke-width:3.2;stroke-linecap:round}
    .hw-ring-track{stroke:#dde1d4}
    .hw-ring-fill{stroke:#0d7d6b;transition:stroke-dashoffset .45s ease,stroke .3s ease}
    .hw-ring.waiting .hw-ring-fill{stroke:#a55a00}
    .hw-ring.done .hw-ring-fill{stroke:#4d7c0f}
    .hw-ring.failed .hw-ring-fill{stroke:#b42318}
    .hw-ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 9.5px 'JetBrains Mono',ui-monospace,monospace;letter-spacing:-.03em;color:#8b937f}
    .hw-ring.waiting .hw-ring-num{color:#a55a00}
    .hw-ring.done .hw-ring-num{color:#4d7c0f}
    .hw-ring.failed .hw-ring-num{color:#b42318}
    .hw-event{display:grid;grid-template-columns:8px 1fr;gap:10px;margin:11px 0;animation:hw-event-in .36s ease-out}
    .hw-event i{width:7px;height:7px;border-radius:50%;background:#0d7d6b;margin-top:4px;box-shadow:0 0 0 3px #e2f4f0}
    .hw-event.running i{background:#a55a00;box-shadow:0 0 0 3px #fbefdb;animation:hw-pulse 1s infinite}
    .hw-event.failed i{background:#b42318;box-shadow:0 0 0 3px #fdeceb}
    .hw-event.approval i{background:#7ba90f;box-shadow:0 0 0 3px #eff8d6}
    .hw-event strong{display:block;font:500 13px 'JetBrains Mono',ui-monospace,monospace;color:#14170f}
    .hw-event span{display:block;margin-top:2px;font-size:12.5px;color:#7d8674;line-height:1.45}
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

  /* The panel is built once and then patched in place. Re-writing the
     whole shadow root on every activity event made the dialog visibly
     flash and replay its entry animation while a repair was running. */
  const ringLength = 2 * Math.PI * 15.5;
  const panelSkeleton = `<section class="hw-panel"><div class="hw-head"><div><div class="hw-brand"></div><h2 class="hw-title"></h2></div><button class="hw-close" aria-label="Close">×</button></div><div class="hw-body"></div><div class="hw-activity off"><div class="hw-activity-head"><h3>Progress</h3><div class="hw-ring"><svg viewBox="0 0 36 36"><circle class="hw-ring-track" cx="18" cy="18" r="15.5"></circle><circle class="hw-ring-fill" cx="18" cy="18" r="15.5" stroke-dasharray="${ringLength}" stroke-dashoffset="${ringLength}"></circle></svg><span class="hw-ring-num">0</span></div></div><div class="hw-events"></div></div></section>`;

  /* How far along the one bounded repair is. The bar stalls at the
     approval stage on purpose: that is where the customer decides. */
  const stageProgress: Record<SupportIncident['stage'], number> = { idle: 0, reported: .08, investigating: .28, diagnosed: .44, awaiting_approval: .44, repairing: .72, verifying: .88, recovered: 1, escalated: 1 };

  const renderRing = () => {
    const ring = shadow.querySelector('.hw-ring');
    const fill = shadow.querySelector('.hw-ring-fill');
    if (!ring || !fill) return;
    const stage = incident?.stage ?? 'idle';
    const value = stageProgress[stage] ?? 0;
    const state = stage === 'awaiting_approval' ? 'waiting' : stage === 'escalated' ? 'failed' : stage === 'recovered' ? 'done' : '';
    if (ring.className !== `hw-ring ${state}`) ring.className = `hw-ring ${state}`;
    fill.setAttribute('stroke-dashoffset', String(ringLength * (1 - value)));
    setText('.hw-ring-num', String(Math.round(value * 100)));
  };
  const htmlCache = new Map<string, string>();
  const eventNodes = new Map<string, HTMLElement>();
  const handoffPrompt = 'Ask Host Whisperer to fix checkout on this page.';
  let copied = false;
  let copyTimer: number | null = null;

  const setHtml = (selector: string, html: string) => {
    if (htmlCache.get(selector) === html) return;
    const node = shadow.querySelector(selector);
    if (!node) return;
    htmlCache.set(selector, html);
    node.innerHTML = html;
  };

  const setText = (selector: string, value: string) => {
    const node = shadow.querySelector(selector);
    if (node && node.textContent !== value) node.textContent = value;
  };

  const renderEvents = () => {
    const list = shadow.querySelector('.hw-events');
    const section = shadow.querySelector('.hw-activity');
    const items = incident?.activity.slice(-10) ?? [];
    section?.classList.toggle('off', !items.length);
    if (!list) return;
    for (const item of items) {
      const existing = eventNodes.get(item.id);
      if (existing) {
        if (existing.className !== `hw-event ${item.status}`) existing.className = `hw-event ${item.status}`;
        const detail = existing.querySelector('span');
        if (detail && detail.textContent !== item.detail) detail.textContent = item.detail;
        continue;
      }
      const node = document.createElement('div');
      node.className = `hw-event ${item.status}`;
      node.innerHTML = `<i></i><div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></div>`;
      eventNodes.set(item.id, node);
      list.append(node);
    }
    while (list.childElementCount > 10) list.firstElementChild?.remove();
  };

  const render = () => {
    const current = incident;
    const agentReady = registrationState === 'ready';
    const action = config.actions.find((item) => item.id === current?.pendingActionId);
    const awaitingApproval = !!action && current?.stage === 'awaiting_approval' && current.approvedActionId !== action.id;

    setHtml('.hw-launch-slot', revealed && !open
      ? `<button class="hw-launch" aria-label="Ask ${escapeHtml(agentLabel)} about this error"><span class="hw-launch-head"><i></i>${escapeHtml(agentLabel)}</span><span class="hw-launch-copy">The store’s checkout just fell over. Want me to go and get it fixed?</span><span class="hw-launch-cta">Ask ${escapeHtml(agentLabel)}</span></button>`
      : '');

    const panelSlot = shadow.querySelector('.hw-panel-slot');
    if (!panelSlot) return;
    if (!open) {
      if (panelSlot.firstChild) {
        panelSlot.replaceChildren();
        eventNodes.clear();
        for (const key of ['.hw-brand', '.hw-title', '.hw-body']) htmlCache.delete(key);
      }
      positionLauncher();
      return;
    }
    if (!panelSlot.firstChild) {
      panelSlot.innerHTML = panelSkeleton;
      eventNodes.clear();
      for (const key of ['.hw-brand', '.hw-title', '.hw-body']) htmlCache.delete(key);
    }

    setText('.hw-brand', `Host Whisperer · ${agentReady ? 'support agent connected' : registrationState === 'registering' ? 'connecting website tool' : registrationState === 'failed' ? 'website tool unavailable' : 'self-service mode'}`);
    setText('.hw-title', !current ? 'Get help without a ticket'
      : current.stage === 'recovered' ? 'All sorted'
        : current.stage === 'escalated' ? 'Handed to a developer'
          : 'Working on it');

    if (!current) {
      /* Nothing has happened yet: say the one thing the customer has to
         do, hand them the words, and stop talking. */
      setHtml('.hw-body', `<p class="hw-copy">Say this to ${escapeHtml(agentLabel)} and it takes over from here.</p>
        <div class="hw-prompt"><code>${escapeHtml(handoffPrompt)}</code><button class="hw-copy-btn">${copied ? 'Copied' : 'Copy'}</button></div>
        <p class="hw-note">You will get one thing to approve. Nothing on the store changes before you say yes.</p>
        ${registrationState === 'failed' ? '<p class="hw-warn">Website Tool unavailable — turn on Website Tools in your browser, or let Host Whisperer try it here.</p>' : ''}
        ${!agentReady ? '<button class="hw-primary hw-self">Let Host Whisperer try it here</button>' : ''}`);
    } else {
      const stageLabel = { reported: 'Request received', investigating: 'Gathering data', diagnosed: 'Under inspection', awaiting_approval: 'Waiting for you', repairing: 'Fixing it', verifying: 'Checking the fix', recovered: 'Resolved', escalated: 'Escalated', idle: 'Ready' }[current.stage];
      const settled = current.stage === 'recovered' || current.stage === 'escalated';
      setHtml('.hw-body', `${settled ? '' : `<div class="hw-status"><strong>${escapeHtml(stageLabel)}</strong><br>${escapeHtml(current.description)}</div>`}
        ${awaitingApproval ? `<div class="hw-card"><h3>${escapeHtml(action!.label)}</h3><p>${escapeHtml(action!.description)}</p><ul>${action!.effects.map((effect) => `<li>${escapeHtml(effect)}</li>`).join('')}</ul><button class="hw-approve">Yes, go ahead</button></div>` : ''}
        ${current.stage === 'diagnosed' && !action && !agentReady ? '<button class="hw-primary hw-suggest">Show the safe fix</button>' : ''}
        ${current.stage === 'recovered' ? '<div class="hw-card hw-good"><h3>Checkout works again</h3><p>Your bag was left exactly as it was. Give it another go.</p></div>' : ''}
        ${current.stage === 'escalated' ? '<div class="hw-card"><h3>Sent to the developer</h3><p>Host Whisperer could not fix this safely, so a human has the details now.</p></div>' : ''}`);
    }
    renderEvents();
    renderRing();
    positionLauncher();
  };

  const startSelfService = async () => {
    ensureIncident('Checkout is not working.');
    activity('customer', 'Issue reported', incident!.description);
    await getContext();
    await runDiagnostics();
  };

  const approve = async () => {
    const action = config.actions.find((item) => item.id === incident?.pendingActionId);
    if (!incident || !action || incident.stage !== 'awaiting_approval') return;
    incident.approvedActionId = action.id;
    activity('customer', 'Resolution approved', 'You approved the visible resolution.', 'approval');
    if (registrationState === 'ready') finishApprovalWait(true);
    else { await applyRecovery(action.id); await verifyRecovery(); }
  };

  const copyPrompt = async () => {
    try { await navigator.clipboard?.writeText(handoffPrompt); } catch { /* the browser refused the clipboard; the text is still on screen */ }
    copied = true;
    render();
    if (copyTimer !== null) clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copied = false; render(); }, 1600);
  };

  /* One delegated listener, so patching the panel never orphans a handler. */
  shadow.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.('button');
    if (!button) return;
    if (button.classList.contains('hw-launch')) { open = true; render(); return; }
    if (button.classList.contains('hw-close')) { open = false; render(); return; }
    if (button.classList.contains('hw-copy-btn')) { void copyPrompt(); return; }
    if (button.classList.contains('hw-self')) { void startSelfService(); return; }
    if (button.classList.contains('hw-suggest')) { void prepareRecovery(config.actions[0].id); return; }
    if (button.classList.contains('hw-approve')) { void approve(); return; }
  });

  shadow.innerHTML = `${styles}<div class="hw-launch-slot"></div><div class="hw-panel-slot"></div>`;
  render();
  window.addEventListener('scroll', schedulePosition, { passive: true });
  window.addEventListener('resize', schedulePosition);
  if (config.revealDelayMs) revealTimer = window.setTimeout(() => { revealed = true; render(); }, config.revealDelayMs);
  void register();
  return {
    open: () => { revealed = true; open = true; render(); },
    reset: () => { finishApprovalWait(false); incident = null; render(); },
    getIncident: () => incident,
    tools: definitions,
    destroy: () => {
      finishApprovalWait(false);
      controller?.abort();
      if (activeRuntimeRegistration === controller) activeRuntimeRegistration = null;
      if (revealTimer !== null) clearTimeout(revealTimer);
      if (copyTimer !== null) clearTimeout(copyTimer);
      if (anchorFrame !== null) cancelAnimationFrame(anchorFrame);
      window.removeEventListener('scroll', schedulePosition);
      window.removeEventListener('resize', schedulePosition);
      host.remove();
    },
  };
}
