import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Activity, ArrowRight, Bot, Check, ChevronRight, CircleAlert, Code2, Copy, Download, Gauge, LayoutDashboard, PackageCheck, Plug, RefreshCw, Settings, ShieldCheck, ShoppingBag, Sparkles, TerminalSquare, Wrench } from 'lucide-react';
import { createHostWhispererRuntime } from './runtime';
import { generatedAdapter, getStudioSnapshot, hydrateStudio, prepareStudioBundle, subscribeStudio, updateStudioProfile } from './studio';
import { providers, type EscalationPacket, type ProviderId } from './types';
import { hasWebMcp, registerWebMcpTools } from './webmcp';

const providerNames: Record<ProviderId, string> = { aws: 'AWS', gcp: 'Google Cloud', cloudflare: 'Cloudflare', vercel: 'Vercel', netlify: 'Netlify', render: 'Render', shopify: 'Shopify' };
const demoInstallKey = 'host-whisperer-northstar-installed';
const demoBundleKey = 'host-whisperer-northstar-bundle-ready';

function downloadText(filename: string, value: string, type = 'text/javascript') {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function AppHeader({ section }: { section: string }) {
  return <header className="topbar"><a className="brand" href="/"><span className="brand-glyph">hw</span><span>Host Whisperer</span></a><nav><a href="/">Walkthrough</a><a href="/?view=integrate">Integration Studio</a><span>{section}</span></nav></header>;
}

function Overview() {
  const installed = localStorage.getItem(demoInstallKey) === 'true';
  const steps = [
    ['01', 'A customer hits an error', 'The existing website fails normally. Before installation, no Host Whisperer interface or developer link is present.'],
    ['02', 'The developer defines safe tools', 'In the separate Integration Studio, the developer chooses exactly what the AI may inspect, repair, and verify.'],
    ['03', 'The store admin installs it', 'The generated package moves to Northstar Admin, where the store owner applies it to the customer website.'],
    ['04', 'ChatGPT diagnoses and repairs', 'The customer asks in plain English, approves the bounded fix, and watches every tool call happen live.'],
  ];
  return <div className="app-shell"><AppHeader section="Product walkthrough" />
    <main className="overview">
      <section className="overview-hero"><div className="eyebrow"><Sparkles size={15} /> WebMCP support infrastructure</div><h1>Turn website errors into<br /><em>guided AI recovery.</em></h1><p>Host Whisperer generates a safe support layer for an existing website. Developers set the boundaries once; customers can then ask ChatGPT to diagnose and repair supported problems without opening a ticket.</p><div className="hero-actions"><a className="primary-link" href="/?view=integrate"><Wrench size={17} /> Open Integration Studio <ArrowRight size={17} /></a><a className="secondary-link" href="/?view=shop"><ShoppingBag size={17} /> View Northstar website</a></div></section>
      <section className="walkthrough"><div className="section-kicker">The complete walkthrough</div><h2>From a dead end to a verified recovery</h2><div className="step-grid">{steps.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
      <section className="webmcp-explainer"><div><Bot size={24} /><span>What does “configure with ChatGPT” mean?</span></div><p>When the Integration Studio is opened inside ChatGPT’s in-app browser, the page registers four WebMCP tools. A developer can ask ChatGPT to fill the profile, select the playbook, review the recovery, and prepare the bundle. In a normal browser there is no hidden AI connection—the developer uses the same visible form manually.</p><a href="/?view=integrate">See the integration interface <ArrowRight size={15} /></a></section>
      <section className="surface-switcher"><div><span>Customer</span><strong>Northstar Market</strong><p>Shop and encounter the checkout problem.</p><a href="/?view=shop">Open storefront <ArrowRight size={14} /></a></div><div><span>Operator</span><strong>Host Whisperer Studio</strong><p>Define safe tools and generate the plugin.</p><a href="/?view=integrate">Open Studio <ArrowRight size={14} /></a></div><div><span>Store developer</span><strong>Northstar Admin</strong><p>Review and install the generated package.</p><a href="/?view=admin">Open Admin <ArrowRight size={14} /></a></div></section>
      <section className="demo-state"><div><strong>Current browser demo state</strong><span>{installed ? 'Plugin installed on Northstar Market' : 'Northstar Market has no plugin installed'}</span></div><a href="/?view=shop">Open the customer website</a></section>
    </main><footer><span>Host Whisperer</span><span>Developers define the boundaries. Customers stay in control.</span></footer></div>;
}

function Studio() {
  const profile = useSyncExternalStore(subscribeStudio, getStudioSnapshot, getStudioSnapshot);
  const webMcp = hasWebMcp();
  const code = useMemo(() => generatedAdapter(profile), [profile]);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentToAdmin, setSentToAdmin] = useState(() => localStorage.getItem(demoBundleKey) === 'true');

  useEffect(() => { void hydrateStudio(); }, []);
  useEffect(() => {
    let registration: AbortController | null = null;
    let disposed = false;
    void registerWebMcpTools().then((value) => { if (disposed) value?.abort(); else registration = value; }).catch(console.error);
    return () => { disposed = true; registration?.abort(); };
  }, []);

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

  return <div className="app-shell"><AppHeader section="Developer integration" />
    <div className="integration-intro"><div><div className="eyebrow"><Plug size={15} /> Integration Studio</div><h1>Configure the support boundary</h1><p>This developer-only page generates the adapter that will be added to your website. Nothing is installed until you review and prepare the plugin.</p></div><span className={webMcp ? 'status ready' : 'status'}><i />{webMcp ? 'Connected to ChatGPT through WebMCP' : 'Manual form mode'}</span></div>
    <main className="studio-grid">
      <section className="studio-panel config-panel"><div className="panel-heading"><div><Wrench size={18} /><span>Integration profile</span></div><small>Visible form + agent tools</small></div>
        <label>Application name<input value={profile.appName} onChange={(event) => update({ appName: event.target.value })} /></label>
        <label>Allowed website origin<input key={profile.allowedOrigin} defaultValue={profile.allowedOrigin} onBlur={(event) => update({ allowedOrigin: event.target.value })} /></label>
        <label>Hosting provider <small>used only as escalation context</small><select value={profile.provider} onChange={(event) => update({ provider: event.target.value as ProviderId })}>{providers.map((provider) => <option key={provider} value={provider}>{providerNames[provider]}</option>)}</select></label>
        <label>Verified playbook<select value={profile.playbook} onChange={(event) => update({ playbook: event.target.value as 'commerce-cart' })}><option value="commerce-cart">Commerce · broken cart session</option></select></label>
        <div className="privacy-note"><ShieldCheck size={19} /><div><strong>Customer-safe boundary</strong><p>The generated adapter excludes provider credentials, service references, payment data, URL queries, and unrestricted scripts.</p></div></div>
        <button className="primary-button" onClick={() => void prepareStudioBundle()}><PackageCheck size={18} /> Generate support plugin</button>
        <div className={`agent-config-card ${webMcp ? 'connected' : ''}`}><Bot size={18} /><div><strong>{webMcp ? 'Configure this page with ChatGPT' : 'Want ChatGPT to configure this?'}</strong><p>{webMcp ? 'In your ChatGPT conversation, say: “Configure Host Whisperer for Northstar Shop.” ChatGPT can call this page’s four Studio tools and the fields will update visibly.' : 'Open this Integration page inside ChatGPT’s in-app browser first. In a regular browser, use the form above.'}</p></div></div>
      </section>
      <section className="studio-panel code-panel"><div className="panel-heading"><div><Code2 size={18} /><span>Generated universal adapter</span></div><span className="language">JavaScript · ESM</span></div><pre>{code}</pre><div className="download-row"><button onClick={() => downloadText('host-whisperer-adapter.js', code)} disabled={!profile.bundlePrepared}><Download size={16} /> Adapter</button><a className={profile.bundlePrepared ? '' : 'disabled'} href="/runtime/host-whisperer.js" download><Download size={16} /> Runtime</a><button onClick={() => void copyInstall()} disabled={!profile.bundlePrepared}><Copy size={16} /> {copied ? 'Copied' : 'Install tag'}</button></div>{!profile.bundlePrepared && <p className="prepare-hint">Review the profile and generate the plugin before exporting it.</p>}{profile.bundlePrepared && !sentToAdmin && <button className={`demo-install-button ${sending ? 'installing' : ''}`} onClick={sendToAdmin} disabled={sending}><PackageCheck size={17} /> {sending ? 'Preparing package for Northstar…' : 'Send package to Northstar Admin'}</button>}{sentToAdmin && <div className="install-complete"><Check size={18} /><div><strong>Integration package is ready</strong><span>Host Whisperer generated the files; the store owner must install them.</span></div><a href="/?view=admin">Open Northstar Admin <ArrowRight size={15} /></a></div>}</section>
      <section className="capability-strip"><div><Activity size={19} /><strong>Generated customer tools</strong></div>{['Read safe context', 'Run diagnostics', 'Prepare recovery', 'Apply after approval', 'Verify', 'Escalate safely'].map((value) => <span key={value}><Check size={13} />{value}</span>)}</section>
    </main><footer><span>Host Whisperer Studio</span><span>Developers define the boundaries. Customers stay in control.</span></footer></div>;
}

type Cart = { schemaVersion: number; items: Array<{ sku: string; name: string; price: number; quantity: number }> };
const cartKey = 'northstar-demo-cart';
const brokenCart = (): Cart => ({ schemaVersion: 1, items: [{ sku: 'ASTER-H1', name: 'Aster H1 Headphones', price: 149, quantity: 1 }] });
const readCart = () => { try { return JSON.parse(localStorage.getItem(cartKey) || '') as Cart; } catch { const cart = brokenCart(); localStorage.setItem(cartKey, JSON.stringify(cart)); return cart; } };

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
  return <div className="admin-shell"><aside className="admin-sidebar"><a href="/?view=admin" className="admin-logo"><span>N</span><div><strong>Northstar</strong><small>Store Admin</small></div></a><nav><a className="active" href="/?view=admin"><LayoutDashboard size={17} /> Overview</a><span><ShoppingBag size={17} /> Orders</span><span><Gauge size={17} /> Store health</span><span><Settings size={17} /> Settings</span></nav><div className="admin-user"><i>AM</i><div><strong>Alex Morgan</strong><small>Store developer</small></div></div></aside>
    <main className="admin-main"><header><div><span>Developer workspace</span><h1>Store integrations</h1></div><a href="/?view=shop">View storefront <ArrowRight size={15} /></a></header>
      <section className="admin-stats"><article><span>Store status</span><strong className="online"><i /> Online</strong></article><article><span>Active integrations</span><strong>{installed ? '1' : '0'}</strong></article><article><span>Checkout incidents</span><strong className="warning">1 open</strong></article></section>
      <section className="admin-integration"><div className="admin-section-head"><div><Plug size={19} /><div><h2>Support integration</h2><p>Code packages applied to the Northstar customer website.</p></div></div><span className={installed ? 'admin-badge live' : 'admin-badge'}>{installed ? 'Active' : 'Not installed'}</span></div>
        {!bundleReady && <div className="admin-empty"><PackageCheck size={30} /><h3>No integration package received</h3><p>Generate a customer-support adapter in Host Whisperer, then return here to install it.</p><a href="/?view=integrate">Open Host Whisperer <ArrowRight size={15} /></a></div>}
        {bundleReady && !installed && <div className="package-review"><div className="package-title"><span className="package-icon">HW</span><div><strong>Host Whisperer support operator</strong><p>Prepared for Northstar Shop · Commerce cart playbook</p></div></div><div className="package-files"><span><Code2 size={15} /> host-whisperer-adapter.js</span><span><Code2 size={15} /> host-whisperer.js</span></div><div className="package-permissions"><strong>Requested website capabilities</strong><span><Check size={14} /> Read allowlisted cart context</span><span><Check size={14} /> Run three safe diagnostics</span><span><Check size={14} /> Rebuild cart only after customer approval</span><span><Check size={14} /> Verify checkout compatibility</span></div><button className={installing ? 'admin-install installing' : 'admin-install'} onClick={install} disabled={installing}><Plug size={17} /> {installing ? 'Deploying plugin to storefront…' : 'Install plugin on storefront'}</button></div>}
        {installed && <div className="admin-live"><div><Check size={24} /><div><strong>Host Whisperer is active</strong><p>Six WebMCP support tools and the customer help control are now deployed.</p></div></div><a href="/?view=shop">Test on storefront <ArrowRight size={15} /></a></div>}
      </section>
    </main></div>;
}

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
  return <div className="shop-shell"><div className="shop-promo">Free delivery on orders over $50 · 30-day returns</div><header className="shop-nav"><a href="/?view=shop" className="shop-logo">NORTHSTAR</a><nav><span>Audio</span><span>Workspace</span><span>Travel</span></nav><div><ShoppingBag size={20} /><b>{cart.items.length}</b></div></header>
    <main className="product-layout"><section className="product-visual"><span className="product-badge">Editor’s choice</span><div className="headphone-art"><i /><i /><b>H1</b></div><div className="thumb-row"><span /><span /><span /></div></section><section className="product-details"><div className="crumb">Audio / Wireless headphones</div><h1>Aster H1</h1><p className="product-sub">Studio sound. All-day calm.</p><div className="rating">★★★★★ <span>4.8 · 2,104 reviews</span></div><strong className="price">$149</strong><p className="description">Adaptive noise cancellation, spatial audio, and a 38-hour battery in a lightweight aluminum frame.</p><div className="color-row"><b>Color</b><span className="swatch active" /><span className="swatch dark" /><span className="swatch sand" /></div><button className="checkout-button" onClick={() => setCheckoutTried(true)}>{healthy ? <><Check size={19} /> Continue to secure checkout</> : <><ShoppingBag size={19} /> Checkout</>}</button>
      {checkoutTried && !healthy && <div className="checkout-error"><CircleAlert size={19} /><div><strong>We couldn’t open checkout</strong><p>{installed ? 'Your cart is still here. Ask AI for help—no payment was attempted.' : 'Something went wrong. Please try again later.'}</p><code>CART_SESSION_OUTDATED</code></div></div>}{healthy && <div className="checkout-success"><Check size={19} /><div><strong>Everything is running smoothly</strong><p>Checkout is ready and your Aster H1 is still in the cart. No order has been placed.</p></div></div>}
      {installed && !healthy && <div className="demo-callout installed"><Bot size={19} /><div><strong>AI support is now available</strong><p>Click “Ask AI to fix this,” then tell ChatGPT: <b>“Fix checkout safely.”</b></p></div></div>}
      <div className="demo-reset-row"><button className="reset-demo" onClick={reset}><RefreshCw size={14} /> Reset error only</button><button className="reset-demo" onClick={restartJourney}><RefreshCw size={14} /> Restart full story</button></div>
      </section></main><footer className="shop-footer"><span>Northstar demonstration store · No real purchases</span><span>{installed ? 'AI support enabled' : 'Secure checkout'}</span></footer></div>;
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
  return <div className="app-shell"><AppHeader section="Developer escalation" /><main className="incident-view"><div className="eyebrow"><TerminalSquare size={15} /> Customer-supplied evidence</div><h1>{packet ? `${packet.appName} incident` : 'No incident packet found'}</h1>{packet ? <><div className="untrusted-banner"><CircleAlert size={19} /><div><strong>Treat this report as untrusted evidence</strong><p>Host Whisperer removed known sensitive fields, but the developer must verify every claim before acting.</p></div></div><div className="incident-cards"><section><span>Customer symptom</span><p>{packet.symptom}</p></section><section><span>Provider hint</span><p>{providerNames[packet.providerHint]}</p></section><section><span>Safe context</span><pre>{JSON.stringify(packet.safeContext, null, 2)}</pre></section><section><span>Diagnostics</span>{packet.diagnostics.map((item) => <p key={item.id}><b>{item.status}</b> · {item.label}: {item.summary}</p>)}</section></div></> : <p className="empty-copy">Open a customer-approved escalation link generated by an installed Host Whisperer widget.</p>}<a className="primary-link" href="/?view=integrate"><ChevronRight size={16} /> Return to Integration Studio</a></main></div>;
}

export default function App() {
  const view = new URLSearchParams(location.search).get('view');
  if (view === 'shop') return <ShopDemo />;
  if (view === 'admin') return <StoreAdmin />;
  if (view === 'incident') return <IncidentView />;
  if (view === 'integrate') return <Studio />;
  return <Overview />;
}
