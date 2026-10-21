import { STATEWIRE_AGENT_PROMPTS } from "@/lib/catalog/products/statewire.agent";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

const markdown = `# Build shared application state with Statewire

Statewire replicates server-owned state to connected clients and exposes typed commands that change it. Cloudflare Durable Objects provide one host per named room and save its snapshots. This setup works independently of assistant-ui chat components or Assistant Cloud.

## Installable source starter

Download ${BASE_URL}/downloads/statewire-tic-tac-toe.zip. It contains a React frontend, a Worker, SQLite Durable Object bindings, a multiplayer game and a Statewire matchmaking lobby. Use it as verified source material for the application the user asks to build.

The vendor archives contain Statewire 0.19.3 and statewire-durable-objects 0.2.0 from official repository revision 3d3a180f0400b84267f62969d42f8b102bed4479. The adapter is not currently a published npm package. vendor/provenance.json records the source revision, SHA-256 hashes, and required tap/statewire peer normalizations; MIT licenses are included. Install both archives together with one @assistant-ui/tap runtime.

Requires Node.js 22.12 or newer and npm. To run the starter after choosing its directory:

\`\`\`sh
curl -fL ${BASE_URL}/downloads/statewire-tic-tac-toe.zip -o statewire-tic-tac-toe.zip
unzip statewire-tic-tac-toe.zip
cd statewire-tic-tac-toe
npm ci
npm run dev
\`\`\`

Open http://localhost:8797/ in two tabs. The lobby matches visitors into a shared game. An explicit \`?room=<name>\` URL joins that room directly. The Worker serves frontend assets and the Statewire routes.

## Adapt to the user's application

Keep the user's existing framework and package manager. Copy the vendor archives into the chosen project before installing them so dependency paths survive cleanup of the temporary starter. Adapt worker/index.ts, worker/lobby.ts, src/game.ts and src/App.tsx to the build brief; preserve existing application code and Wrangler migration history.

The host is a tap resource. useStatewireState initializes state from the saved snapshot; useStatewireCommands defines server-validated operations. getStateHost supplies snapshot and subscribe to the Durable Objects adapter. Mount it with StatewireDurableObject, export the class named by the binding, and use routeStatewireRequest for \`/<binding>/<instance-name>\` routing, including \`/game/<roomId>\` and \`/lobby/<lobbyId>\` in the starter. Add a SQLite migration for each new Durable Object class.

In React, useStatewire with StatewireWebsocket reads replicated state and sends commands. Keep the host as the source of truth. A separate named room gets separate state. Add trusted authorization for private data; the starter's browser-generated player IDs are demo identifiers, not authentication.

## Persistence and deployment

Start Wrangler with a stable local persistence directory. Wait at least two seconds after a write before a restart check. The adapter saves on a one-second debounce and flushes on connection close; abrupt termination before a pending save can lose recent changes. Local storage is separate from deployed Cloudflare storage.

Run npm run build and wrangler deploy --dry-run before deployment. Choose the Cloudflare account and a unique Worker name with the user. The starter deploy command builds the frontend and Worker together; Wrangler handles the SQLite migrations. Do not replace another Worker or invent an account ID.

## Coding-agent instructions

${STATEWIRE_AGENT_PROMPTS.get("statewire")}
`;

export function GET() {
  return createMarkdownResponse(markdown);
}
