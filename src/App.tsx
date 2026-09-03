import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Bell, Bot, Boxes, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, Code2, Copy, CreditCard, Download, Gauge, KeyRound, LayoutDashboard, Lock, LogOut, Minus, PackageCheck, Pause, Play, Plug, Plus, RefreshCw, RotateCcw, Search, ServerCrash, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, TerminalSquare, Trash2, Truck, UserRound, X } from 'lucide-react';
import { createHostWhispererRuntime } from './runtime';
import { buildPluginFile, getStudioSnapshot, hydrateStudio, prepareStudioBundle, subscribeStudio, updateStudioProfile } from './studio';
import { providers, type EscalationPacket, type ProviderId } from './types';

const providerNames: Record<ProviderId, string> = { aws: 'AWS', gcp: 'Google Cloud', cloudflare: 'Cloudflare', vercel: 'Vercel', netlify: 'Netlify', render: 'Render', shopify: 'Shopify' };
const tokenPrefixes: Record<ProviderId, string> = { aws: 'akia', gcp: 'gcp', cloudflare: 'cf', vercel: 'vc', netlify: 'ntl', render: 'rnd', shopify: 'shpat' };
const demoInstallKey = 'host-whisperer-bigpink-installed';
const demoBundleKey = 'host-whisperer-bigpink-bundle-ready';
const agentLabel = 'Codex';

function downloadText(filename: string, value: string, type = 'text/javascript') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function AppHeader({ section }: { section: string }) {
  return <header className="topbar"><a className="brand" href="/"><span className="brand-glyph">hw</span><span className="brand-name">Host Whisperer</span></a><nav className="topbar-nav"><a href="/">How it works</a><a href="/?view=integrate">Connect your host</a><a href="/?view=shop">Live demo</a></nav><span className="topbar-section">{section}</span></header>;
}

function AppFooter({ label }: { label: string }) {
  return <footer className="hw-footer"><span className="brand-glyph small">hw</span><span className="hw-footer-name">{label}</span><span className="hw-footer-note">Developers define the boundaries. Customers stay in control.</span></footer>;
}

/* ------------------------------------------------------------------ */
/* Surface 1 — Host Whisperer: how it works, as an animated diagram.    */
/* ------------------------------------------------------------------ */

type EdgeId = 'req' | 'host' | 'mcp' | 'hw' | 'host2';
type NodeId = 'customer' | 'website' | 'host' | 'hw';
type Mood = 'neutral' | 'angry' | 'thinking' | 'happy';

/* Geometry lives once in <defs>; every line and every travelling dot
   references it, so the drawing and the motion can never drift apart. */
const edgeGeometry: Record<EdgeId, string> = {
  req: 'M258,224 H430',
  host: 'M680,224 C762,224 784,245 852,245',
  mcp: 'M258,316 H430',
  hw: 'M555,382 C555,432 596,452 660,452',
  host2: 'M860,510 C932,500 954,418 954,330',
};

/* An edge can carry a dot outwards, a dot on the way back, or — with
   `both` — one of each at once, for the steps that are a conversation
   rather than a one-way hop. */
type DiagramStep = { title: string; body: string; edges: Array<{ id: EdgeId; back?: boolean; both?: boolean }>; nodes: NodeId[]; focus: 'customer' | 'agent'; tone?: 'bad' | 'good'; mood: Mood };

const diagramSteps: DiagramStep[] = [
  { title: 'The request travels over the API', body: 'A customer action — add to cart, check out, sign in — reaches the website over its REST API, and the website calls the service on its host.', edges: [{ id: 'req' }, { id: 'host' }], nodes: ['customer', 'website', 'host'], focus: 'customer', mood: 'neutral' },
  { title: 'A failure travels back', body: 'The service is unhealthy — a bad deploy, an exhausted instance — so a 5xx returns down the same path and the website can show only a generic error.', edges: [{ id: 'host', back: true }, { id: 'req', back: true }], nodes: ['customer', 'website', 'host'], focus: 'customer', tone: 'bad', mood: 'neutral' },
  { title: 'The customer is stuck', body: 'No context, no recovery, nobody to ask. This is where most journeys quietly end.', edges: [], nodes: ['customer'], focus: 'customer', tone: 'bad', mood: 'angry' },
  { title: 'The agent calls through WebMCP', body: 'The browser agent invokes the WebMCP handoff registered by the open website and delegates the incident to Host Whisperer.', edges: [{ id: 'mcp' }, { id: 'hw' }], nodes: ['customer', 'website', 'hw'], focus: 'agent', mood: 'thinking' },
  { title: 'Host Whisperer works the host', body: 'Host Whisperer privately diagnoses the host, applies the bounded fix after visible approval, and verifies the original request itself.', edges: [{ id: 'host2', both: true }], nodes: ['hw', 'host'], focus: 'agent', mood: 'thinking' },
  { title: 'The outcome comes back', body: 'The agent receives a clear outcome: the issue is resolved and safe to retry, or a sanitized incident is ready for a developer.', edges: [{ id: 'hw', back: true }, { id: 'mcp', back: true }], nodes: ['website', 'customer'], focus: 'agent', tone: 'good', mood: 'thinking' },
  { title: 'The customer is unblocked', body: 'With the service healthy again, the customer retries and continues without opening a support ticket.', edges: [{ id: 'req', both: true }, { id: 'host', both: true }], nodes: ['customer', 'website', 'host'], focus: 'customer', tone: 'good', mood: 'happy' },
];

/* Each node is its own component so an illustrated <image href="…"> can
   replace any one of them later without touching the wiring. */
function CustomerNode({ mood, on, focus }: { mood: Mood; on: boolean; focus: 'customer' | 'agent' }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect className="node-shell" x="38" y="184" width="220" height="198" rx="22" />
    <g className={`customer-role customer-person ${focus === 'customer' ? 'active' : ''}`}>
      <rect x="50" y="196" width="196" height="76" rx="12" />
      <circle className="face-bg" cx="78" cy="226" r="17" />
      <path className="hair" d="M62 224c1-11 7-17 16-17 10 0 16 7 17 18-5-6-11-9-18-9-6 0-11 3-15 8Z" />
      <circle className="ink" cx="72" cy="226" r="1.8" /><circle className="ink" cx="84" cy="226" r="1.8" />
      {mood === 'happy' ? <path className="line" d="M71 233q7 8 14 0" /> : mood === 'angry' ? <path className="line" d="M71 237q7-7 14 0" /> : <path className="line" d="M72 236h12" />}
      <path className="person-shoulders" d="M58 257c4-12 11-18 20-18s17 6 21 18" />
      <text className="dtitle node-title-left" x="108" y="224">Customer</text>
      <text className="dlabel node-label-left" x="108" y="244">uses the website</text>
    </g>
    <path className="role-divider" d="M56 282h184" />
    <g className={`customer-role customer-agent ${focus === 'agent' ? 'active' : ''}`}>
      <rect x="50" y="292" width="196" height="78" rx="12" />
      <g className="bot"><rect x="61" y="310" width="36" height="32" rx="9" /><circle cx="72" cy="326" r="2.5" /><circle cx="86" cy="326" r="2.5" /><path className="line" d="M68 348h22" /></g>
      <text className="dtitle node-title-left" x="108" y="320">Browser agent</text>
      <text className="dlabel node-label-left" x="108" y="340">handles the handoff</text>
    </g>
  </g>;
}

