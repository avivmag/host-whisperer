import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Bell, Bot, Boxes, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, Code2, Copy, CreditCard, Download, Gauge, KeyRound, LayoutDashboard, Lock, PackageCheck, Pause, Play, Plug, RefreshCw, RotateCcw, Search, ServerCrash, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, TerminalSquare, Truck, UserRound } from 'lucide-react';
import { createHostWhispererRuntime } from './runtime';
import { buildPluginFile, getStudioSnapshot, hydrateStudio, prepareStudioBundle, subscribeStudio, updateStudioProfile } from './studio';
import { providers, type EscalationPacket, type ProviderId } from './types';

const providerNames: Record<ProviderId, string> = { aws: 'AWS', gcp: 'Google Cloud', cloudflare: 'Cloudflare', vercel: 'Vercel', netlify: 'Netlify', render: 'Render', shopify: 'Shopify' };
const tokenPrefixes: Record<ProviderId, string> = { aws: 'akia', gcp: 'gcp', cloudflare: 'cf', vercel: 'vc', netlify: 'ntl', render: 'rnd', shopify: 'shpat' };
const demoInstallKey = 'host-whisperer-northstar-installed';
const demoBundleKey = 'host-whisperer-northstar-bundle-ready';
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

type DiagramStep = { title: string; body: string; edges: Array<{ id: EdgeId; back?: boolean }>; nodes: NodeId[]; tone?: 'bad' | 'good'; mood: Mood };

const diagramSteps: DiagramStep[] = [
  { title: 'The customer asks for something', body: 'An ordinary request — add to cart, check out, sign in — goes to the website over its REST API.', edges: [{ id: 'req' }], nodes: ['customer', 'website'], mood: 'neutral' },
  { title: 'The website asks the host', body: 'To answer, the website calls the service running on its host.', edges: [{ id: 'host' }], nodes: ['website', 'host'], mood: 'neutral' },
  { title: 'The host fails', body: 'The service is unhealthy — a bad deploy, an exhausted instance — and answers with a 5xx.', edges: [{ id: 'host', back: true }], nodes: ['host'], tone: 'bad', mood: 'neutral' },
  { title: 'The failure reaches the customer', body: 'The website has nothing better to show than a generic error page.', edges: [{ id: 'req', back: true }], nodes: ['website', 'customer'], tone: 'bad', mood: 'neutral' },
  { title: 'The customer is stuck', body: 'No context, no fix, nobody to ask. This is where most journeys quietly end.', edges: [], nodes: ['customer'], tone: 'bad', mood: 'angry' },
  { title: 'The agent steps in', body: 'Their browser agent reads the safe page context and calls the WebMCP tools this website registered for exactly this situation.', edges: [{ id: 'mcp' }], nodes: ['customer', 'website'], mood: 'thinking' },
  { title: 'Host Whisperer works the problem', body: 'On the other side of WebMCP, Host Whisperer talks to the host: read the deploys, read the logs, propose one bounded fix, apply it only after the customer approves.', edges: [{ id: 'hw' }, { id: 'host2' }], nodes: ['hw', 'host'], mood: 'thinking' },
  { title: 'The answer comes back', body: 'Either the fix is applied and verified, or the customer gets an honest handoff — a sanitized report a human can act on.', edges: [{ id: 'hw', back: true }, { id: 'mcp', back: true }], nodes: ['website', 'customer'], tone: 'good', mood: 'thinking' },
  { title: 'The customer is unblocked', body: 'They retry, it works, and nobody had to open a support ticket.', edges: [], nodes: ['customer'], tone: 'good', mood: 'happy' },
];

/* Each node is its own component so an illustrated <image href="…"> can
   replace any one of them later without touching the wiring. */
