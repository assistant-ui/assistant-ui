import { HARNESS_SDK_AGENT_PROMPTS } from "@/lib/catalog/products/harness-sdk.agent";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

const markdown = `# Build a shared AI chat with harness-sdk

harness-sdk is an alpha runtime for an AI conversation shared across browser clients. assistant-ui renders the chat UI, Assistant Cloud hosts the shared thread, and the application's AI SDK server route supplies the model and tools.

## Verified CLI preview

The installable preview is ${BASE_URL}/downloads/assistant-ui-cloud-harness-b9d8b56ad.tgz. Its CLI executable and bundled starter install have been checked. The assistant-ui-cli public OAuth client is registered. Real device sign-in and production provisioning have passed; hosted shared-chat verification is still in progress. Report authorization failures accurately instead of inventing a successful Cloud setup.

After choosing a new application directory, the npm setup command is:

\`\`\`sh
npx --package=${BASE_URL}/downloads/assistant-ui-cloud-harness-b9d8b56ad.tgz \\
  assistant-ui cloud setup shared-chat \\
  --use-npm --access-code MULTIPLAYER-2026
cd shared-chat
npm run dev
\`\`\`

The cloud setup command opens device authorization, selects or creates an organization/project, provisions a harness, and writes configuration into a new Next.js cloud-harness scaffold when authorization is available. Use --no-open in a non-interactive agent shell and have the user open the printed sign-in URL. Add the model provider key through the user's existing secret workflow before running the AI route; the starter expects OPENAI_API_KEY in .env.local.

The event code grants one harness to the redeemed project. It does not change the global free plan; redemption ends at midnight Pacific after October 3, 2026. The CLI saves provisioning metadata and supports resuming the same directory.

## Preserve the chosen project

The CLI creates a new app and refuses to overwrite an existing one. Ask which directory the user wants before scaffolding. For an existing project, use an agreed temporary scaffold as a source and integrate the runtime, credential endpoint and AI route into that chosen project. Preserve its framework, package manager, chat components, authentication, environment entries and routes.

The preview bundles official-source harness-sdk 0.3.1, @assistant-ui/react-harness-sdk 0.0.2 and Statewire 0.19.3 archives at source revision 3d3a180f0400b84267f62969d42f8b102bed4479. templates/cloud-harness/vendor/provenance.json records the hashes and required-peer normalizations. Keep one shared core/store/tap runtime and retain the vendor archives. These packages are supplied with the preview rather than an assumed npm release.

## Runtime and credentials

Use HarnessCloudThreadList from @assistant-ui/react-harness-sdk with AuiConfig/AuiProvider from @assistant-ui/react. Configure url as the canonical /api/chat route, origin as NEXT_PUBLIC_ASSISTANT_HARNESS_URL, workspaceId as NEXT_PUBLIC_ASSISTANT_WORKSPACE_ID, a server-minted credential callback, and a stable shared thread ID. The starter shares the thread ID in its URL hash.

ASSISTANT_API_KEY remains server-only. /api/credential constructs AssistantCloud with that API key, NEXT_PUBLIC_ASSISTANT_BASE_URL, the configured workspace and authenticated user identity, then calls cloud.auth.tokens.create and returns a no-store token response. The starter's userId "hackathon" is a public-demo identity, not private user authentication. Provider keys also remain on the server.

The local harness permits localhost. Before deployment, allow the exact HTTPS URL of the application's real /api/chat route in the harness backend allowlist. For a new harness pass that URL with --backend-url; for an existing harness update its dashboard settings and saved backendUrl consistently. Preserve existing allowlist entries and do not fabricate a working URL.

## Verify

Build and typecheck the user's requested application. In two independent browser clients, open the same shared-thread URL, send from each, and confirm both see the same user messages and streamed assistant reply. Reload to check retained history. Check the user's tools and credential scope. Report any authorization or provisioning failure separately from local code verification.

## Coding-agent instructions

${HARNESS_SDK_AGENT_PROMPTS.get("harness-sdk")}
`;

export function GET() {
  return createMarkdownResponse(markdown);
}