function WebsiteNode({ on, lane }: { on: boolean; lane: 'rest' | 'mcp' | null }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect className="node-shell" x="420" y="116" width="270" height="278" rx="22" />
    <g className="browser-window"><rect x="440" y="139" width="230" height="94" rx="12" /><path d="M440 164h230" /><circle cx="456" cy="151.5" r="3.5" /><circle cx="468" cy="151.5" r="3.5" /><circle cx="480" cy="151.5" r="3.5" /><rect x="457" y="178" width="74" height="8" rx="4" /><rect x="457" y="194" width="128" height="6" rx="3" /><rect x="601" y="177" width="49" height="28" rx="7" /></g>
    <text className="dtitle node-title-left" x="440" y="262">Website in browser</text>
    <g className={`dlane ${lane === 'rest' ? 'on' : ''}`}><rect x="440" y="278" width="103" height="88" rx="13" /><path className="lane-icon" d="M465 310h52M465 321h36M465 332h44" /><text x="491.5" y="351">REST</text></g>
    <g className={`dlane mcp ${lane === 'mcp' ? 'on' : ''}`}><rect x="557" y="278" width="113" height="88" rx="13" /><path className="mcp-mark" d="M580 312l10-10 10 10-10 10-10-10Zm26 0 10-10 10 10-10 10-10-10Zm-13 15 10-10 10 10-10 10-10-10Z" /><text x="613.5" y="351">WebMCP</text></g>
  </g>;
}

function HostNode({ on }: { on: boolean }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect className="node-shell" x="842" y="151" width="214" height="188" rx="22" />
    <g className="host-rack"><rect x="865" y="174" width="168" height="92" rx="12" />{[0, 1, 2].map((row) => <g key={row}><rect x="879" y={186 + row * 23} width="140" height="15" rx="4" /><circle cx="1008" cy={193.5 + row * 23} r="3" /><path d={`M890 ${193.5 + row * 23}h35`} /></g>)}</g>
    <circle className="status-light" cx="879" cy="294" r="5" />
    <text className="dtitle node-title-left" x="893" y="301">Cloud host</text>
  </g>;
}

function WhispererNode({ on }: { on: boolean }) {
  return <g className={`dnode hw ${on ? 'on' : ''}`}>
    <rect className="node-shell" x="548" y="438" width="322" height="130" rx="22" />
    <g className="hw-orb"><circle cx="592" cy="482" r="24" /><path d="M581 482c8-14 16-14 23 0-7 14-15 14-23 0Z" /><circle cx="592" cy="482" r="4" /></g>
    <text className="dtitle node-title-left" x="628" y="476">Host Whisperer</text>
    <text className="dlabel node-label-left" x="628" y="497">deterministic support agent</text>
    <g className="action-pills"><rect x="572" y="522" width="82" height="29" rx="8" /><text x="613" y="541">diagnose</text><rect x="664" y="522" width="82" height="29" rx="8" /><text x="705" y="541">fix</text><rect x="756" y="522" width="90" height="29" rx="8" /><text x="801" y="541">verify</text></g>
  </g>;
}

function FlowDiagram() {
  const reduceMotion = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduceMotion);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % diagramSteps.length), 3400);
    return () => window.clearInterval(timer);
  }, [playing]);

  const step = diagramSteps[index];
  const activeEdges = new Map(step.edges.map((edge) => [edge.id, edge] as const));
  const on = (node: NodeId) => step.nodes.includes(node);
  const lane = activeEdges.has('req') ? 'rest' as const : activeEdges.has('mcp') || activeEdges.has('hw') ? 'mcp' as const : null;
  const tone = step.tone ?? '';

  return <section className="diagram-section">
    <div className="section-head"><div className="section-kicker">How it works</div><h2>One failure, seen from every side</h2></div>
    <div className="diagram-layout">
      <div className="diagram-stage">
        <svg viewBox="0 0 1100 640" className={`hw-diagram mood-${step.mood} ${tone}`} role="img" aria-label={`Step ${index + 1} of ${diagramSteps.length}. ${step.title}. ${step.body}`}>
          <defs>
            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="9" stdDeviation="10" floodColor="#26301c" floodOpacity=".10" /></filter>
            {(Object.entries(edgeGeometry) as Array<[EdgeId, string]>).map(([id, d]) => <path key={id} id={`edge-${id}`} d={d} />)}
          </defs>
          {(Object.keys(edgeGeometry) as EdgeId[]).map((id) => <use key={id} href={`#edge-${id}`} className={`dedge ${activeEdges.has(id) ? `on ${tone}` : ''}`} />)}
          {!reduceMotion && step.edges.flatMap((edge) => (edge.both ? [false, true] : [Boolean(edge.back)]).map((back, pass) =>
            <circle key={`${index}-${edge.id}-${pass}`} className={`ddot ${tone}`} r="7">
              <animateMotion dur="2.6s" begin={`${pass * 1.3}s`} repeatCount="indefinite" calcMode="linear" keyPoints={back ? '1;0' : '0;1'} keyTimes="0;1"><mpath href={`#edge-${edge.id}`} /></animateMotion>
            </circle>))}
          <CustomerNode mood={step.mood} on={on('customer')} focus={step.focus} />
          <WebsiteNode on={on('website')} lane={lane} />
          <HostNode on={on('host')} />
          <WhispererNode on={on('hw')} />
        </svg>
        <div className="diagram-controls">
          <button onClick={() => { setPlaying(false); setIndex((value) => (value + diagramSteps.length - 1) % diagramSteps.length); }} aria-label="Previous step"><ChevronLeft size={16} /></button>
          <button className="play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause' : 'Play'}</button>
          <button onClick={() => { setPlaying(false); setIndex((value) => (value + 1) % diagramSteps.length); }} aria-label="Next step"><ChevronRight size={16} /></button>
        </div>
      </div>
      <ol className="diagram-steps">
        {diagramSteps.map((item, position) => <li key={item.title} className={position === index ? 'on' : position < index ? 'done' : ''}>
          <button onClick={() => { setPlaying(false); setIndex(position); }}><span className="dstep-num">{String(position + 1).padStart(2, '0')}</span><strong>{item.title}</strong>{position === index && <p>{item.body}</p>}</button>
        </li>)}
      </ol>
    </div>
  </section>;
}

