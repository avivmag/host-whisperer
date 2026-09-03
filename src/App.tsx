import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, Bot, Check, CheckCircle2, ChevronRight, CircleAlert, Cloud, Code2, Download, ExternalLink, FileJson, HeartPulse, LockKeyhole, MessageSquareText, Play, RefreshCw, Server, ShieldCheck, Sparkles, TerminalSquare, Upload } from 'lucide-react';
import { getRecipe, recipes } from './recipes';
import { approveOperation, createRoom, getSnapshot, hydrateRooms, importRooms, subscribe } from './state';
import type { ProjectRoom, ProviderId } from './types';
import { hasWebMcp, registerWebMcpTools } from './webmcp';

const providerMarks: Record<ProviderId, string> = { aws: 'AWS', gcp: 'G', cloudflare: 'CF', vercel: '▲', netlify: 'N', render: 'R', shopify: 'S' };
const stages = ['Brief', 'Plan', 'Approve', 'Execute', 'Observe'];

function stageIndex(room: ProjectRoom) {
  if (room.stage === 'planned' || room.stage === 'draft') return 1;
  if (room.stage === 'awaiting_approval') return 2;
  if (room.stage === 'approved' || room.stage === 'executing') return 3;
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
  const [name, setName] = useState('My first project');
  const [goal, setGoal] = useState('Create a small, reliable web project that is easy to operate.');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try { onCreated(await createRoom({ name, goal, provider, recipeId: recipe.id, requirements: ['Public HTTPS URL', 'Low operational overhead'], configKeys: provider === 'render' ? ['PUBLIC_SITE_TITLE'] : [] })); }
    finally { setBusy(false); }
  };

  return <main className="empty-layout">
    <section className="hero-copy">
      <div className="eyebrow"><Sparkles size={15} /> Human + agent operations</div>
      <h1>Tell your agent what<br />you want to <em>ship.</em></h1>
      <p>Host Whisperer turns the conversation into a visible, reviewable project plan—then hands approved work to the provider’s official tools.</p>
      <div className="trust-row"><span><ShieldCheck size={17} /> Human approval</span><span><LockKeyhole size={17} /> No cloud keys stored</span><span><Activity size={17} /> Auditable results</span></div>
    </section>
    <section className="new-room-card">
      <div className="card-heading"><div><span className="provider-mark large">{providerMarks[provider]}</span></div><div><span>New {recipe.providerName} project</span><h2>{recipe.name}</h2></div><CapabilityBadge value={recipe.capability} /></div>
      <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /></label>
      <label>What should it do?<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={4} maxLength={600} /></label>
      <button className="primary-button" onClick={create} disabled={busy || !name.trim() || goal.trim().length < 8}>{busy ? <RefreshCw className="spin" size={18} /> : <MessageSquareText size={18} />} Create project room <ArrowRight size={18} /></button>
      <p className="agent-hint"><Bot size={16} /> Or tell ChatGPT: “Create a {recipe.name} project room for…”</p>
    </section>
  </main>;
}

