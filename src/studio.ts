import { openDB } from 'idb';
import { containsSensitiveValue } from './security';
import type { ProviderId, SupportIntegration, SupportPlaybook } from './types';

const DB_NAME = 'host-whisperer-studio';
const STORE_NAME = 'integrations';
const listeners = new Set<() => void>();
const now = () => new Date().toISOString();

let profile: SupportIntegration = {
  id: crypto.randomUUID(),
  appName: 'Northstar Shop',
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

export function generatedAdapter(value = profile) {
  const publicConfig = { integrationId: value.id, appName: value.appName, allowedOrigin: value.allowedOrigin, providerHint: value.provider };
  return `import { createHostWhispererRuntime } from './host-whisperer.js';

createHostWhispererRuntime({
  ...${JSON.stringify(publicConfig, null, 2)},
  getContext: () => ({
    route: location.pathname,
    appVersion: window.APP_VERSION,
    cartItemCount: window.storefront.cart.itemCount(),
    cartSchemaVersion: window.storefront.cart.schemaVersion(),
    // Add only non-sensitive, customer-safe application state.
  }),
  diagnostics: [
    {
      id: 'cart_session',
      label: 'Cart session compatibility',
      run: async () => window.storefront.cart.diagnose(),
    },
  ],
  actions: [
    {
      id: 'rebuild_cart_session',
      label: 'Rebuild cart session',
      description: 'Create a current cart and restore the same items.',
      effects: ['Preserves item IDs and quantities', 'Does not place an order or access payment data'],
      run: async () => window.storefront.cart.rebuild(),
      verify: async () => window.storefront.cart.verifyCheckout(),
    },
  ],
});
`;
}