/* The hero console replays the exact activity the installed plugin
   writes on the shop page — same labels, same details, same order — so
   the promise on the marketing page and the live demo cannot drift. */
type ConsoleBeat = { label: string; detail: string; tone: 'agent' | 'hold' | 'you' };

const consoleBeats: ConsoleBeat[] = [
  { tone: 'you', label: 'Issue reported', detail: 'Checkout is not working.' },
  { tone: 'agent', label: 'Gathering incident data', detail: 'Collecting only the website signals approved for support.' },
  { tone: 'agent', label: 'Filing support report', detail: 'The support report is ready.' },
  { tone: 'agent', label: 'Sending for inspection', detail: 'Host Whisperer received the report and is choosing a safe response.' },
  { tone: 'hold', label: 'Resolution ready', detail: 'A bounded resolution is ready for your approval.' },
  { tone: 'you', label: 'Resolution approved', detail: 'You approved the visible resolution.' },
  { tone: 'agent', label: 'Applying approved resolution', detail: 'The hosting service completed the bounded resolution.' },
  { tone: 'agent', label: 'Verifying service', detail: 'Checking that the original request succeeds now.' },
  { tone: 'agent', label: 'Issue resolved', detail: 'The service is responding normally again.' },
];

/* A line lands roughly every beat; the approval line holds, because in
   the real run that is where the agent stops and waits for a person. */
const beatDelay = (index: number) => (consoleBeats[index]?.tone === 'hold' ? 3200 : 1650);

function SupportConsole() {
  const reduceMotion = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [shown, setShown] = useState(reduceMotion ? consoleBeats.length : 0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setTimeout(
      () => setShown((count) => (count >= consoleBeats.length ? 0 : count + 1)),
      shown === 0 ? 900 : shown >= consoleBeats.length ? 5200 : beatDelay(shown - 1),
    );
    return () => window.clearTimeout(timer);
  }, [shown, reduceMotion]);

  const complete = shown >= consoleBeats.length;

  return <aside className="hero-console">
    <div className="console-chrome"><i /><i /><i /><span>support activity — big-pink-demo</span></div>
    <ol className="console-log" aria-live="polite">{consoleBeats.slice(0, shown).map((beat, index) => <li key={beat.label} className={`${beat.tone} ${index === shown - 1 && !complete ? 'live' : ''}`}>
      <i /><div><b>{beat.label}</b><span>{beat.detail}</span></div>
    </li>)}</ol>
    <div className="console-foot"><ShieldCheck size={14} /> Diagnosed, fixed, and verified from one support handoff.</div>
  </aside>;
}

function Overview() {
  return <div className="app-shell hw-home"><AppHeader section="How it works" />
    <main className="overview">
      <section className="overview-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> WebMCP support infrastructure</div>
          <h1>Host Whisperer. <em>What if 5xx errors came with a recovery path?</em></h1>
          <p>Host Whisperer turns supported hosting failures into end-to-end recovery: the customer’s agent hands off the incident, Host Whisperer diagnoses and fixes the host, and SREs sleep better at night.</p>
          <div className="hero-actions"><a className="primary-link" href="/?view=shop"><ShoppingBag size={16} /> See it happen <ArrowRight size={16} /></a><a className="secondary-link" href="/?view=integrate"><Plug size={16} /> Connect your host</a></div>
          <ul className="hero-proof">
            <li><Check size={14} /> One script tag to install</li>
            <li><Check size={14} /> No hosting credentials in the browser</li>
            <li><Check size={14} /> Diagnose, fix, and verify end to end</li>
          </ul>
        </div>
        <SupportConsole />
      </section>

      <FlowDiagram />

      <section className="webmcp-explainer">
        <div className="explainer-mark"><Bot size={22} /></div>
        <div className="explainer-body"><h2>Give your website an end-to-end recovery path</h2><p>Host Whisperer is a developer integration that generates one JavaScript file and registers a WebMCP support handoff on your customer-facing pages. When a customer encounters a supported failure, their browser agent can delegate it to Host Whisperer for diagnosis, repair, and verification.</p></div>
        <a className="explainer-link" href="/?view=integrate"><Plug size={15} /> Connect your host <ArrowRight size={15} /></a>
      </section>

      <section className="surface-switcher">
        <div className="section-kicker">Two surfaces, two audiences</div>
        <div className="surface-grid">{([
          ['Customer', 'Big Pink', 'Hit the checkout outage and watch the agent resolve it.', '/?view=shop'],
          ['Developer', 'Connect your host', 'Link your hosting account and download the plugin.', '/?view=integrate'],
        ] as Array<[string, string, string, string]>).map(([role, name, copy, href]) => <a key={name} className="surface-card" href={href}><span className="surface-role">{role}</span><strong>{name}</strong><p>{copy}</p><em>Open<ArrowUpRight size={14} /></em></a>)}</div>
      </section>
    </main><AppFooter label="Host Whisperer" /></div>;
}

/* ------------------------------------------------------------------ */
/* Surface 2 — Connect your host and download the plugin.               */
/* ------------------------------------------------------------------ */

const grantedScopes = ['Read deploy history', 'Read service logs and health', 'Roll back to a previous deploy'];

