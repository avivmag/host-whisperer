import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Bell, Bot, Boxes, Check, ChevronRight, CircleAlert, Clock, Code2, Copy, CreditCard, Download, Gauge, LayoutDashboard, Lock, PackageCheck, Plug, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, ShoppingBag, Sparkles, Star, TerminalSquare, Truck, UserRound, Wrench } from 'lucide-react';
import { createHostWhispererRuntime } from './runtime';
import { generatedAdapter, getStudioSnapshot, hydrateStudio, prepareStudioBundle, subscribeStudio, updateStudioProfile } from './studio';
import { providers, type EscalationPacket, type ProviderId } from './types';

const providerNames: Record<ProviderId, string> = { aws: 'AWS', gcp: 'Google Cloud', cloudflare: 'Cloudflare', vercel: 'Vercel', netlify: 'Netlify', render: 'Render', shopify: 'Shopify' };
const demoInstallKey = 'host-whisperer-northstar-installed';
const demoBundleKey = 'host-whisperer-northstar-bundle-ready';

function downloadText(filename: string, value: string, type = 'text/javascript') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Surface 1 — Host Whisperer: the vendor's own dark operator console.  */
/* ------------------------------------------------------------------ */

function AppHeader({ section }: { section: string }) {
  return <header className="topbar"><a className="brand" href="/"><span className="brand-glyph">hw</span><span className="brand-name">Host Whisperer</span></a><nav className="topbar-nav"><a href="/">Walkthrough</a><a href="/?view=integrate">Integration Studio</a><a href="/?view=shop">Live demo</a></nav><span className="topbar-section">{section}</span></header>;
}

function AppFooter({ label }: { label: string }) {
  return <footer className="hw-footer"><span className="brand-glyph small">hw</span><span className="hw-footer-name">{label}</span><span className="hw-footer-note">Developers define the boundaries. Customers stay in control.</span></footer>;
}

const operatorLog: Array<[string, string, string]> = [
  ['done', 'get_support_context', 'route /product/aster-h1 · cart schema v1'],
  ['done', 'run_support_diagnostics', '2 checks pass · 1 check fails'],
  ['hold', 'prepare_recovery', 'rebuild_cart_session · awaiting approval'],
  ['done', 'apply_recovery', 'cart session migrated v1 → v2'],
  ['done', 'verify_recovery', 'checkout ready · item preserved'],
];