function CustomerNode({ mood, on }: { mood: Mood; on: boolean }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect x="48" y="196" width="210" height="176" rx="20" />
    <circle className="face-bg" cx="108" cy="252" r="30" />
    <circle className="ink" cx="98" cy="245" r="3.2" /><circle className="ink" cx="118" cy="245" r="3.2" />
    {mood === 'neutral' && <path className="line" d="M98,264 H118" />}
    {mood === 'happy' && <path className="line" d="M95,258 Q108,270 121,258" />}
    {mood === 'angry' && <><path className="line" d="M91,236 L104,241" /><path className="line" d="M125,236 L112,241" /><path className="line" d="M96,267 Q108,257 120,267" /></>}
    {mood === 'thinking' && <><path className="line" d="M99,264 H115" /><circle className="ink" cx="140" cy="222" r="2.4" /><circle className="ink" cx="149" cy="212" r="3.2" /><circle className="ink" cx="160" cy="200" r="4.2" /></>}
    <g className="bot"><rect x="172" y="230" width="50" height="44" rx="13" /><circle cx="187" cy="251" r="3.8" /><circle cx="207" cy="251" r="3.8" /><path className="line" d="M197,230 V218" /><circle cx="197" cy="214" r="4" /></g>
    <text className="dlabel" x="153" y="348">Customer + agent</text>
  </g>;
}

function WebsiteNode({ on, lane }: { on: boolean; lane: 'rest' | 'mcp' | null }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect x="430" y="132" width="250" height="250" rx="20" />
    <text className="dtitle" x="555" y="168">Website</text>
    <g className={`dlane ${lane === 'rest' ? 'on' : ''}`}><rect x="452" y="186" width="206" height="76" rx="13" /><text x="555" y="231">REST API</text></g>
    <g className={`dlane mcp ${lane === 'mcp' ? 'on' : ''}`}><rect x="452" y="278" width="206" height="76" rx="13" /><text x="555" y="323">WebMCP</text></g>
  </g>;
}

function HostNode({ on, provider }: { on: boolean; provider: string }) {
  return <g className={`dnode ${on ? 'on' : ''}`}>
    <rect x="852" y="160" width="204" height="170" rx="20" />
    <g className="cloud"><circle cx="928" cy="234" r="20" /><circle cx="958" cy="223" r="27" /><circle cx="989" cy="236" r="18" /><rect x="911" y="236" width="94" height="24" rx="12" /></g>
    <text className="dtitle" x="954" y="298">Host</text>
    <text className="dlabel" x="954" y="318">{provider}</text>
  </g>;
}