function ConnectHost() {
  const profile = useSyncExternalStore(subscribeStudio, getStudioSnapshot, getStudioSnapshot);
  /* The token lives here and nowhere else: it is never persisted, never
     sent, and never written into the file the developer downloads. */
  const [token, setToken] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { void hydrateStudio(); }, []);

  const update = (input: Parameters<typeof updateStudioProfile>[0]) => void updateStudioProfile(input).catch((error) => window.alert(error instanceof Error ? error.message : String(error)));

  /* A token belongs to one hosting account. Pick a different host and the
     connection is no longer real, so step 1 drops back to its unconnected
     state and step 2 locks again. */
  const changeProvider = (provider: ProviderId) => {
    if (provider === profile.provider) return;
    setFingerprint('');
    setToken('');
    localStorage.removeItem(demoBundleKey);
    update({ provider });
  };

  const connect = () => {
    if (token.trim().length < 8) { window.alert('Enter the API token for your host to connect.'); return; }
    setConnecting(true);
    window.setTimeout(() => {
      setFingerprint(`${tokenPrefixes[profile.provider]}_${'•'.repeat(6)}${token.trim().slice(-4)}`);
      setToken('');
      setConnecting(false);
      void prepareStudioBundle();
      localStorage.setItem(demoBundleKey, 'true');
    }, 1500);
  };

  const download = async () => downloadText('host-whisperer-plugin.js', await buildPluginFile(profile));
  const copyInstall = async () => {
    await navigator.clipboard?.writeText('<script type="module" src="/host-whisperer-plugin.js"></script>');
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };

  return <div className="app-shell hw-studio"><AppHeader section="Developer setup" />
    <div className="integration-intro">
      <div><div className="eyebrow"><Plug size={14} /> Setup</div><h1>Connect your host</h1><p>Link the hosting account that runs your website, then drop one file into it. That file is what registers the WebMCP support tools for your customers.</p></div>
      <div className="intro-meta"><span className="intro-role">Developer configuration</span><span className="intro-build">{fingerprint ? 'connected' : 'not connected'}</span></div>
    </div>

    <main className="connect-grid">
      <section className="studio-panel connect-panel">
        <div className="panel-heading"><div><KeyRound size={16} /><span>Hosting account</span></div><small>step 1</small></div>
        <div className="field-stack">
          <label>Your website origin<input key={profile.allowedOrigin} defaultValue={profile.allowedOrigin} onBlur={(event) => update({ allowedOrigin: event.target.value })} /></label>
          <label>Host<select value={profile.provider} onChange={(event) => changeProvider(event.target.value as ProviderId)}>{providers.map((provider) => <option key={provider} value={provider}>{providerNames[provider]}</option>)}</select></label>
          {/* Once connected the masked token is shown in the connected card
              below, so the entry field would only repeat it back. */}
          {!fingerprint && <label>API token<input type="password" autoComplete="off" spellCheck={false} placeholder={`${tokenPrefixes[profile.provider]}_…`} value={token} onChange={(event) => setToken(event.target.value)} /></label>}
        </div>
        <div className="privacy-note"><Lock size={18} /><div><strong>Where this token goes</strong><p>It is sent to Host Whisperer’s servers over TLS and stays there. It is never stored in your browser, and it never appears in the plugin you download — open the file and check.</p></div></div>
        {!fingerprint
          ? <button className={`primary-button ${connecting ? 'installing' : ''}`} onClick={connect} disabled={connecting}><Plug size={17} /> {connecting ? `Connecting to ${providerNames[profile.provider]}…` : `Connect ${providerNames[profile.provider]}`}</button>
          : <div className="connected-state"><div className="connected-head"><Check size={18} /><div><strong>{providerNames[profile.provider]} connected</strong><span>{fingerprint}</span></div></div><ul>{grantedScopes.map((scope) => <li key={scope}><Check size={13} /> {scope}</li>)}</ul></div>}
      </section>

      <section className="studio-panel connect-panel">
        <div className="panel-heading"><div><Download size={16} /><span>Your plugin</span></div><small>step 2</small></div>
        <p className="connect-copy">One JavaScript file. It contains the WebMCP handoff, the diagnostics Host Whisperer may run, and the single recovery it is allowed to apply.</p>
        <div className="plugin-file"><Code2 size={15} /><div><strong>host-whisperer-plugin.js</strong><span>WebMCP handoff · one support agent · no credentials</span></div></div>
        {/* The file is built from the connected account, so there is nothing
            to download until step 1 is done. */}
        {fingerprint
          ? <button className="primary-button" onClick={() => void download()}><Download size={17} /> Download plugin</button>
          : <div className="locked-step"><Lock size={16} /><p>Connect your host in step 1 and the download appears here.</p></div>}
        <div className="install-tag"><span>Then add this to your pages</span><code>&lt;script type="module" src="/host-whisperer-plugin.js"&gt;&lt;/script&gt;</code><button onClick={() => void copyInstall()}><Copy size={14} /> {copied ? 'Copied' : 'Copy'}</button></div>
        <div className="capability-strip"><div className="strip-label"><Activity size={16} /><strong>What the support agent handles</strong></div><div className="strip-items">{['Gather safe data', 'File the report', 'Inspect the incident', 'Apply the one fix', 'Verify it worked'].map((value) => <span key={value}><Check size={12} />{value}</span>)}</div></div>
      </section>
    </main><AppFooter label="Host Whisperer" /></div>;
}

/* ------------------------------------------------------------------ */
/* Surface 3 — Big Pink: the customer-facing inflatable pool-float shop. */
/* ------------------------------------------------------------------ */

type CartItem = { sku: string; name: string; price: number; quantity: number };
type Cart = { items: CartItem[] };
type Service = { healthy: boolean; deploy: string; lastGood: string };
type FloatShape = 'flamingo' | 'flock' | 'swan' | 'donut' | 'watermelon' | 'lounger';
type Product = { sku: string; name: string; tagline: string; price: number; was?: number; category: string; blurb: string; reviews: number; shape: FloatShape; color: number };

const cartKey = 'bigpink-demo-cart';
const serviceKey = 'bigpink-demo-service';
const requestId = '7f31c9';

const categories = ['Flamingos', 'Flocks', 'Rings', 'Loungers'] as const;

const catalog: Product[] = [
  { sku: 'GERALD-XL', name: 'Gerald XL', tagline: 'Six feet of unbothered pink.', price: 89, was: 119, category: 'Flamingos', blurb: 'An unmistakable inflatable flamingo with a wide pool ring, sturdy handles, and enough neck to judge every cannonball.', reviews: 2104, shape: 'flamingo', color: 0 },
  { sku: 'GERALD-MINI', name: 'Gerald Mini', tagline: 'Same attitude, less pool.', price: 29, category: 'Flamingos', blurb: 'A compact flamingo float for smaller swimmers, smaller pools, and extremely ambitious bathtubs.', reviews: 812, shape: 'flamingo', color: 2 },
  { sku: 'FLOCK-SIX', name: 'The Flock', tagline: 'Your pool has a group chat now.', price: 149, was: 199, category: 'Flocks', blurb: 'Six mini flamingo floats that drift together until one of them decides it needs space.', reviews: 340, shape: 'flock', color: 0 },
  { sku: 'BEV-SWAN', name: 'Beverly', tagline: 'Graceful until the first splash.', price: 79, category: 'Flocks', blurb: 'A roomy inflatable swan for anyone who wants the serenity of a lake and the balance of a shopping cart.', reviews: 96, shape: 'swan', color: 1 },
  { sku: 'MELON-RING', name: 'Melon Drama', tagline: 'Seedless. Not speechless.', price: 34, category: 'Rings', blurb: 'A watermelon pool ring with two handles and absolutely no ability to keep a secret.', reviews: 511, shape: 'watermelon', color: 1 },
  { sku: 'SPRINKLE-RING', name: 'The Big Dip', tagline: 'Donut disturb.', price: 32, category: 'Rings', blurb: 'A frosted donut ring built for floating, snacking nearby, and ignoring every notification.', reviews: 274, shape: 'donut', color: 0 },
  { sku: 'SIESTA-LONG', name: 'Siesta Long', tagline: 'Meetings cannot reach you here.', price: 64, category: 'Loungers', blurb: 'A full-length inflatable lounger with a raised pillow and a strict no-laptops policy.', reviews: 188, shape: 'lounger', color: 2 },
];

