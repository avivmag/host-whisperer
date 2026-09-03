import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, Bot, Check, ChevronRight, CircleAlert, Cloud, Code2, Download, ExternalLink, HeartPulse, MessageSquareText, Play, RefreshCw, Server, ShieldCheck, Sparkles, TerminalSquare, Upload } from 'lucide-react';
import { getRecipe, recipes } from './recipes';
import { approveOperation, getSnapshot, hydrateRooms, importRooms, reportIncident, subscribe } from './state';
import type { ProjectRoom, ProviderId } from './types';
import { hasWebMcp, registerWebMcpTools } from './webmcp';

const providerMarks: Record<ProviderId, string> = { aws: 'AWS', gcp: 'G', cloudflare: 'CF', vercel: '▲', netlify: 'N', render: 'R', shopify: 'S' };
const stages = ['Report', 'Investigate', 'Explain', 'Approve', 'Verify'];

function stageIndex(room: ProjectRoom) {
  if (room.stage === 'reported') return 0;
  if (room.stage === 'investigating') return 1;
  if (room.stage === 'diagnosed') return 2;
  if (room.stage === 'awaiting_approval') return 3;
  return 4;
}

function CapabilityBadge({ value }: { value: string }) {
  return <span className={`capability capability-${value}`}><span />{value.replace('-', ' ')}</span>;
}

function ProviderRail({ selected, onSelect }: { selected: ProviderId; onSelect: (provider: ProviderId) => void }) {
  return <aside className="provider-rail" aria-label="Provider recipes">
    <div className="rail-label">Provider</div>
    {recipes.map((recipe) => <button key={recipe.provider} className={selected === recipe.provider ? 'provider-button active' : 'provider-button'} onClick={() => onSelect(recipe.provider)} title={recipe.providerName}>
      <span className="provider-mark">{providerMarks[recipe.provider]}</span>
      <span>{recipe.providerName}</span>
      {recipe.capability === 'live-tested' && <span className="live-dot" title="Live tested" />}
      {recipe.capability === 'proof-ready' && <span className="proof-dot" title="Ready for live proof" />}
    </button>)}
    <div className="rail-spacer" />
    <div className="mcp-b-note"><Bot size={16} /><span>MCP-B<br />compatible</span></div>
  </aside>;
}

function EmptyRoom({ provider, onCreated }: { provider: ProviderId; onCreated: (room: ProjectRoom) => void }) {
  const recipe = recipes.find((item) => item.provider === provider)!;
  const [name, setName] = useState('My production app');
  const [reportedIssue, setReportedIssue] = useState('My latest deployment failed and I don’t understand the error.');
  const [resourceRef, setResourceRef] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try { onCreated(await reportIncident({ name, reportedIssue, resourceRef, provider, recipeId: recipe.id })); }
    finally { setBusy(false); }
  };

  return <main className="empty-layout">
    <section className="hero-copy">
      <div className="eyebrow"><Sparkles size={15} /> Your AI software operator</div>
      <h1>Tell me what’s<br /><em>broken.</em></h1>
      <p>Describe the symptom in plain English. Host Whisperer investigates with your provider’s official tools, explains the cause, repairs it with approval, and verifies recovery.</p>
      <div className="trust-row"><span><Activity size={17} /> Automatic investigation</span><span><MessageSquareText size={17} /> Plain-English diagnosis</span><span><ShieldCheck size={17} /> You approve changes</span></div>
    </section>
    <section className="new-room-card">
      <div className="card-heading"><div><span className="provider-mark large">{providerMarks[provider]}</span></div><div><span>Existing {recipe.providerName} project</span><h2>Start an investigation</h2></div><CapabilityBadge value={recipe.capability} /></div>
      <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
      <label>What are you seeing?<textarea value={reportedIssue} onChange={(event) => setReportedIssue(event.target.value)} rows={4} maxLength={800} /></label>
      <label>Service URL or ID <small>optional</small><input value={resourceRef} onChange={(event) => setResourceRef(event.target.value)} maxLength={500} placeholder="The agent can discover this if you don’t know it" /></label>
      <button className="primary-button" onClick={create} disabled={busy || !name.trim() || reportedIssue.trim().length < 8}>{busy ? <RefreshCw className="spin" size={18} /> : <MessageSquareText size={18} />} Start investigation <ArrowRight size={18} /></button>
      <p className="agent-hint"><Bot size={16} /> Or tell ChatGPT: “Find out why my {recipe.providerName} app is failing.”</p>
    </section>
  </main>;
}

