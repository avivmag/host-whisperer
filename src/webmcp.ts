import { compactToolOutput } from './security';
import { getStudioSnapshot, prepareStudioBundle, replaceStudioProfile, updateStudioProfile } from './studio';
import { providers } from './types';

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute: (input: any) => Promise<unknown> | unknown;
};

type ModelContext = { registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): Promise<void> };
let activeController: AbortController | null = null;
const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
const string = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });

export function studioToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: 'create_integration_profile', title: 'Create support integration',
      description: 'Configure the visible Studio for a website that will install Host Whisperer. This does not modify the target website.',
      inputSchema: objectSchema({ appName: string('Public application name.', { minLength: 1, maxLength: 80 }), allowedOrigin: string('Exact HTTP or HTTPS origin where the adapter will run.'), provider: string('Hosting provider used only as context if the customer escalates to a developer.', { enum: providers }) }, ['appName', 'allowedOrigin', 'provider']),
      execute: async (input) => compactToolOutput({ profile: await replaceStudioProfile(input), next: 'Select a support playbook and review its diagnostics and recovery effects.' }),
    },
    {
      name: 'select_support_playbook', title: 'Select support playbook',
      description: 'Select a developer-reviewed support playbook. The commerce cart playbook is the verified demonstration integration.',
      inputSchema: objectSchema({ playbook: string('Support playbook.', { enum: ['commerce-cart'] }) }, ['playbook']),
      execute: async ({ playbook }) => compactToolOutput({ profile: await updateStudioProfile({ playbook }), diagnostics: ['Store health', 'Inventory availability', 'Cart session compatibility'], recovery: 'Rebuild the cart session without placing an order or accessing payment data.' }),
    },
    {
      name: 'configure_recovery_action', title: 'Configure safe recovery',
      description: 'Review the bounded recovery supplied by the selected playbook. Arbitrary scripts and cloud-provider operations are not accepted.',
      inputSchema: objectSchema({ actionId: string('Allowlisted action.', { enum: ['rebuild_cart_session'] }) }, ['actionId']),
      execute: ({ actionId }) => compactToolOutput({ actionId, confirmationRequired: true, effects: ['Create a fresh cart session', 'Restore existing product IDs and quantities'], forbiddenEffects: ['Place an order', 'Read or change payment details', 'Modify cloud infrastructure'] }),
    },
    {
      name: 'prepare_install_bundle', title: 'Prepare adapter bundle',
      description: 'Prepare the visible adapter preview. The developer must click Download in Studio to export files.',
      inputSchema: objectSchema({ confirmOrigin: string('Repeat the exact origin that will be bound into the adapter.') }, ['confirmOrigin']),
      execute: async ({ confirmOrigin }) => {
        const profile = getStudioSnapshot();
        if (confirmOrigin.replace(/\/$/, '') !== profile.allowedOrigin) throw new Error('The confirmed origin does not match the visible Studio profile.');
        return compactToolOutput({ prepared: true, profile: await prepareStudioBundle(), downloaded: false, next: 'Ask the developer to review the code and click the visible download buttons.' });
      },
    },
  ];
}

export async function registerWebMcpTools(): Promise<AbortController | null> {
  const modelContext = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!modelContext) return null;
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  try {
    await Promise.all(studioToolDefinitions().map((tool) => modelContext.registerTool(tool, { signal: controller.signal })));
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  }
  return controller;
}

export function hasWebMcp() {
  return Boolean((document as Document & { modelContext?: ModelContext }).modelContext);
}

export type { ToolDefinition };