const tints = [
  { id: 'pink', name: 'Classic Pink', base: '#ff85ad', light: '#ffb0c9' },
  { id: 'coral', name: 'Sunset Coral', base: '#ff7d5c', light: '#ffa98f' },
  { id: 'neon', name: 'Highlighter', base: '#ff2d8f', light: '#ff77b6' },
];

const findProduct = (sku: string) => catalog.find((item) => item.sku === sku) ?? catalog[0];
const startingCart = (): Cart => ({ items: [{ sku: 'GERALD-XL', name: 'Gerald XL', price: 89, quantity: 1 }] });
const brokenService = (): Service => ({ healthy: false, deploy: 'dep-8f2c1a', lastGood: 'dep-8e0b47' });
const readCart = () => { try { return JSON.parse(localStorage.getItem(cartKey) || '') as Cart; } catch { const cart = startingCart(); localStorage.setItem(cartKey, JSON.stringify(cart)); return cart; } };
const writeCart = (cart: Cart) => localStorage.setItem(cartKey, JSON.stringify(cart));
const readService = () => { try { return JSON.parse(localStorage.getItem(serviceKey) || '') as Service; } catch { const service = brokenService(); localStorage.setItem(serviceKey, JSON.stringify(service)); return service; } };
const writeService = (service: Service) => localStorage.setItem(serviceKey, JSON.stringify(service));
const cartCount = (cart: Cart) => cart.items.reduce((total, item) => total + item.quantity, 0);
const cartTotal = (cart: Cart) => cart.items.reduce((total, item) => total + item.quantity * item.price, 0);
const cartSummary = (cart: Cart) => cart.items.map((item) => `${item.quantity} × ${item.name}`).join(', ') || 'nothing yet';

