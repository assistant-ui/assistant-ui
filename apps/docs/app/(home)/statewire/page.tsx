import type { Metadata } from "next";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { StatewireSetup } from "@/components/pages/shop/statewire-setup";
import { createOgMetadata } from "@/lib/og";
import { cn } from "@/lib/utils";

const title = "Build shared state with Statewire";
const description =
  "Build multiplayer counters, boards, and workflows with Statewire and Cloudflare Durable Objects.";

export const metadata: Metadata = {
  title,
  description,
  robots: { index: false, follow: true },
  ...createOgMetadata(title, description),
};

const WORKER = `import {
  StatewireDurableObject,
  routeStatewireRequest,
} from "statewire-durable-objects";

type Env = {
  GAME: StatewireDurableObject.Namespace;
  LOBBY: StatewireDurableObject.Namespace;
  ASSETS: Fetcher;
};

export { Lobby } from "./lobby";

export class Game extends StatewireDurableObject<Env>(
  (restored) => GameHost(restored),
) {}

export default {
  fetch: async (request: Request, env: Env) => {
    const response = await routeStatewireRequest(request, env);
    if (response) return response;
    const path = new URL(request.url).pathname;
    if (["/game/", "/lobby/"].some((prefix) => path.startsWith(prefix))) {
      return new Response("Not found", { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};`;

const START = `unzip statewire-tic-tac-toe.zip
cd statewire-tic-tac-toe
npm install
npm run dev`;

const WRANGLER = `{
  "name": "statewire-tic-tac-toe",
  "main": "worker/index.ts",
  "compatibility_date": "2026-08-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": ["/game/*", "/lobby/*"]
  },
  "dev": { "port": 8797 },
  "durable_objects": {
    "bindings": [
      { "name": "GAME", "class_name": "Game" },
      { "name": "LOBBY", "class_name": "Lobby" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["Game"] },
    { "tag": "v2", "new_sqlite_classes": ["Lobby"] }
  ]
}`;

export default function StatewireSetupPage() {
  return (
    <PageFrame pad="sub" className="isolate antialiased">
      <header className="flex flex-col gap-6">
        <h1 className={cn(typePage, "max-w-[35ch]")}>{title}</h1>
        <p className={cn(typeDeck, "max-w-[52ch] text-base sm:text-[15px]")}>
          A sync engine for games, agents, and anything realtime.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a
            href="https://statewire-tic-tac-toe-hackathon-20261003.assistant-ui.workers.dev/"
            className="hover:underline"
          >
            Play tic-tac-toe
          </a>
        </div>
      </header>

      <div className="mt-8 max-w-xl">
        <StatewireSetup />
      </div>

      <details className="border-foreground/10 mt-12 border-t">
        <summary className="focus-visible:ring-ring w-fit cursor-pointer py-6 text-sm underline underline-offset-4 focus-visible:ring-2">
          Manual setup and starter
        </summary>

        <section className="py-10">
          <h2 className={typeSection}>The host owns the state.</h2>
          <dl className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="flex flex-col gap-3">
              <dt className="font-medium">State</dt>
              <dd className="text-muted-foreground text-base sm:text-sm">
                Model your application with JSON state. Clients receive a
                snapshot when they connect and updates as it changes.
              </dd>
            </div>
            <div className="flex flex-col gap-3">
              <dt className="font-medium">Commands</dt>
              <dd className="text-muted-foreground text-base sm:text-sm">
                Expose typed operations from the host. Clients send commands;
                the host validates them and changes the shared state.
              </dd>
            </div>
            <div className="flex flex-col gap-3">
              <dt className="font-medium">Durable Objects</dt>
              <dd className="text-muted-foreground text-base sm:text-sm">
                Each named object owns a room. Its saved snapshot restores the
                state when the object wakes, while WebSockets connect clients.
              </dd>
            </div>
          </dl>
        </section>

        <section
          id="setup"
          className="border-foreground/10 scroll-mt-20 border-t py-10"
        >
          <div className="flex flex-col gap-5">
            <h2 className={typeSection}>Run multiplayer tic-tac-toe.</h2>
            <p className="text-muted-foreground max-w-[56ch] text-base sm:text-sm">
              Start with a React frontend and a Cloudflare worker. The starter
              includes the Statewire packages, the game host, and its Durable
              Object bindings.
            </p>
            <a
              href="/downloads/statewire-tic-tac-toe.zip"
              className="w-fit hover:underline"
            >
              Download the game starter
            </a>
          </div>
          <CodeBlock
            title="Terminal · after downloading the starter"
            copyText={START}
            className="my-0 mt-8"
          >
            <Highlight code={START} language="bash" />
          </CodeBlock>
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <CodeBlock
              title="worker/index.ts · Durable Object mount, abridged"
              copyText={WORKER}
              className="my-0"
            >
              <Highlight code={WORKER} language="ts" />
            </CodeBlock>
            <CodeBlock
              title="wrangler.jsonc"
              copyText={WRANGLER}
              className="my-0"
            >
              <Highlight code={WRANGLER} language="json" />
            </CodeBlock>
          </div>
        </section>

        <section className="border-foreground/10 flex flex-col gap-6 border-t py-10">
          <h2 className={typeSection}>Try it in two browsers.</h2>
          <ol role="list" className="grid gap-8 md:grid-cols-3">
            <li className="flex flex-col gap-3">
              <h3 className="font-medium">Join the same room</h3>
              <p className="text-muted-foreground text-base sm:text-sm">
                Open the app in two tabs. The lobby matches waiting players into
                a shared game. Each move updates the board in both tabs.
              </p>
            </li>
            <li className="flex flex-col gap-3">
              <h3 className="font-medium">Restart the worker</h3>
              <p className="text-muted-foreground text-base sm:text-sm">
                Wait for the snapshot to save, then restart with the same local
                persistence directory. Reconnect to read the saved board.
              </p>
            </li>
            <li className="flex flex-col gap-3">
              <h3 className="font-medium">Deploy to Cloudflare</h3>
              <p className="text-muted-foreground text-base sm:text-sm">
                Sign in with Wrangler and run npm run deploy. The same worker
                serves the app, lobby, and games.
              </p>
            </li>
          </ol>
        </section>
      </details>
    </PageFrame>
  );
}