function Timeline({ room }: { room: ProjectRoom }) {
  if (room.operations.length === 0) return <div className="empty-timeline"><TerminalSquare size={27} /><strong>No operations yet</strong><span>Ask your agent to prepare project creation.</span></div>;
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
    <nav className="stepper" aria-label="Project progress">{stages.map((label, index) => <div key={label} className={index <= active ? 'step active' : 'step'}><span>{index < active ? <Check size={14} /> : index + 1}</span><strong>{label}</strong>{index < stages.length - 1 && <i />}</div>)}</nav>
    <div className="room-grid">
      <section className="panel intent-panel">
        <div className="panel-title"><div><FileJson size={18} /><span>Project intent</span></div><span>portable</span></div>
        <p className="goal">{room.intent.goal}</p>
        <dl><div><dt>Runtime</dt><dd>{recipe.runtime}</dd></div><div><dt>Recipe</dt><dd>{recipe.name}</dd></div><div><dt>Configuration</dt><dd>{room.intent.configKeys.length ? room.intent.configKeys.join(', ') : 'None required'}</dd></div></dl>
        <div className="cost-note"><Cloud size={17} /><div><strong>Chosen-provider cost note</strong><p>{recipe.cost.summary}</p><a href={recipe.cost.sourceUrl} target="_blank" rel="noreferrer">Source · checked {recipe.cost.checkedAt}</a></div></div>
      </section>
      <section className="panel plan-panel">
        <div className="panel-title"><div><Code2 size={18} /><span>Provider plan</span></div><a href={recipe.docsUrl} target="_blank" rel="noreferrer">Official docs <ExternalLink size={12} /></a></div>
        <div className="artifact-list">{recipe.artifacts.map((artifact) => <div key={artifact}><FileJson size={15} /><code>{artifact}</code><CheckCircle2 size={15} /></div>)}</div>
        <div className="command"><span>$</span><code>{recipe.commands[0]}</code></div>
        <div className="connection"><span className={recipe.mcpUrl ? 'connection-dot connected' : 'connection-dot'} /><div><strong>{recipe.mcpUrl ? 'Official MCP handoff' : 'CLI / dashboard handoff'}</strong><small>{recipe.mcpUrl ?? recipe.handoffNotes[0]}</small></div></div>
      </section>
      {pending && <section className="approval-card">
        <div className="approval-icon"><ShieldCheck size={25} /></div><div className="approval-copy"><span>Human approval required</span><h3>{pending.type.replace('_', ' ')} via {recipe.providerName}</h3><p>The agent prepared <code>{pending.handoff.suggestedTool}</code>. Review the arguments before allowing the provider action.</p><pre>{JSON.stringify(pending.handoff.arguments, null, 2)}</pre></div>
        <button className="approve-button" onClick={() => approveOperation(room.intent.id, pending.id)}><Check size={17} /> Approve action</button>
      </section>}
      <section className="panel operations-panel">
        <div className="panel-title"><div><Activity size={18} /><span>Operation timeline</span></div><span>{room.operations.length} events</span></div><Timeline room={room} />
      </section>
      <section className="panel observe-panel">
        <div className="panel-title"><div><HeartPulse size={18} /><span>Observe & diagnose</span></div><span className={latest?.status === 'failed' ? 'health bad' : latest?.status === 'succeeded' ? 'health good' : 'health'}>{latest?.status ?? 'waiting'}</span></div>
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
    });
    return () => { disposed = true; controller?.abort(); };
  }, [rooms.length, rooms.map((room) => `${room.stage}:${room.incidents.length}`).join('|')]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(rooms, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'host-whisperer-projects.json'; anchor.click(); URL.revokeObjectURL(url);
  };
  const importData = async (file?: File) => { if (file) await importRooms(JSON.parse(await file.text())); };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-glyph">hw</span><span>Host Whisperer</span></a><div className="top-actions">
      <span className={webMcp ? 'webmcp-status available' : 'webmcp-status'}><span />{webMcp ? 'WebMCP ready' : 'WebMCP unavailable'}</span>
      {rooms.length > 0 && <select aria-label="Active project" value={activeRoom?.intent.id ?? ''} onChange={(event) => { const room = rooms.find((item) => item.intent.id === event.target.value); setActiveId(event.target.value); if (room) setProvider(room.intent.provider); }}><option value="" disabled>Select project</option>{rooms.map((room) => <option key={room.intent.id} value={room.intent.id}>{room.intent.name}</option>)}</select>}
      <button className="icon-button" onClick={exportData} disabled={!rooms.length} title="Export project rooms"><Download size={17} /></button>
      <button className="icon-button" onClick={() => inputRef.current?.click()} title="Import project rooms"><Upload size={17} /></button>
      <input ref={inputRef} type="file" accept="application/json" hidden onChange={(event) => void importData(event.target.files?.[0])} />
    </div></header>
    {!webMcp && <div className="browser-banner"><CircleAlert size={16} /><span>Open this page in ChatGPT’s in-app browser or Chrome 149+ with WebMCP enabled. The human interface still works here.</span></div>}
    <div className="app-body"><ProviderRail selected={provider} onSelect={(value) => { setProvider(value); setActiveId(rooms.find((room) => room.intent.provider === value)?.intent.id); }} />{activeRoom ? <ProjectRoomView room={activeRoom} /> : <EmptyRoom provider={provider} onCreated={(room) => { setProvider(room.intent.provider); setActiveId(room.intent.id); }} />}</div>
    <footer><span>Host Whisperer · Local-first project operations</span><span>Every write waits for you.</span></footer>
  </div>;
}