function PoolFloatArt({ product, tint, decorative = false }: { product: Product; tint: (typeof tints)[number]; decorative?: boolean }) {
  const ring = <><ellipse cx="160" cy="205" rx="104" ry="58" fill={tint.base} /><ellipse cx="160" cy="202" rx="55" ry="28" fill="#e7f3f3" /><path d="M72 207c21 35 56 51 88 51s70-17 89-51" fill="none" stroke={tint.light} strokeWidth="8" opacity=".7" /></>;
  return <svg className="flamingo-art" viewBox="0 0 320 300" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${tint.name} ${product.name} inflatable pool float`}>
    <ellipse className="fl-shadow" cx="160" cy="268" rx="104" ry="16" />
    {(product.shape === 'flamingo' || product.shape === 'swan') && <g>{ring}
      <path d="M191 166 C218 127 176 104 190 65" stroke={product.shape === 'swan' ? '#fff9ef' : tint.base} strokeWidth="27" fill="none" strokeLinecap="round" />
      <circle cx="190" cy="60" r="22" fill={product.shape === 'swan' ? '#fff9ef' : tint.base} />
      <path d="M205 56 L244 66 L205 74 Z" fill={product.shape === 'swan' ? '#f0a24b' : '#ffd067'} />
      <circle cx="184" cy="54" r="3.5" fill="#2a2521" /><path d="M74 203 L38 184 L77 187 Z" fill={tint.light} />
    </g>}
    {product.shape === 'flock' && <g transform="translate(0 25) scale(.82) translate(35 15)">{ring}<path d="M190 166 C218 127 176 104 190 65" stroke={tint.base} strokeWidth="27" fill="none" strokeLinecap="round" /><circle cx="190" cy="60" r="22" fill={tint.base} /><path d="M205 56 L244 66 L205 74 Z" fill="#ffd067" /><circle cx="184" cy="54" r="3.5" fill="#2a2521" /></g>}
    {(product.shape === 'donut' || product.shape === 'watermelon') && <g>{ring}
      {product.shape === 'donut' ? <g fill="#fff4dc"><circle cx="92" cy="181" r="5" /><circle cx="126" cy="235" r="5" /><circle cx="208" cy="226" r="5" /><circle cx="229" cy="181" r="5" /></g> : <g fill="#2b6f48"><ellipse cx="91" cy="201" rx="4" ry="8" /><ellipse cx="123" cy="238" rx="4" ry="8" /><ellipse cx="211" cy="232" rx="4" ry="8" /><ellipse cx="230" cy="195" rx="4" ry="8" /></g>}
    </g>}
    {product.shape === 'lounger' && <g transform="rotate(-7 160 190)"><rect x="55" y="120" width="210" height="118" rx="38" fill={tint.base} /><rect x="73" y="137" width="174" height="82" rx="28" fill={tint.light} /><rect x="84" y="144" width="152" height="24" rx="12" fill={tint.base} opacity=".8" /><path d="M105 178h110M105 198h110" stroke={tint.base} strokeWidth="7" strokeLinecap="round" /></g>}
  </svg>;
}

function ShopDemo() {
  const [cart, setCart] = useState<Cart>(() => { if (!localStorage.getItem(cartKey)) writeCart(startingCart()); return readCart(); });
  const [service, setService] = useState<Service>(() => { if (!localStorage.getItem(serviceKey)) writeService(brokenService()); return readService(); });
  const [checkout, setCheckout] = useState<'idle' | 'failed' | 'placed'>('idle');
  const [helpArmed, setHelpArmed] = useState(false);
  /* The plugin ships installed: part one of the demo needs no setup. */
  const [installed, setInstalled] = useState(() => localStorage.getItem(demoInstallKey) !== 'false');
  const [sku, setSku] = useState(catalog[0].sku);
  const [tint, setTint] = useState(tints[0]);
  const [category, setCategory] = useState<(typeof categories)[number] | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(true);
  const [added, setAdded] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLElement>(null);
  const flockRef = useRef<HTMLElement>(null);

  const product = findProduct(sku);
  const needle = query.trim().toLowerCase();
  const flock = catalog.filter((item) => (!category || item.category === category) && (!needle || `${item.name} ${item.tagline} ${item.category}`.toLowerCase().includes(needle)));

  const updateCart = (next: Cart) => { writeCart(next); setCart(next); };
  const addToBag = (item: Product) => {
    const existing = cart.items.find((entry) => entry.sku === item.sku);
    updateCart({ items: existing ? cart.items.map((entry) => entry.sku === item.sku ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...cart.items, { sku: item.sku, name: item.name, price: item.price, quantity: 1 }] });
    setAdded(item.sku); window.setTimeout(() => setAdded(''), 1400);
  };
  const setQuantity = (target: string, delta: number) => updateCart({ items: cart.items.flatMap((entry) => entry.sku !== target ? [entry] : entry.quantity + delta < 1 ? [] : [{ ...entry, quantity: entry.quantity + delta }]) });
  const removeItem = (target: string) => updateCart({ items: cart.items.filter((entry) => entry.sku !== target) });

  const browse = (value: (typeof categories)[number]) => { setCategory((current) => current === value ? null : value); setQuery(''); flockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const showProduct = (value: string) => {
    const next = findProduct(value);
    setSku(value);
    setTint(tints[next.color]);
    productRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const tryCheckout = () => { if (!cart.items.length) return; setBagOpen(false); if (readService().healthy) { setCheckout('placed'); return; } setCheckout('failed'); setHelpArmed(true); };

  useEffect(() => {
    const refresh = () => setService(readService());
    window.addEventListener('hostwhisperer:service-restored', refresh);
    if (!installed || !helpArmed) return () => window.removeEventListener('hostwhisperer:service-restored', refresh);
    const runtime = createHostWhispererRuntime({
      integrationId: 'big-pink-demo', appName: 'Big Pink', allowedOrigin: location.origin, providerHint: 'render', studioUrl: `${location.origin}/?view=incident`,
      agentLabel, revealDelayMs: 5000, anchorTo: () => errorRef.current,
      getContext: () => {
        const current = readService();
        return { route: location.pathname, appVersion: '2.4.0', checkoutStatus: current.healthy ? 200 : 503, lastErrorCode: current.healthy ? 'NONE' : 'CHECKOUT_SERVICE_UNAVAILABLE', failingDeploy: current.healthy ? 'none' : current.deploy, cartItemCount: cartCount(readCart()), cartIntact: true };
      },
      diagnostics: [
        { id: 'storefront_health', label: 'Storefront health', run: () => ({ status: 'pass', summary: 'Product pages and assets are serving normally.' }) },
        { id: 'cart_contents', label: 'Cart contents', run: () => ({ status: 'pass', summary: `The bag is intact: ${cartSummary(readCart())}.` }) },
        { id: 'checkout_service', label: 'Checkout service', run: () => readService().healthy
          ? ({ status: 'pass' as const, summary: 'checkout-service is answering with HTTP 200.' })
          : ({ status: 'fail' as const, summary: `checkout-service returned HTTP 503 on 14 consecutive attempts. Deploy ${readService().deploy} is crash-looping (OOMKilled).` }) },
      ],
      actions: [{
        id: 'roll_back_checkout_service',
        label: 'Restore checkout service',
        description: 'Restore the most recent verified version of checkout.',
        effects: ['Restores the checkout service to its most recent verified version', 'Leaves your bag and its items exactly as they are', 'Does not place an order or read your payment details', 'Keeps the storefront online while the service is restored'],
        run: async (report) => {
          const current = readService();
          const beats: Array<[string, string]> = [
            ['Support request accepted', 'The hosting service accepted the bounded request.'],
            ['Inspection started', 'Store support is checking the affected service.'],
            ['Safe resolution selected', 'A developer-approved resolution is available.'],
            ['Resolution applied', 'The hosting service completed the requested change.'],
            ['Service responded normally', 'Store support received a healthy response.'],
          ];
          for (const [label, detail] of beats) { await wait(750); report?.(label, detail); }
          writeService({ healthy: true, deploy: current.lastGood, lastGood: current.lastGood });
          window.dispatchEvent(new Event('hostwhisperer:service-restored'));
        },
        verify: () => readService().healthy
          ? ({ recovered: true, summary: 'POST /api/checkout now returns HTTP 200. Try checkout again — your bag is untouched.' })
          : ({ recovered: false, summary: 'checkout-service is still returning HTTP 503.' }),
      }],
    });
    return () => { window.removeEventListener('hostwhisperer:service-restored', refresh); runtime.destroy(); };
  }, [installed, helpArmed]);

  const reset = () => { writeService(brokenService()); setService(readService()); setCheckout('idle'); setHelpArmed(false); };
  const restartJourney = () => { writeService(brokenService()); localStorage.setItem(demoInstallKey, 'false'); localStorage.removeItem(demoBundleKey); setService(readService()); setInstalled(false); setCheckout('idle'); setHelpArmed(false); };
  const enablePlugin = () => { localStorage.removeItem(demoInstallKey); setInstalled(true); };

  return <div className="shop-shell">
    <div className="shop-promo">Free delivery on flocks over $50 <b>·</b> 30-day returns <b>·</b> 0% real feathers</div>
    <header className="shop-nav">
      <a href="/?view=shop" className="shop-logo">BIG PINK</a>
      <nav>{categories.map((value) => <button key={value} className={category === value ? 'on' : ''} onClick={() => browse(value)}>{value}</button>)}</nav>
      <div className="shop-nav-tools">
        {searching && <input className="shop-search" autoFocus placeholder="Search the flock" aria-label="Search the flock" value={query} onChange={(event) => { setQuery(event.target.value); setCategory(null); }} onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); setSearching(false); } }} />}
        <button className="shop-tool" aria-label="Search" onClick={() => { setSearching((open) => !open); if (searching) setQuery(''); else flockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}><Search size={17} /></button>
        <div className="shop-account">
          <button className="shop-tool" aria-label="Account" onClick={() => setAccountOpen((open) => !open)}><UserRound size={17} /></button>
          {accountOpen && <div className="account-pop">
            {signedIn
              ? <><strong>Your account</strong><span>Signed in</span><p>2 orders · 14 pool floats</p><button onClick={() => { setSignedIn(false); setAccountOpen(false); }}><LogOut size={13} /> Sign out</button></>
              : <><strong>Not signed in</strong><span>Guest checkout is on</span><button onClick={() => { setSignedIn(true); setAccountOpen(false); }}><UserRound size={13} /> Sign back in</button></>}
          </div>}
        </div>
        <button className="shop-tool shop-bag" aria-label={`Bag, ${cartCount(cart)} items`} onClick={() => setBagOpen((open) => !open)}><ShoppingBag size={17} /><b>{cartCount(cart)}</b></button>
      </div>
      {bagOpen && <div className="bag-drawer">
        <div className="bag-head"><strong>Your bag</strong><button aria-label="Close bag" onClick={() => setBagOpen(false)}><X size={16} /></button></div>
        {cart.items.length ? <>
          <ul className="bag-list">{cart.items.map((item) => <li key={item.sku}>
            <div><strong>{item.name}</strong><span>${item.price}</span></div>
            <div className="bag-qty">
              <button aria-label={`One fewer ${item.name}`} onClick={() => setQuantity(item.sku, -1)}><Minus size={13} /></button>
              <b>{item.quantity}</b>
              <button aria-label={`One more ${item.name}`} onClick={() => setQuantity(item.sku, 1)}><Plus size={13} /></button>
              <button className="bag-remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.sku)}><Trash2 size={13} /></button>
            </div>
          </li>)}</ul>
          <div className="bag-total"><span>Subtotal</span><strong>${cartTotal(cart)}</strong></div>
          <button className="bag-checkout" onClick={tryCheckout}><ShoppingBag size={16} /> Checkout</button>
        </> : <p className="bag-empty">No flamingos yet. That is a fixable problem.</p>}
      </div>}
    </header>


    <main className="product-layout" ref={productRef}>
      <section className="product-visual">
        <span className="product-badge">{product.sku === 'GERALD-XL' ? 'Bestselling bird' : product.category}</span>
        <PoolFloatArt product={product} tint={tint} />
      </section>
      <section className="product-details">
        <div className="crumb">{product.category} <i>/</i> Inflatable</div>
        <h1>{product.name}</h1>
        <p className="product-sub">{product.tagline}</p>
        <div className="rating"><span className="stars">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={13} fill="currentColor" strokeWidth={0} />)}</span><span>4.8 · {product.reviews.toLocaleString()} reviews</span></div>
        <div className="price-row"><strong className="price">${product.price}</strong>{product.was && <><span className="price-was">${product.was}</span><span className="price-tag">Save ${product.was - product.price}</span></>}</div>
        <p className="description">{product.blurb}</p>
        <div className="color-row"><b>Color</b>{tints.map((item) => <button key={item.id} className={`swatch ${tint.id === item.id ? 'active' : ''}`} style={{ background: item.base }} aria-label={item.name} onClick={() => setTint(item)} />)}<em>{tint.name}</em></div>

        <div className="buy-row">
          {checkout !== 'placed' && <button className="checkout-button" onClick={tryCheckout} disabled={!cart.items.length}><ShoppingBag size={18} /> {checkout === 'failed' && service.healthy ? 'Try checkout again' : cart.items.length ? 'Checkout' : 'Your bag is empty'}</button>}
          <button className="add-button" onClick={() => addToBag(product)}>{added === product.sku ? <><Check size={16} /> Added</> : <><Plus size={16} /> Add to bag</>}</button>
        </div>

        {checkout === 'failed' && !service.healthy && <div className="checkout-error" data-hw-error ref={errorRef}>
          <div className="error-head"><ServerCrash size={22} /><div><strong>503</strong><span>Service Unavailable</span></div></div>
          <p>Checkout is failing on the store’s side. Your bag is safe and no payment was attempted.</p>
          <pre className="error-trace">{`HTTP 503 · Service Unavailable\nPOST /api/checkout        x-request-id: ${requestId}\nupstream: checkout-service — no healthy instances`}</pre>
        </div>}

        {checkout === 'failed' && service.healthy && <div className="checkout-success"><Check size={18} /><div><strong>Checkout is back online</strong><p>The checkout service was restored to a healthy version. Your bag is exactly as you left it — try again.</p></div></div>}

        {checkout === 'placed' && <div className="checkout-success"><Check size={18} /><div><strong>Order confirmed</strong><p>Thanks! {cartSummary(cart)} on the way. Inflation sold separately.</p></div></div>}

        <ul className="assurance-row"><li><Truck size={16} /> Free 2-day delivery</li><li><RotateCcw size={16} /> 30-day returns</li><li><Lock size={16} /> Secure payment</li><li><CreditCard size={16} /> Pay in 4</li></ul>
      </section>
    </main>

    <section className="flock-strip" id="flock" ref={flockRef}>
      <div className="flock-head">
        <h2>{category ? category : needle ? `Results for “${query}”` : 'More pool floats'}</h2>
        {(category || needle) && <button className="flock-clear" onClick={() => { setCategory(null); setQuery(''); }}><X size={13} /> Clear</button>}
      </div>
      {flock.length ? <div className="flock-grid">{flock.map((item) => <article key={item.sku} className={item.sku === sku ? 'on' : ''}>
        <button className="flock-open" onClick={() => showProduct(item.sku)} aria-label={`View ${item.name}`}><span className="flock-art"><PoolFloatArt product={item} tint={tints[item.color]} decorative /></span><strong>{item.name}</strong><span>{item.tagline}</span><em>${item.price}</em></button>
        <button className="flock-add" onClick={() => addToBag(item)}>{added === item.sku ? <><Check size={13} /> Added</> : <><Plus size={13} /> Add</>}</button>
      </article>)}</div> : <p className="flock-empty">No birds match that. Try “Gerald”.</p>}
    </section>

    <footer className="shop-footer">
      <div className="demo-reset-row">
        <span>Demo controls</span>
        <button className="reset-demo" onClick={reset} aria-label="Recreate the checkout outage"><RefreshCw size={13} /> Recreate outage</button>
        {installed
          ? <button className="reset-demo" onClick={restartJourney}><RefreshCw size={13} /> Show it without the plugin</button>
          : <button className="reset-demo" onClick={enablePlugin}><RefreshCw size={13} /> Turn the plugin back on</button>}
      </div>
      <div className="shop-footer-note"><span>Big Pink demonstration store · No real purchases</span><span>{signedIn ? 'Signed in' : 'Guest'} · {installed ? 'Store support enabled' : 'Secure checkout'}</span></div>
    </footer>
  </div>;
}

/* ------------------------------------------------------------------ */
/* Surface 4 — Big Pink Admin: kept for the deeper developer story.     */
/* ------------------------------------------------------------------ */

function StoreAdmin() {
  const [bundleReady] = useState(() => localStorage.getItem(demoBundleKey) === 'true');
  const [installed, setInstalled] = useState(() => localStorage.getItem(demoInstallKey) !== 'false');
  const [installing, setInstalling] = useState(false);
  const install = () => {
    if (!bundleReady) return;
    setInstalling(true);
    window.setTimeout(() => {
      localStorage.removeItem(demoInstallKey);
      setInstalled(true);
      setInstalling(false);
    }, 1700);
  };
  const activity: Array<[string, string, string, string]> = [
    ['warn', '09:42', 'Checkout returning 503', 'checkout-service · deploy dep-8f2c1a crash-looping'],
    ['ok', '09:31', 'Inventory sync completed', '412 SKUs reconciled · no changes'],
    ['ok', '08:55', 'Payment gateway heartbeat', 'All regions responding under 180 ms'],
    ['ok', '08:10', 'Storefront theme published', 'Version 2.4.0 by Store team'],
  ];
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a href="/?view=admin" className="admin-logo"><span>BP</span><div><strong>Big Pink</strong><small>Store Admin</small></div></a>
      <nav>
        <a className="active" href="/?view=admin"><LayoutDashboard size={16} /> Overview</a>
        <span><ShoppingBag size={16} /> Orders<b>24</b></span>
        <span><Boxes size={16} /> Products</span>
        <span><Gauge size={16} /> Store health</span>
        <span><Plug size={16} /> Integrations</span>
        <span><Settings size={16} /> Settings</span>
      </nav>
      <div className="admin-user"><i>BP</i><div><strong>Store team</strong><small>Store developer</small></div></div>
    </aside>
    <div className="admin-body">
      <header className="admin-topbar">
        <div className="admin-crumb">Big Pink <ChevronRight size={13} /> Apps <ChevronRight size={13} /> <b>Integrations</b></div>
        <div className="admin-tools"><label className="admin-search"><Search size={14} /><input placeholder="Search the admin" aria-label="Search the admin" /></label><span className="admin-icon-button"><Bell size={15} /><i /></span><a className="admin-cta" href="/?view=shop">View storefront <ArrowUpRight size={14} /></a></div>
      </header>
      <main className="admin-main">
        <div className="admin-head"><div><span className="admin-eyebrow">Developer workspace</span><h1>Store integrations</h1><p>Apps and code packages applied to the Big Pink customer website.</p></div><div className="admin-head-meta"><Clock size={13} /> Synced a moment ago</div></div>

        <section className="admin-stats">
          <article><span>Store status</span><strong className="online"><i /> Online</strong><small>Storefront healthy · checkout degraded</small></article>
          <article><span>Active integrations</span><strong>{installed ? '1' : '0'}</strong><small>{installed ? 'Host Whisperer support operator' : 'No apps installed yet'}</small></article>
          <article><span>Checkout incidents</span><strong className="warning">1 open</strong><small>Opened 09:42 · unresolved</small></article>
          <article><span>Sessions today</span><strong>3,481</strong><small className="up">+12.4% vs. last week</small></article>
        </section>

        <section className="admin-integration">
          <div className="admin-section-head"><div><span className="section-mark"><Plug size={17} /></span><div><h2>Support integration</h2><p>Code packages applied to the Big Pink customer website.</p></div></div><span className={installed ? 'admin-badge live' : 'admin-badge'}>{installed ? 'Active' : 'Not installed'}</span></div>
          {!bundleReady && !installed && <div className="admin-empty"><PackageCheck size={26} /><h3>No integration package received</h3><p>Connect a host in Host Whisperer and download the plugin, then return here to install it.</p><a href="/?view=integrate">Open Host Whisperer <ArrowRight size={14} /></a></div>}
          {bundleReady && !installed && <div className="package-review">
            <div className="package-title"><span className="package-icon">HW</span><div><strong>Host Whisperer support operator</strong><p>Prepared for Big Pink · hosting recovery playbook</p></div><span className="package-version">v0.1.0</span></div>
            <div className="package-files"><span><Code2 size={14} /> host-whisperer-plugin.js</span></div>
            <div className="package-permissions"><strong>Requested website capabilities</strong><span><Check size={13} /> Read allowlisted page and checkout context</span><span><Check size={13} /> Run three safe diagnostics</span><span><Check size={13} /> Roll back the checkout service after customer approval</span><span><Check size={13} /> Verify checkout before reporting success</span></div>
            <button className={installing ? 'admin-install installing' : 'admin-install'} onClick={install} disabled={installing}><Plug size={16} /> {installing ? 'Deploying plugin to storefront…' : 'Install plugin on storefront'}</button>
          </div>}
          {installed && <div className="admin-live"><div><span className="admin-live-mark"><Check size={20} /></span><div><strong>Host Whisperer is active</strong><p>One WebMCP support handoff and the customer help dialog are deployed.</p></div></div><a href="/?view=shop">Test on storefront <ArrowRight size={14} /></a></div>}
        </section>

        <section className="admin-activity">
          <div className="admin-section-head"><div><span className="section-mark"><Activity size={17} /></span><div><h2>Recent store activity</h2><p>Automated events from the storefront and checkout services.</p></div></div><span className="admin-badge">Last 24 hours</span></div>
          <ul className="activity-list">{activity.map(([tone, time, title, detail]) => <li key={time} className={tone}><i /><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></li>)}</ul>
        </section>
      </main>
    </div>
  </div>;
}

function decodePacket(): EscalationPacket | null {
  const encoded = location.hash.match(/(?:^#|&)packet=([^&]+)/)?.[1];
  if (!encoded || encoded.length > 12000) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const value = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))) as Partial<EscalationPacket>;
    if (value.version !== 1 || typeof value.appName !== 'string' || typeof value.symptom !== 'string' || !Array.isArray(value.diagnostics) || !Array.isArray(value.activity) || value.trust !== 'customer_supplied_untrusted_evidence') return null;
    return value as EscalationPacket;
  } catch { return null; }
}

function IncidentView() {
  const packet = decodePacket();
  return <div className="app-shell hw-incident"><AppHeader section="Developer escalation" />
    <main className="incident-view">
      <div className="eyebrow"><TerminalSquare size={14} /> Customer-supplied evidence</div>
      <h1>{packet ? `${packet.appName} incident` : 'No incident packet found'}</h1>
      {packet ? <>
        <div className="untrusted-banner"><CircleAlert size={18} /><div><strong>Treat this report as untrusted evidence</strong><p>Host Whisperer removed known sensitive fields, but the developer must verify every claim before acting.</p></div></div>
        <div className="incident-cards">
          <section><span>Customer symptom</span><p>{packet.symptom}</p></section>
          <section><span>Provider hint</span><p>{providerNames[packet.providerHint]}</p></section>
          <section className="wide"><span>Safe context</span><pre>{JSON.stringify(packet.safeContext, null, 2)}</pre></section>
          <section className="wide"><span>Diagnostics</span>{packet.diagnostics.map((item) => <p key={item.id} className="diagnostic"><b className={item.status}>{item.status}</b> {item.label}: {item.summary}</p>)}</section>
        </div>
      </> : <p className="empty-copy">Open a customer-approved escalation link generated by an installed Host Whisperer plugin.</p>}
      <a className="primary-link" href="/?view=integrate"><ChevronRight size={15} /> Return to setup</a>
    </main><AppFooter label="Host Whisperer" /></div>;
}

export default function App() {
  const view = new URLSearchParams(location.search).get('view');
  if (view === 'shop') return <ShopDemo />;
  if (view === 'admin') return <StoreAdmin />;
  if (view === 'incident') return <IncidentView />;
  if (view === 'integrate') return <ConnectHost />;
  return <Overview />;
}
