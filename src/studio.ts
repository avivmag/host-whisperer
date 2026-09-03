import { openDB } from 'idb';
import { containsSensitiveValue } from './security';
import type { ProviderId, SupportIntegration, SupportPlaybook } from './types';

const DB_NAME = 'host-whisperer-studio';
const STORE_NAME = 'integrations';
const listeners = new Set<() => void>();
const now = () => new Date().toISOString();

let profile: SupportIntegration = {
  id: crypto.randomUUID(),
  appName: 'Big Pink',
  allowedOrigin: window.location.origin,
  provider: 'render',
  resourceRef: '',
  playbook: 'commerce-cart',
  createdAt: now(),
  updatedAt: now(),
  bundlePrepared: false,
};

const dbPromise = typeof indexedDB === 'undefined' ? null : openDB(DB_NAME, 1, {
  upgrade(db) { db.createObjectStore(STORE_NAME, { keyPath: 'id' }); },
});

export const subscribeStudio = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getStudioSnapshot = () => profile;
const emit = () => listeners.forEach((listener) => listener());

export async function hydrateStudio() {
  if (!dbPromise) return;
  const saved = await (await dbPromise).getAll(STORE_NAME) as SupportIntegration[];
  if (saved[0]) profile = saved.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  emit();
}

export async function updateStudioProfile(input: Partial<Pick<SupportIntegration, 'appName' | 'allowedOrigin' | 'provider' | 'resourceRef' | 'playbook'>>) {
  const appName = (input.appName ?? profile.appName).trim();
  if (!appName) throw new Error('Application name is required.');
  const rawOrigin = input.allowedOrigin ?? profile.allowedOrigin;
  const parsed = new URL(rawOrigin);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('The website origin must use HTTP or HTTPS.');
  if (parsed.origin !== parsed.href.replace(/\/$/, '')) throw new Error('Enter an origin without a path, query, or fragment.');
  if (containsSensitiveValue(input.resourceRef)) throw new Error('Do not store credentials in the service reference.');
  profile = { ...profile, ...input, appName, allowedOrigin: parsed.origin, updatedAt: now(), bundlePrepared: false };
  if (dbPromise) await (await dbPromise).put(STORE_NAME, profile);
  emit();
  return profile;
}

export async function replaceStudioProfile(input: { appName: string; allowedOrigin: string; provider?: ProviderId; resourceRef?: string; playbook?: SupportPlaybook }) {
  const previous = profile;
  profile = { id: crypto.randomUUID(), appName: previous.appName, allowedOrigin: previous.allowedOrigin, provider: input.provider ?? 'render', resourceRef: '', playbook: input.playbook ?? 'commerce-cart', createdAt: now(), updatedAt: now(), bundlePrepared: false };
  try { return await updateStudioProfile(input); }
  catch (error) { profile = previous; throw error; }
}

export async function prepareStudioBundle() {
  profile = { ...profile, bundlePrepared: true, updatedAt: now() };
  if (dbPromise) await (await dbPromise).put(STORE_NAME, profile);
  emit();
  return profile;
}

export function generatedBootstrap(value = profile, withImport = false) {
  const publicConfig = { integrationId: value.id, appName: value.appName, allowedOrigin: value.allowedOrigin, providerHint: value.provider };
  return `${withImport ? "import { createHostWhispererRuntime } from './host-whisperer.js';\n\n" : ''}createHostWhispererRuntime({
  ...${JSON.stringify(publicConfig, null, 2)},

  // Wait five seconds after the failure, then offer help beside the error itself.
  revealDelayMs: 5000,
  anchorTo: () => document.querySelector('[data-hw-error]'),

  getContext: () => ({
    route: location.pathname,
    appVersion: window.APP_VERSION,
    lastErrorCode: window.storefront.lastErrorCode(),
    // Add only non-sensitive, customer-safe application state.
  }),

  diagnostics: [
    {
      id: 'checkout_service',
      label: 'Checkout service',
      run: async () => window.storefront.probeCheckout(),
    },
  ],

  actions: [
    {
      id: 'roll_back_checkout_service',
      label: 'Roll back the checkout service',
      description: 'Roll the checkout service back to the last deploy that passed its health checks.',
      effects: [
        'Restores the last deploy that passed health checks',
        'Leaves the customer cart exactly as it is',
        'Does not place an order or read payment details',
      ],
      // \`report\` streams each step of the host conversation into the customer's timeline.
      run: async (report) => window.hostWhisperer.rollbackCheckout(report),
      verify: async () => window.storefront.verifyCheckout(),
    },
  ],
});
`;
}

/** Your host credentials never reach this file. They stay on the Host Whisperer server. */
export async function buildPluginFile(value = profile) {
  try {
    const response = await fetch('/runtime/host-whisperer.js');
    // `npm run dev` answers unknown paths with index.html, so check the body, not just the status.
    const source = response.ok ? await response.text() : '';
    if (source.includes('createHostWhispererRuntime')) return `${source}\n${generatedBootstrap(value, false)}`;
  } catch {
    // The runtime is not reachable at all; fall back to the two-file form.
  }
  return generatedBootstrap(value, true);
}