function Overview() {
  const installed = localStorage.getItem(demoInstallKey) === 'true';
  const steps: Array<[string, string, string]> = [
    ['01', 'A customer hits an error', 'The existing website fails normally. Before installation, no Host Whisperer interface or developer link is present.'],
    ['02', 'The developer defines safe tools', 'In the separate Integration Studio, the developer chooses exactly what the AI may inspect, repair, and verify.'],
    ['03', 'The store admin installs it', 'The generated package moves to Northstar Admin, where the store owner applies it to the customer website.'],
    ['04', 'ChatGPT diagnoses and repairs', 'The customer asks in plain English, approves the bounded fix, and watches every tool call happen live.'],
  ];
  const surfaces: Array<[string, string, string, string]> = [
    ['Customer', 'Northstar Market', 'Shop the store and run into the checkout failure.', '/?view=shop'],
    ['Operator', 'Host Whisperer Studio', 'Define the safe tools and generate the plugin.', '/?view=integrate'],
    ['Store developer', 'Northstar Admin', 'Review the package and install it on the storefront.', '/?view=admin'],
  ];
  return <div className="app-shell hw-home"><AppHeader section="Product walkthrough" />
    <main className="overview">
      <section className="overview-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14} /> WebMCP support infrastructure</div>
          <h1>Turn website errors into <em>guided AI recovery.</em></h1>
          <p>Host Whisperer generates a safe support layer for an existing website. Developers set the boundaries once; customers can then ask ChatGPT to diagnose and repair supported problems without opening a ticket.</p>
          <div className="hero-actions"><a className="primary-link" href="/?view=integrate"><Wrench size={16} /> Open Integration Studio <ArrowRight size={16} /></a><a className="secondary-link" href="/?view=shop"><ShoppingBag size={16} /> View Northstar website</a></div>
          <dl className="hero-facts"><div><dt>Runtime tools</dt><dd>6</dd></div><div><dt>Bound origins</dt><dd>1</dd></div><div><dt>Credentials exposed</dt><dd>0</dd></div><div><dt>Unapproved fixes</dt><dd>0</dd></div></dl>
        </div>
        <aside className="hero-console">
          <div className="console-chrome"><i /><i /><i /><span>operator activity — northstar-commerce-demo</span></div>
          <ol className="console-log">{operatorLog.map(([status, tool, detail]) => <li key={tool} className={status}><i /><div><b>{tool}</b><span>{detail}</span></div></li>)}</ol>
          <div className="console-foot"><ShieldCheck size={14} /> Nothing is repaired until the customer approves it on screen.</div>
        </aside>
      </section>

      <section className="walkthrough">
        <div className="section-head"><div className="section-kicker">The complete walkthrough</div><h2>From a dead end to a verified recovery</h2></div>
        <ol className="step-rail">{steps.map(([number, title, body]) => <li key={number}><span className="step-num">{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
      </section>

      <section className="webmcp-explainer">
        <div className="explainer-mark"><Bot size={22} /></div>
        <div className="explainer-body"><h2>WebMCP lives in the installed plugin</h2><p>Host Whisperer itself is a normal developer tool. It generates an adapter that registers safe support tools on the customer’s website. When that website is open in ChatGPT’s browser, the agent can discover those tools and help with the live problem.</p></div>
        <a className="explainer-link" href="/?view=shop">See the customer website <ArrowRight size={15} /></a>
      </section>

      <section className="surface-switcher">
        <div className="section-kicker">Three surfaces, three audiences</div>
        <div className="surface-grid">{surfaces.map(([role, name, copy, href]) => <a key={name} className="surface-card" href={href}><span className="surface-role">{role}</span><strong>{name}</strong><p>{copy}</p><em>Open<ArrowUpRight size={14} /></em></a>)}</div>
      </section>

      <section className="demo-state"><div className="demo-state-dot" data-on={installed}><i /></div><div><strong>Current browser demo state</strong><span>{installed ? 'Plugin installed on Northstar Market' : 'Northstar Market has no plugin installed'}</span></div><a href="/?view=shop">Open the customer website <ArrowRight size={14} /></a></section>
    </main><AppFooter label="Host Whisperer" /></div>;
}

function Studio() {
  const profile = useSyncExternalStore(subscribeStudio, getStudioSnapshot, getStudioSnapshot);
  const code = useMemo(() => generatedAdapter(profile), [profile]);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToAdmin, setSentToAdmin] = useState(() => localStorage.getItem(demoBundleKey) === 'true');

  useEffect(() => { void hydrateStudio(); }, []);

  const update = (input: Parameters<typeof updateStudioProfile>[0]) => void updateStudioProfile(input).catch((error) => window.alert(error instanceof Error ? error.message : String(error)));
  const copyInstall = async () => {
    await navigator.clipboard.writeText(`<script type="module" src="/support/host-whisperer-adapter.js"></script>`);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  const sendToAdmin = () => {
    setSending(true);
    window.setTimeout(() => {
      localStorage.setItem(demoBundleKey, 'true');
      setSentToAdmin(true);
      setSending(false);
    }, 1500);
  };
  const lines = code.split('\n');

  return <div className="app-shell hw-studio"><AppHeader section="Developer integration" />
    <div className="integration-intro">
      <div><div className="eyebrow"><Plug size={14} /> Integration Studio</div><h1>Configure the support boundary</h1><p>This developer-only page generates the adapter that will be added to your website. Nothing is installed until you review and prepare the plugin.</p></div>
      <div className="intro-meta"><span className="intro-role">Developer configuration</span><span className="intro-build">playbook · {profile.playbook}</span></div>
    </div>
    <main className="studio-grid">
      <section className="studio-panel config-panel">
        <div className="panel-heading"><div><Wrench size={16} /><span>Integration profile</span></div><small>developer configuration</small></div>
        <div className="field-stack">
          <label>Application name<input value={profile.appName} onChange={(event) => update({ appName: event.target.value })} /></label>
          <label>Allowed website origin<input key={profile.allowedOrigin} defaultValue={profile.allowedOrigin} onBlur={(event) => update({ allowedOrigin: event.target.value })} /></label>
          <label>Hosting provider <small>used only as escalation context</small><select value={profile.provider} onChange={(event) => update({ provider: event.target.value as ProviderId })}>{providers.map((provider) => <option key={provider} value={provider}>{providerNames[provider]}</option>)}</select></label>
          <label>Verified playbook<select value={profile.playbook} onChange={(event) => update({ playbook: event.target.value as 'commerce-cart' })}><option value="commerce-cart">Commerce · broken cart session</option></select></label>
        </div>
        <div className="privacy-note"><ShieldCheck size={18} /><div><strong>Customer-safe boundary</strong><p>The generated adapter excludes provider credentials, service references, payment data, URL queries, and unrestricted scripts.</p></div></div>
        <button className="primary-button" onClick={() => void prepareStudioBundle()}><PackageCheck size={17} /> Generate support plugin</button>
      </section>

      <section className="studio-panel code-panel">
        <div className="code-chrome"><span className="chrome-dots"><i /><i /><i /></span><span className="chrome-title"><Code2 size={14} /> Generated universal adapter</span><span className="language">JavaScript · ESM</span></div>
        <div className="code-body"><ol className="code-gutter" aria-hidden="true">{lines.map((_, index) => <li key={index}>{index + 1}</li>)}</ol><pre>{code}</pre></div>
        <div className="download-row"><button onClick={() => downloadText('host-whisperer-adapter.js', code)} disabled={!profile.bundlePrepared}><Download size={15} /> Adapter</button><a className={profile.bundlePrepared ? '' : 'disabled'} href="/runtime/host-whisperer.js" download><Download size={15} /> Runtime</a><button onClick={() => void copyInstall()} disabled={!profile.bundlePrepared}><Copy size={15} /> {copied ? 'Copied' : 'Install tag'}</button></div>
        {!profile.bundlePrepared && <p className="prepare-hint">Review the profile and generate the plugin before exporting it.</p>}
        {profile.bundlePrepared && !sentToAdmin && <button className={`demo-install-button ${sending ? 'installing' : ''}`} onClick={sendToAdmin} disabled={sending}><PackageCheck size={17} /> {sending ? 'Preparing package for Northstar…' : 'Send package to Northstar Admin'}</button>}
        {sentToAdmin && <div className="install-complete"><Check size={18} /><div><strong>Integration package is ready</strong><span>Host Whisperer generated the files; the store owner must install them.</span></div><a href="/?view=admin">Open Northstar Admin <ArrowRight size={14} /></a></div>}
      </section>

      <section className="capability-strip"><div className="strip-label"><Activity size={16} /><strong>Generated customer tools</strong></div><div className="strip-items">{['Read safe context', 'Run diagnostics', 'Prepare recovery', 'Apply after approval', 'Verify', 'Escalate safely'].map((value) => <span key={value}><Check size={12} />{value}</span>)}</div></section>
    </main><AppFooter label="Host Whisperer Studio" /></div>;
}

type Cart = { schemaVersion: number; items: Array<{ sku: string; name: string; price: number; quantity: number }> };
const cartKey = 'northstar-demo-cart';
const brokenCart = (): Cart => ({ schemaVersion: 1, items: [{ sku: 'ASTER-H1', name: 'Aster H1 Headphones', price: 149, quantity: 1 }] });
const readCart = () => { try { return JSON.parse(localStorage.getItem(cartKey) || '') as Cart; } catch { const cart = brokenCart(); localStorage.setItem(cartKey, JSON.stringify(cart)); return cart; } };

/* ------------------------------------------------------------------ */
/* Surface 2 — Northstar Admin: the store owner's enterprise console.   */
/* ------------------------------------------------------------------ */

function StoreAdmin() {
  const [bundleReady] = useState(() => localStorage.getItem(demoBundleKey) === 'true');
  const [installed, setInstalled] = useState(() => localStorage.getItem(demoInstallKey) === 'true');
  const [installing, setInstalling] = useState(false);
  const install = () => {
    if (!bundleReady) return;
    setInstalling(true);
    window.setTimeout(() => {
      localStorage.setItem(demoInstallKey, 'true');
      setInstalled(true);
      setInstalling(false);
    }, 1700);
  };
  const activity: Array<[string, string, string, string]> = [
    ['warn', '09:42', 'Checkout error reported', 'CART_SESSION_OUTDATED · 1 session affected'],
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
          <article><span>Store status</span><strong className="online"><i /> Online</strong><small>All checkout regions healthy</small></article>
          <article><span>Active integrations</span><strong>{installed ? '1' : '0'}</strong><small>{installed ? 'Host Whisperer support operator' : 'No apps installed yet'}</small></article>
          <article><span>Checkout incidents</span><strong className="warning">1 open</strong><small>Opened 09:42 · unresolved</small></article>
          <article><span>Sessions today</span><strong>3,481</strong><small className="up">+12.4% vs. last week</small></article>
        </section>

        <section className="admin-integration">
          <div className="admin-section-head"><div><span className="section-mark"><Plug size={17} /></span><div><h2>Support integration</h2><p>Code packages applied to the Northstar customer website.</p></div></div><span className={installed ? 'admin-badge live' : 'admin-badge'}>{installed ? 'Active' : 'Not installed'}</span></div>
          {!bundleReady && <div className="admin-empty"><PackageCheck size={26} /><h3>No integration package received</h3><p>Generate a customer-support adapter in Host Whisperer, then return here to install it.</p><a href="/?view=integrate">Open Host Whisperer <ArrowRight size={14} /></a></div>}
          {bundleReady && !installed && <div className="package-review">
            <div className="package-title"><span className="package-icon">HW</span><div><strong>Host Whisperer support operator</strong><p>Prepared for Northstar Shop · Commerce cart playbook</p></div><span className="package-version">v0.1.0</span></div>
            <div className="package-files"><span><Code2 size={14} /> host-whisperer-adapter.js</span><span><Code2 size={14} /> host-whisperer.js</span></div>
            <div className="package-permissions"><strong>Requested website capabilities</strong><span><Check size={13} /> Read allowlisted cart context</span><span><Check size={13} /> Run three safe diagnostics</span><span><Check size={13} /> Rebuild cart only after customer approval</span><span><Check size={13} /> Verify checkout compatibility</span></div>
            <button className={installing ? 'admin-install installing' : 'admin-install'} onClick={install} disabled={installing}><Plug size={16} /> {installing ? 'Deploying plugin to storefront…' : 'Install plugin on storefront'}</button>
          </div>}
          {installed && <div className="admin-live"><div><span className="admin-live-mark"><Check size={20} /></span><div><strong>Host Whisperer is active</strong><p>Six WebMCP support tools and the customer help control are now deployed.</p></div></div><a href="/?view=shop">Test on storefront <ArrowRight size={14} /></a></div>}
        </section>

        <section className="admin-activity">
          <div className="admin-section-head"><div><span className="section-mark"><Activity size={17} /></span><div><h2>Recent store activity</h2><p>Automated events from the storefront and checkout services.</p></div></div><span className="admin-badge">Last 24 hours</span></div>
          <ul className="activity-list">{activity.map(([tone, time, title, detail]) => <li key={time} className={tone}><i /><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></li>)}</ul>
        </section>
      </main>
    </div>
  </div>;
}

/* ------------------------------------------------------------------ */
/* Surface 3 — Northstar Market: the customer-facing retail storefront. */
/* ------------------------------------------------------------------ */

function ShopDemo() {
  const [cart, setCart] = useState<Cart>(() => { if (!localStorage.getItem(cartKey)) localStorage.setItem(cartKey, JSON.stringify(brokenCart())); return readCart(); });
  const [checkoutTried, setCheckoutTried] = useState(false);
  const [installed, setInstalled] = useState(() => localStorage.getItem(demoInstallKey) === 'true');

  useEffect(() => {
    const refresh = () => setCart(readCart());
    window.addEventListener('hostwhisperer:cart-rebuilt', refresh);
    if (!installed || !checkoutTried) return () => window.removeEventListener('hostwhisperer:cart-rebuilt', refresh);
    const runtime = createHostWhispererRuntime({
      integrationId: 'northstar-commerce-demo', appName: 'Northstar Shop', allowedOrigin: location.origin, providerHint: 'render', studioUrl: `${location.origin}/?view=incident`,
      getContext: () => ({ route: location.pathname, appVersion: '2.4.0', cartItemCount: readCart().items.length, cartSchemaVersion: readCart().schemaVersion, expectedCartSchemaVersion: 2, lastErrorCode: readCart().schemaVersion === 2 ? 'NONE' : 'CART_SESSION_OUTDATED' }),
      diagnostics: [
        { id: 'store_health', label: 'Store health', run: () => ({ status: 'pass', summary: 'The storefront and checkout service are reachable.' }) },
        { id: 'inventory', label: 'Inventory availability', run: () => ({ status: 'pass', summary: 'Aster H1 Headphones are in stock.' }) },
        { id: 'cart_session', label: 'Cart session compatibility', run: () => readCart().schemaVersion === 2 ? ({ status: 'pass', summary: 'The cart uses the current session format.' }) : ({ status: 'fail', summary: 'The cart uses session format v1, but checkout requires v2.' }) },
      ],
      actions: [{ id: 'rebuild_cart_session', label: 'Rebuild cart session', description: 'Create a current cart session and restore the same product IDs and quantities.', effects: ['Preserves the Aster H1 Headphones in this cart', 'Does not place an order', 'Does not read or change payment details'], run: () => { const current = readCart(); localStorage.setItem(cartKey, JSON.stringify({ ...current, schemaVersion: 2 })); window.dispatchEvent(new Event('hostwhisperer:cart-rebuilt')); }, verify: () => ({ recovered: readCart().schemaVersion === 2, summary: readCart().schemaVersion === 2 ? 'Checkout is ready with the original item preserved.' : 'Checkout still cannot read the cart.' }) }],
    });
    return () => { window.removeEventListener('hostwhisperer:cart-rebuilt', refresh); runtime.destroy(); };
  }, [installed, checkoutTried]);

  const reset = () => { localStorage.setItem(cartKey, JSON.stringify(brokenCart())); setCart(readCart()); setCheckoutTried(false); };
  const restartJourney = () => { localStorage.setItem(cartKey, JSON.stringify(brokenCart())); localStorage.removeItem(demoInstallKey); localStorage.removeItem(demoBundleKey); setCart(readCart()); setInstalled(false); setCheckoutTried(false); };
  const healthy = cart.schemaVersion === 2;
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
        <button className="checkout-button" onClick={() => setCheckoutTried(true)}>{healthy ? <><Check size={18} /> Continue to secure checkout</> : <><ShoppingBag size={18} /> Checkout</>}</button>
        {checkoutTried && !healthy && <div className="checkout-error"><CircleAlert size={18} /><div><strong>We couldn’t open checkout</strong><p>{installed ? 'Your cart is still here. Ask AI for help—no payment was attempted.' : 'Something went wrong. Please try again later.'}</p><code>CART_SESSION_OUTDATED</code></div></div>}
        {healthy && <div className="checkout-success"><Check size={18} /><div><strong>Everything is running smoothly</strong><p>Checkout is ready and your Aster H1 is still in the cart. No order has been placed.</p></div></div>}
        {installed && !healthy && <div className="demo-callout installed"><Bot size={18} /><div><strong>AI support is now available</strong><p>Click “Ask AI to fix this,” then tell ChatGPT: <b>“Fix checkout safely.”</b></p></div></div>}
        <ul className="assurance-row"><li><Truck size={16} /> Free 2-day delivery</li><li><RotateCcw size={16} /> 30-day returns</li><li><Lock size={16} /> Secure payment</li><li><CreditCard size={16} /> Pay in 4</li></ul>
        <div className="demo-reset-row"><span>Demo controls</span><button className="reset-demo" onClick={reset}><RefreshCw size={13} /> Reset error only</button><button className="reset-demo" onClick={restartJourney}><RefreshCw size={13} /> Restart full story</button></div>
      </section>
    </main>
    <footer className="shop-footer"><span>Northstar demonstration store · No real purchases</span><span>{installed ? 'AI support enabled' : 'Secure checkout'}</span></footer>
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
      </> : <p className="empty-copy">Open a customer-approved escalation link generated by an installed Host Whisperer widget.</p>}
      <a className="primary-link" href="/?view=integrate"><ChevronRight size={15} /> Return to Integration Studio</a>
    </main><AppFooter label="Host Whisperer" /></div>;
}

export default function App() {
  const view = new URLSearchParams(location.search).get('view');
  if (view === 'shop') return <ShopDemo />;
  if (view === 'admin') return <StoreAdmin />;
  if (view === 'incident') return <IncidentView />;
  if (view === 'integrate') return <Studio />;
  return <Overview />;
}
