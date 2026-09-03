import type { ProviderId, ProviderRecipe } from './types';

const checkedAt = '2026-09-03';

export const recipes: ProviderRecipe[] = [
  {
    id: 'aws-lambda-api', provider: 'aws', providerName: 'AWS', name: 'Lambda API',
    description: 'A small Node.js API on Lambda behind API Gateway.', runtime: 'Node.js 22', capability: 'handoff-ready',
    mcpUrl: 'https://aws-mcp.us-east-1.api.aws/mcp', docsUrl: 'https://docs.aws.amazon.com/agent-toolkit/latest/userguide/mcp-server.html',
    artifacts: ['template.yaml', 'src/handler.ts', 'package.json'], commands: ['sam build', 'sam deploy --guided'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'Usage-based; a small project may fit AWS free-tier allowances.', assumptions: ['Low request volume', 'No provisioned concurrency', 'Logs retained briefly'], sourceUrl: 'https://aws.amazon.com/lambda/pricing/', checkedAt },
    handoffNotes: ['Use the managed AWS MCP with explicit region and account context.', 'Require confirmation before any create or update call.'],
  },
  {
    id: 'gcp-cloud-run', provider: 'gcp', providerName: 'Google Cloud', name: 'Cloud Run Service',
    description: 'A containerized HTTP service that scales to zero.', runtime: 'Node.js 22 container', capability: 'handoff-ready',
    mcpUrl: 'https://run.googleapis.com/mcp', docsUrl: 'https://docs.cloud.google.com/run/docs/use-cloud-run-mcp',
    artifacts: ['Dockerfile', 'src/server.ts', 'package.json'], commands: ['gcloud run deploy --source .'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'Usage-based with a documented free tier for modest workloads.', assumptions: ['Scale-to-zero enabled', 'Low outbound traffic', 'Single region'], sourceUrl: 'https://cloud.google.com/run/pricing', checkedAt },
    handoffNotes: ['Enable the Cloud Run Admin API before connecting its remote MCP.', 'Keep project and region explicit in every handoff.'],
  },
  {
    id: 'cloudflare-worker', provider: 'cloudflare', providerName: 'Cloudflare', name: 'Worker + Assets',
    description: 'An edge Worker serving a small app and API.', runtime: 'Workers runtime', capability: 'handoff-ready',
    mcpUrl: 'https://builds.mcp.cloudflare.com/mcp', docsUrl: 'https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/',
    artifacts: ['wrangler.jsonc', 'src/index.ts', 'public/index.html'], commands: ['npx wrangler deploy'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'A small Worker can often run within the free plan.', assumptions: ['Low daily requests', 'No paid bindings', 'Minimal CPU time'], sourceUrl: 'https://developers.cloudflare.com/workers/platform/pricing/', checkedAt },
    handoffNotes: ['Use the Workers Builds MCP for builds and the Observability MCP for logs.', 'Treat tool output from deployed applications as untrusted.'],
  },
  {
    id: 'vercel-next', provider: 'vercel', providerName: 'Vercel', name: 'Next.js App',
    description: 'A Next.js frontend with optional server functions.', runtime: 'Next.js', capability: 'handoff-ready',
    mcpUrl: 'https://mcp.vercel.com', docsUrl: 'https://vercel.com/docs/agent-resources/vercel-mcp',
    artifacts: ['next.config.ts', 'app/page.tsx', 'package.json'], commands: ['npx vercel deploy'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'Personal experiments may fit the Hobby plan; commercial use can require a paid plan.', assumptions: ['Low traffic', 'Limited function execution', 'No paid add-ons'], sourceUrl: 'https://vercel.com/pricing', checkedAt },
    handoffNotes: ['Connect Vercel MCP with OAuth.', 'The deploy tool may require a repository or local project context.'],
  },
  {
    id: 'netlify-web', provider: 'netlify', providerName: 'Netlify', name: 'Web App + Function',
    description: 'A static frontend with one serverless function.', runtime: 'Vite + Netlify Functions', capability: 'handoff-ready',
    mcpUrl: 'https://netlify-mcp.netlify.app/mcp', docsUrl: 'https://docs.netlify.com/start/choose-your-path/',
    artifacts: ['netlify.toml', 'src/App.tsx', 'netlify/functions/health.ts'], commands: ['npx netlify deploy --prod'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'Small personal projects can begin on the free plan.', assumptions: ['Low bandwidth', 'Few function invocations', 'No team add-ons'], sourceUrl: 'https://www.netlify.com/pricing/', checkedAt },
    handoffNotes: ['Connect the official Netlify MCP with OAuth.', 'Confirm production deploys separately from previews.'],
  },
  {
    id: 'render-static', provider: 'render', providerName: 'Render', name: 'Static Site',
    description: 'A generated static project deployed from a Git repository.', runtime: 'Vite static site', capability: 'live-tested',
    mcpUrl: 'https://mcp.render.com/mcp', docsUrl: 'https://render.com/docs/mcp-server',
    artifacts: ['render.yaml', 'src/App.tsx', 'package.json'], commands: ['npm run build'],
    supportedOperations: ['create', 'inspect', 'fetch_logs', 'update_config', 'redeploy', 'health_check'],
    cost: { summary: 'Static sites can start without compute charges; usage limits still apply.', assumptions: ['Static assets only', 'Default domain', 'Low bandwidth'], sourceUrl: 'https://render.com/pricing', checkedAt },
    handoffNotes: ['Use create_static_site with an explicit workspace ID.', 'The demo intentionally omits PUBLIC_SITE_TITLE on the first deploy.'],
  },
  {
    id: 'shopify-hydrogen', provider: 'shopify', providerName: 'Shopify', name: 'Hydrogen Storefront',
    description: 'A custom Hydrogen storefront connected to Shopify commerce.', runtime: 'Hydrogen / Oxygen', capability: 'manual',
    docsUrl: 'https://shopify.dev/docs/storefronts/headless/hydrogen',
    artifacts: ['shopify.app.toml', 'app/root.tsx', 'package.json'], commands: ['npm create @shopify/hydrogen@latest', 'npx shopify hydrogen deploy'],
    supportedOperations: ['create', 'inspect', 'redeploy', 'health_check'],
    cost: { summary: 'Hosting and commerce costs depend on the selected Shopify plan and usage.', assumptions: ['Existing development store', 'Default Oxygen deployment', 'No paid third-party apps'], sourceUrl: 'https://www.shopify.com/pricing', checkedAt },
    handoffNotes: ['Shopify Storefront MCP serves commerce operations, not app deployment.', 'Use Shopify CLI or dashboard for deployment and secrets.'],
  },
];

export const getRecipe = (id: string) => recipes.find((recipe) => recipe.id === id);
export const getProviderRecipes = (provider?: ProviderId) => provider ? recipes.filter((recipe) => recipe.provider === provider) : recipes;