function WhispererNode({ on }: { on: boolean }) {
  return <g className={`dnode hw ${on ? 'on' : ''}`}>
    <rect x="560" y="452" width="300" height="150" rx="20" />
    <text className="dtitle" x="710" y="500">Host Whisperer + agent</text>
    <text className="dlabel" x="710" y="527">reads deploys · reads logs</text>
    <text className="dlabel" x="710" y="547">proposes one bounded fix</text>
    <text className="dlabel" x="710" y="567">never without approval</text>
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
        <svg viewBox="0 0 1100 640" className={`hw-diagram ${tone}`} role="img" aria-label={`Step ${index + 1} of ${diagramSteps.length}. ${step.title}. ${step.body}`}>
          <defs>{(Object.entries(edgeGeometry) as Array<[EdgeId, string]>).map(([id, d]) => <path key={id} id={`edge-${id}`} d={d} />)}</defs>
          {(Object.keys(edgeGeometry) as EdgeId[]).map((id) => <use key={id} href={`#edge-${id}`} className={`dedge ${activeEdges.has(id) ? `on ${tone}` : ''}`} />)}
          {!reduceMotion && step.edges.map((edge) => <circle key={`${index}-${edge.id}`} className={`ddot ${tone}`} r="7">
            <animateMotion dur="1.5s" repeatCount="indefinite" calcMode="linear" keyPoints={edge.back ? '1;0' : '0;1'} keyTimes="0;1"><mpath href={`#edge-${edge.id}`} /></animateMotion>
          </circle>)}
          <CustomerNode mood={step.mood} on={on('customer')} />
          <WebsiteNode on={on('website')} lane={lane} />
          <HostNode on={on('host')} provider={providerNames[providers[index % providers.length]]} />
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

function Overview() {
  return <div className="app-shell hw-home"><AppHeader section="How it works" />
    <main className="overview">
      <section className="overview-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> WebMCP support infrastructure</div>
          <h1>Turn a 500 page into <em>a fix that actually happens.</em></h1>
          <p>When a website’s host fails, the customer gets a generic error and a dead end. Host Whisperer gives that website a small set of WebMCP tools, so the customer’s agent can diagnose the failure, get permission, repair it with the host, and prove it worked.</p>
          <div className="hero-actions"><a className="primary-link" href="/?view=shop"><ShoppingBag size={16} /> See it happen <ArrowRight size={16} /></a><a className="secondary-link" href="/?view=integrate"><Plug size={16} /> Connect your host</a></div>
          <dl className="hero-facts"><div><dt>Runtime tools</dt><dd>6</dd></div><div><dt>Bound origins</dt><dd>1</dd></div><div><dt>Credentials in the plugin</dt><dd>0</dd></div><div><dt>Unapproved fixes</dt><dd>0</dd></div></dl>
        </div>
        <aside className="hero-console">
          <div className="console-chrome"><i /><i /><i /><span>operator activity — northstar-commerce-demo</span></div>
          <ol className="console-log">{([
            ['done', 'get_support_context', 'route /product/aster-h1 · checkout 503'],
            ['done', 'run_support_diagnostics', '2 checks pass · checkout-service fails'],
            ['hold', 'prepare_recovery', 'roll_back_checkout_service · awaiting approval'],
            ['done', 'apply_recovery', 'host rolled back dep-8f2c1a → dep-8e0b47'],
            ['done', 'verify_recovery', 'checkout returns 200 · cart preserved'],
          ] as Array<[string, string, string]>).map(([status, tool, detail]) => <li key={tool} className={status}><i /><div><b>{tool}</b><span>{detail}</span></div></li>)}</ol>
          <div className="console-foot"><ShieldCheck size={14} /> Nothing is repaired until the customer approves it on screen.</div>
        </aside>
      </section>

      <FlowDiagram />

      <section className="webmcp-explainer">
        <div className="explainer-mark"><Bot size={22} /></div>
        <div className="explainer-body"><h2>WebMCP lives in the installed plugin</h2><p>Host Whisperer is a normal developer tool. It generates one JavaScript file that registers the support tools on your customer-facing pages. When a customer opens that page in an agent-capable browser, the agent discovers those tools and can work the live problem with them.</p></div>
        <a className="explainer-link" href="/?view=shop">See the customer website <ArrowRight size={15} /></a>
      </section>

      <section className="surface-switcher">
        <div className="section-kicker">Two surfaces, two audiences</div>
        <div className="surface-grid">{([
          ['Customer', 'Northstar Market', 'Hit the checkout outage and watch the agent resolve it.', '/?view=shop'],
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
          <label>Host<select value={profile.provider} onChange={(event) => update({ provider: event.target.value as ProviderId })}>{providers.map((provider) => <option key={provider} value={provider}>{providerNames[provider]}</option>)}</select></label>
          <label>API token<input type="password" autoComplete="off" spellCheck={false} placeholder={`${tokenPrefixes[profile.provider]}_…`} value={token} onChange={(event) => setToken(event.target.value)} /></label>
        </div>
        <div className="privacy-note"><Lock size={18} /><div><strong>Where this token goes</strong><p>It is sent to Host Whisperer’s servers over TLS and stays there. It is never stored in your browser, and it never appears in the plugin you download — open the file and check.</p></div></div>
        {!fingerprint
          ? <button className={`primary-button ${connecting ? 'installing' : ''}`} onClick={connect} disabled={connecting}><Plug size={17} /> {connecting ? `Connecting to ${providerNames[profile.provider]}…` : `Connect ${providerNames[profile.provider]}`}</button>
          : <div className="connected-state"><div className="connected-head"><Check size={18} /><div><strong>{providerNames[profile.provider]} connected</strong><span>{fingerprint}</span></div></div><ul>{grantedScopes.map((scope) => <li key={scope}><Check size={13} /> {scope}</li>)}</ul></div>}
      </section>

      <section className="studio-panel connect-panel">
        <div className="panel-heading"><div><Download size={16} /><span>Your plugin</span></div><small>step 2</small></div>
        <p className="connect-copy">One JavaScript file. It contains the WebMCP runtime and your integration settings — the six support tools, the diagnostics they run, and the single recovery they are allowed to propose.</p>
        <div className="plugin-file"><Code2 size={15} /><div><strong>host-whisperer-plugin.js</strong><span>WebMCP runtime · registerTool × 6 · no credentials</span></div></div>
        <button className="primary-button" onClick={() => void download()} disabled={!fingerprint}><Download size={17} /> Download plugin</button>
        {!fingerprint && <p className="prepare-hint">Connect your host to enable the download.</p>}
        <div className="install-tag"><span>Then add this to your pages</span><code>&lt;script type="module" src="/host-whisperer-plugin.js"&gt;&lt;/script&gt;</code><button onClick={() => void copyInstall()}><Copy size={14} /> {copied ? 'Copied' : 'Copy'}</button></div>
        <div className="capability-strip"><div className="strip-label"><Activity size={16} /><strong>Tools it registers</strong></div><div className="strip-items">{['Read safe context', 'Run diagnostics', 'Prepare recovery', 'Apply after approval', 'Verify', 'Escalate safely'].map((value) => <span key={value}><Check size={12} />{value}</span>)}</div></div>
      </section>
    </main><AppFooter label="Host Whisperer" /></div>;
}

/* ------------------------------------------------------------------ */
/* Surface 3 — Northstar Market: the customer-facing retail storefront. */
/* ------------------------------------------------------------------ */

type Cart = { items: Array<{ sku: string; name: string; price: number; quantity: number }> };
type Service = { healthy: boolean; deploy: string; lastGood: string };
const cartKey = 'northstar-demo-cart';
const serviceKey = 'northstar-demo-service';
const requestId = '7f31c9';
const fullCart = (): Cart => ({ items: [{ sku: 'ASTER-H1', name: 'Aster H1 Headphones', price: 149, quantity: 1 }] });
const brokenService = (): Service => ({ healthy: false, deploy: 'dep-8f2c1a', lastGood: 'dep-8e0b47' });
const readCart = () => { try { return JSON.parse(localStorage.getItem(cartKey) || '') as Cart; } catch { const cart = fullCart(); localStorage.setItem(cartKey, JSON.stringify(cart)); return cart; } };
const readService = () => { try { return JSON.parse(localStorage.getItem(serviceKey) || '') as Service; } catch { const service = brokenService(); localStorage.setItem(serviceKey, JSON.stringify(service)); return service; } };
const writeService = (service: Service) => localStorage.setItem(serviceKey, JSON.stringify(service));

function ShopDemo() {
  const [cart] = useState<Cart>(() => { if (!localStorage.getItem(cartKey)) localStorage.setItem(cartKey, JSON.stringify(fullCart())); return readCart(); });
  const [service, setService] = useState<Service>(() => { if (!localStorage.getItem(serviceKey)) writeService(brokenService()); return readService(); });
  const [checkout, setCheckout] = useState<'idle' | 'failed' | 'placed'>('idle');
  const [helpArmed, setHelpArmed] = useState(false);
  /* The plugin ships installed: part one of the demo needs no setup. */
  const [installed, setInstalled] = useState(() => localStorage.getItem(demoInstallKey) !== 'false');
  const errorRef = useRef<HTMLDivElement>(null);

  const tryCheckout = () => { if (readService().healthy) { setCheckout('placed'); return; } setCheckout('failed'); setHelpArmed(true); };

  useEffect(() => {
    const refresh = () => setService(readService());
    window.addEventListener('hostwhisperer:service-restored', refresh);
    if (!installed || !helpArmed) return () => window.removeEventListener('hostwhisperer:service-restored', refresh);
    const runtime = createHostWhispererRuntime({
      integrationId: 'northstar-commerce-demo', appName: 'Northstar Shop', allowedOrigin: location.origin, providerHint: 'render', studioUrl: `${location.origin}/?view=incident`,
      agentLabel, revealDelayMs: 5000, anchorTo: () => errorRef.current,
      getContext: () => {
        const current = readService();
        return { route: location.pathname, appVersion: '2.4.0', checkoutStatus: current.healthy ? 200 : 503, lastErrorCode: current.healthy ? 'NONE' : 'CHECKOUT_SERVICE_UNAVAILABLE', failingDeploy: current.healthy ? 'none' : current.deploy, cartItemCount: readCart().items.length, cartIntact: true };
      },
      diagnostics: [
        { id: 'storefront_health', label: 'Storefront health', run: () => ({ status: 'pass', summary: 'Product pages and assets are serving normally.' }) },
        { id: 'cart_contents', label: 'Cart contents', run: () => ({ status: 'pass', summary: `The cart is intact: ${readCart().items.length} item, Aster H1 Headphones.` }) },
        { id: 'checkout_service', label: 'Checkout service', run: () => readService().healthy
          ? ({ status: 'pass' as const, summary: 'checkout-service is answering with HTTP 200.' })
          : ({ status: 'fail' as const, summary: `checkout-service returned HTTP 503 on 14 consecutive attempts. Deploy ${readService().deploy} is crash-looping (OOMKilled).` }) },
      ],
      actions: [{
        id: 'roll_back_checkout_service',
        label: 'Roll back the checkout service',
        description: 'Ask Host Whisperer to roll the checkout service back to the last deploy that passed its health checks.',
        effects: [`Restores deploy ${readService().lastGood}, the last version that passed health checks`, 'Leaves your cart and its items exactly as they are', 'Does not place an order or read your payment details', 'Takes about twenty seconds; the storefront stays online'],
        run: async (report) => {
          const current = readService();
          const beats: Array<[string, string]> = [
            ['Host Whisperer connected to Render', 'read-only deploy scope for this one service'],
            ['Read deploy history', `${current.deploy} failing · ${current.lastGood} last healthy`],
            ['Read service logs', 'OOMKilled × 14 in the last six minutes'],
            ['Requested rollback', `target ${current.lastGood}`],
            ['Host confirmed rollback', 'checkout-service is reporting healthy'],
          ];
          for (const [label, detail] of beats) { await wait(750); report?.(label, detail); }
          writeService({ healthy: true, deploy: current.lastGood, lastGood: current.lastGood });
          window.dispatchEvent(new Event('hostwhisperer:service-restored'));
        },
        verify: () => readService().healthy
          ? ({ recovered: true, summary: 'POST /api/checkout now returns HTTP 200. Retry your checkout — the Aster H1 is still in the cart.' })
          : ({ recovered: false, summary: 'checkout-service is still returning HTTP 503.' }),
      }],
    });
    return () => { window.removeEventListener('hostwhisperer:service-restored', refresh); runtime.destroy(); };
  }, [installed, helpArmed]);

  const reset = () => { writeService(brokenService()); setService(readService()); setCheckout('idle'); setHelpArmed(false); };
  const restartJourney = () => { writeService(brokenService()); localStorage.setItem(demoInstallKey, 'false'); localStorage.removeItem(demoBundleKey); setService(readService()); setInstalled(false); setCheckout('idle'); setHelpArmed(false); };
  const enablePlugin = () => { localStorage.removeItem(demoInstallKey); setInstalled(true); };

  return <div className="shop-shell">
    <div className="shop-promo">Free delivery on orders over $50 <b>·</b> 30-day returns <b>·</b> 2-year warranty</div>
    <header className="shop-nav">
      <a href="/?view=shop" className="shop-logo">NORTHSTAR</a>
      <nav><span>Audio</span><span>Workspace</span><span>Travel</span><span>Journal</span></nav>
      <div className="shop-nav-tools"><Search size={17} /><UserRound size={17} /><span className="shop-bag"><ShoppingBag size={17} /><b>{cart.items.length}</b></span></div>
    </header>
    <main className="product-layout">
      <section className="product-visual">
        <span className="product-badge">Editor’s choice</span>
        <div className="headphone-art"><i /><i /><b>H1</b></div>
        <div className="thumb-row"><span className="active" /><span /><span /></div>
      </section>
      <section className="product-details">
        <div className="crumb">Audio <i>/</i> Wireless headphones</div>
        <h1>Aster H1</h1>
        <p className="product-sub">Studio sound. All-day calm.</p>
        <div className="rating"><span className="stars">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={13} fill="currentColor" strokeWidth={0} />)}</span><span>4.8 · 2,104 reviews</span></div>
        <div className="price-row"><strong className="price">$149</strong><span className="price-was">$189</span><span className="price-tag">Save $40</span></div>
        <p className="description">Adaptive noise cancellation, spatial audio, and a 38-hour battery in a lightweight aluminum frame.</p>
        <div className="color-row"><b>Color</b><span className="swatch active" /><span className="swatch dark" /><span className="swatch sand" /><em>Sea Salt</em></div>

        {checkout !== 'placed' && <button className="checkout-button" onClick={tryCheckout}><ShoppingBag size={18} /> {checkout === 'failed' && service.healthy ? 'Try checkout again' : 'Checkout'}</button>}

        {checkout === 'failed' && !service.healthy && <div className="checkout-error" data-hw-error ref={errorRef}>
          <div className="error-head"><ServerCrash size={22} /><div><strong>503</strong><span>Service Unavailable</span></div></div>
          <p>Checkout is failing on the store’s side. Your cart is safe and no payment was attempted.</p>
          <pre className="error-trace">{`HTTP 503 · Service Unavailable\nPOST /api/checkout        x-request-id: ${requestId}\nupstream: checkout-service — no healthy instances`}</pre>
        </div>}

        {checkout === 'failed' && service.healthy && <div className="checkout-success"><Check size={18} /><div><strong>Checkout is back online</strong><p>The checkout service was rolled back to a healthy deploy. Your Aster H1 is still in the cart — try again.</p></div></div>}

        {checkout === 'placed' && <div className="checkout-success"><Check size={18} /><div><strong>Order confirmed</strong><p>Thanks! Your Aster H1 Headphones are on the way. This is a demonstration store, so no payment was taken.</p></div></div>}

        {installed && checkout === 'failed' && !service.healthy && <div className="demo-callout installed"><Bot size={18} /><div><strong>{agentLabel} can work on this</strong><p>Open the dialog beside the error, then ask: <b>“Fix checkout for me.”</b></p></div></div>}

        <ul className="assurance-row"><li><Truck size={16} /> Free 2-day delivery</li><li><RotateCcw size={16} /> 30-day returns</li><li><Lock size={16} /> Secure payment</li><li><CreditCard size={16} /> Pay in 4</li></ul>
        <div className="demo-reset-row">
          <span>Demo controls</span>
          <button className="reset-demo" onClick={reset}><RefreshCw size={13} /> Reset the outage</button>
          {installed
            ? <button className="reset-demo" onClick={restartJourney}><RefreshCw size={13} /> Show it without the plugin</button>
            : <button className="reset-demo" onClick={enablePlugin}><RefreshCw size={13} /> Turn the plugin back on</button>}
        </div>
      </section>
    </main>
    <footer className="shop-footer"><span>Northstar demonstration store · No real purchases</span><span>{installed ? 'AI support enabled' : 'Secure checkout'}</span></footer>
  </div>;
}

/* ------------------------------------------------------------------ */
/* Surface 4 — Northstar Admin: kept for the deeper developer story.    */
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
    ['ok', '08:10', 'Storefront theme published', 'Version 2.4.0 by Alex Morgan'],
  ];
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a href="/?view=admin" className="admin-logo"><span>N</span><div><strong>Northstar</strong><small>Store Admin</small></div></a>
      <nav>
        <a className="active" href="/?view=admin"><LayoutDashboard size={16} /> Overview</a>
        <span><ShoppingBag size={16} /> Orders<b>24</b></span>
        <span><Boxes size={16} /> Products</span>
        <span><Gauge size={16} /> Store health</span>
        <span><Plug size={16} /> Integrations</span>
        <span><Settings size={16} /> Settings</span>
      </nav>
      <div className="admin-user"><i>AM</i><div><strong>Alex Morgan</strong><small>Store developer</small></div></div>
    </aside>
    <div className="admin-body">
      <header className="admin-topbar">
        <div className="admin-crumb">Northstar <ChevronRight size={13} /> Apps <ChevronRight size={13} /> <b>Integrations</b></div>
        <div className="admin-tools"><label className="admin-search"><Search size={14} /><input placeholder="Search the admin" aria-label="Search the admin" /></label><span className="admin-icon-button"><Bell size={15} /><i /></span><a className="admin-cta" href="/?view=shop">View storefront <ArrowUpRight size={14} /></a></div>
      </header>
      <main className="admin-main">
        <div className="admin-head"><div><span className="admin-eyebrow">Developer workspace</span><h1>Store integrations</h1><p>Apps and code packages applied to the Northstar customer website.</p></div><div className="admin-head-meta"><Clock size={13} /> Synced a moment ago</div></div>

        <section className="admin-stats">
          <article><span>Store status</span><strong className="online"><i /> Online</strong><small>Storefront healthy · checkout degraded</small></article>
          <article><span>Active integrations</span><strong>{installed ? '1' : '0'}</strong><small>{installed ? 'Host Whisperer support operator' : 'No apps installed yet'}</small></article>
          <article><span>Checkout incidents</span><strong className="warning">1 open</strong><small>Opened 09:42 · unresolved</small></article>
          <article><span>Sessions today</span><strong>3,481</strong><small className="up">+12.4% vs. last week</small></article>
        </section>

        <section className="admin-integration">
          <div className="admin-section-head"><div><span className="section-mark"><Plug size={17} /></span><div><h2>Support integration</h2><p>Code packages applied to the Northstar customer website.</p></div></div><span className={installed ? 'admin-badge live' : 'admin-badge'}>{installed ? 'Active' : 'Not installed'}</span></div>
          {!bundleReady && !installed && <div className="admin-empty"><PackageCheck size={26} /><h3>No integration package received</h3><p>Connect a host in Host Whisperer and download the plugin, then return here to install it.</p><a href="/?view=integrate">Open Host Whisperer <ArrowRight size={14} /></a></div>}
          {bundleReady && !installed && <div className="package-review">
            <div className="package-title"><span className="package-icon">HW</span><div><strong>Host Whisperer support operator</strong><p>Prepared for Northstar Shop · hosting recovery playbook</p></div><span className="package-version">v0.1.0</span></div>
            <div className="package-files"><span><Code2 size={14} /> host-whisperer-plugin.js</span></div>
            <div className="package-permissions"><strong>Requested website capabilities</strong><span><Check size={13} /> Read allowlisted page and checkout context</span><span><Check size={13} /> Run three safe diagnostics</span><span><Check size={13} /> Roll back the checkout service after customer approval</span><span><Check size={13} /> Verify checkout before reporting success</span></div>
            <button className={installing ? 'admin-install installing' : 'admin-install'} onClick={install} disabled={installing}><Plug size={16} /> {installing ? 'Deploying plugin to storefront…' : 'Install plugin on storefront'}</button>
          </div>}
          {installed && <div className="admin-live"><div><span className="admin-live-mark"><Check size={20} /></span><div><strong>Host Whisperer is active</strong><p>Six WebMCP support tools and the customer help dialog are deployed.</p></div></div><a href="/?view=shop">Test on storefront <ArrowRight size={14} /></a></div>}
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