function Timeline({ room }: { room: ProjectRoom }) {
  if (room.operations.length === 0) return <div className="empty-timeline"><TerminalSquare size={27} /><strong>Investigation ready</strong><span>Your agent can inspect status, logs, and health without approval.</span></div>;
  return <div className="timeline">
    {[...room.operations].reverse().map((operation) => <article className="timeline-item" key={operation.id}>
      <div className={`timeline-icon ${operation.status}`}>{operation.status === 'failed' ? <CircleAlert size={17} /> : operation.status === 'succeeded' ? <Check size={17} /> : <Play size={15} />}</div>
      <div><div className="timeline-title"><strong>{operation.type.replace('_', ' ')}</strong><span>{operation.status}</span></div><p>{operation.summary ?? `${operation.handoff.suggestedTool} is ready for the provider MCP.`}</p>{operation.url && <a href={operation.url} target="_blank" rel="noreferrer">Open deployment <ExternalLink size={13} /></a>}</div>
      <time>{new Date(operation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
    </article>)}
  </div>;
}

function ProjectRoomView({ room }: { room: ProjectRoom }) {
  const recipe = getRecipe(room.intent.recipeId)!;
  const active = stageIndex(room);
  const pending = [...room.operations].reverse().find((operation) => operation.status === 'prepared' && operation.approvalRequired);
  const latest = room.operations.at(-1);
  const incident = room.incidents.at(-1);

  return <main className="room-layout">
    <header className="room-header">
      <div><div className="room-title-row"><span className="provider-mark large">{providerMarks[room.intent.provider]}</span><div><span className="muted">{recipe.providerName} / {recipe.name}</span><h1>{room.intent.name}</h1></div></div></div>
      <div className="header-status"><CapabilityBadge value={recipe.capability} /><span className={`stage-pill stage-${room.stage}`}>{room.stage.replace('_', ' ')}</span></div>
    </header>
    <nav className="stepper" aria-label="Incident progress">{stages.map((label, index) => <div key={label} className={index <= active ? 'step active' : 'step'}><span>{index < active ? <Check size={14} /> : index + 1}</span><strong>{label}</strong>{index < stages.length - 1 && <i />}</div>)}</nav>
    <div className="room-grid">
      <section className="panel intent-panel">
        <div className="panel-title"><div><CircleAlert size={18} /><span>Issue report</span></div><span>plain English</span></div>
        <p className="goal">{room.intent.reportedIssue}</p>
        <dl><div><dt>Provider</dt><dd>{recipe.providerName}</dd></div><div><dt>Project type</dt><dd>{recipe.name}</dd></div><div><dt>Resource</dt><dd>{room.intent.resourceRef ?? 'Discover automatically'}</dd></div></dl>
        <div className="cost-note"><Cloud size={17} /><div><strong>Chosen-provider cost note</strong><p>{recipe.cost.summary}</p><a href={recipe.cost.sourceUrl} target="_blank" rel="noreferrer">Source · checked {recipe.cost.checkedAt}</a></div></div>
      </section>
      <section className="panel plan-panel">
        <div className="panel-title"><div><Code2 size={18} /><span>Operator plan</span></div><a href={recipe.docsUrl} target="_blank" rel="noreferrer">Official docs <ExternalLink size={12} /></a></div>
        <div className="artifact-list">{['Inspect current deployment', 'Read relevant logs', 'Check the reported symptom'].map((step) => <div key={step}><HeartPulse size={15} /><code>{step}</code><ChevronRight size={15} /></div>)}</div>
        <div className="command"><span>→</span><code>explain cause · propose repair · verify recovery</code></div>
        <div className="connection"><span className={recipe.mcpUrl ? 'connection-dot connected' : 'connection-dot'} /><div><strong>{recipe.mcpUrl ? 'Official MCP handoff' : 'CLI / dashboard handoff'}</strong><small>{recipe.mcpUrl ?? recipe.handoffNotes[0]}</small></div></div>
      </section>
      {pending && <section className="approval-card">
        <div className="approval-icon"><ShieldCheck size={25} /></div><div className="approval-copy"><span>Your approval is required</span><h3>Repair: {pending.type.replace('_', ' ')} via {recipe.providerName}</h3><p>The execution handoff stays hidden from the agent until you approve this exact change.</p><pre>{JSON.stringify(pending.handoff.arguments, null, 2)}</pre></div>
        <button className="approve-button" onClick={() => approveOperation(room.intent.id, pending.id)}><Check size={17} /> Approve repair</button>
      </section>}
      <section className="panel operations-panel">
        <div className="panel-title"><div><Activity size={18} /><span>Investigation timeline</span></div><span>{room.operations.length} checks</span></div><Timeline room={room} />
      </section>
      <section className="panel observe-panel">
        <div className="panel-title"><div><HeartPulse size={18} /><span>Diagnosis & recovery</span></div><span className={room.stage === 'recovered' ? 'health good' : latest?.status === 'failed' ? 'health bad' : 'health'}>{room.stage}</span></div>
        {latest?.logExcerpt ? <pre className="logs">{latest.logExcerpt}</pre> : <div className="observe-empty"><Server size={24} /><p>Provider logs will appear here as untrusted evidence—not agent instructions.</p></div>}
        {incident && <div className="diagnosis"><div><Bot size={17} /><strong>Diagnosis · {incident.confidence} confidence</strong></div><p>{incident.cause}</p><ul>{incident.proposedChanges.map((change) => <li key={change}>{change}</li>)}</ul></div>}
      </section>
    </div>
  </main>;
}

export default function App() {
  const rooms = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [provider, setProvider] = useState<ProviderId>('render');
  const [activeId, setActiveId] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRoom = useMemo(() => activeId ? rooms.find((room) => room.intent.id === activeId) : rooms.find((room) => room.intent.provider === provider), [rooms, activeId, provider]);
  const webMcp = hasWebMcp();

  useEffect(() => { void hydrateRooms(); }, []);
  useEffect(() => {
    let controller: AbortController | null = null;
    let disposed = false;
    void registerWebMcpTools().then((value) => {
      if (disposed) value?.abort();
      else controller = value;
    }).catch((error) => { if (!disposed) console.error('WebMCP registration failed', error); });
    return () => { disposed = true; controller?.abort(); };
  }, [rooms.length, rooms.map((room) => `${room.stage}:${room.incidents.length}`).join('|')]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(rooms, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'host-whisperer-incidents.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const importData = async (file?: File) => { if (file) await importRooms(JSON.parse(await file.text())); };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-glyph">hw</span><span>Host Whisperer</span></a><div className="top-actions">
      <span className={webMcp ? 'webmcp-status available' : 'webmcp-status'}><span />{webMcp ? 'AI operator ready' : 'WebMCP unavailable'}</span>
      {rooms.length > 0 && <select aria-label="Active incident" value={activeRoom?.intent.id ?? ''} onChange={(event) => { const room = rooms.find((item) => item.intent.id === event.target.value); setActiveId(event.target.value); if (room) setProvider(room.intent.provider); }}><option value="" disabled>Select incident</option>{rooms.map((room) => <option key={room.intent.id} value={room.intent.id}>{room.intent.name}</option>)}</select>}
      <button className="icon-button" onClick={exportData} disabled={!rooms.length} title="Export incident rooms"><Download size={17} /></button>
      <button className="icon-button" onClick={() => inputRef.current?.click()} title="Import incident rooms"><Upload size={17} /></button>
      <input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => void importData(event.target.files?.[0])} />
    </div></header>
    {!webMcp && <div className="browser-banner"><CircleAlert size={16} /><span>Open this page in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled. The human interface still works here.</span></div>}
    <div className="app-body"><ProviderRail selected={provider} onSelect={(value) => { setProvider(value); setActiveId(rooms.find((room) => room.intent.provider === value)?.intent.id); }} />{activeRoom ? <ProjectRoomView room={activeRoom} /> : <EmptyRoom provider={provider} onCreated={(room) => { setProvider(room.intent.provider); setActiveId(room.intent.id); }} />}</div>
    <footer><span>Host Whisperer · Your AI software operator</span><span>You describe the problem. Your agent handles the operation.</span></footer>
  </div>;
}
