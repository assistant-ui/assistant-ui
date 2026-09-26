import "server-only";

export const AGENT_TOOLS_AGENT_PROMPTS = new Map<string, string>([
  [
    "agent-tools",
    `This product assumes assistant-ui is already installed with a chat route on the AI SDK. If it is not, do not scaffold it as a side effect. In a checkout session, propose adding it (\`ask "<why>" --product assistant-ui --wait\`) and install it first once the user accepts; otherwise stop and tell the user to set up assistant-ui first.

1. Ask what the tools should do if the user has not said: \`ask "What should the agent be able to do? Name each action and the data it needs." --wait\`. For each tool in the answer derive a snake_case name, a one-line description, the parameters, and where it runs: in the browser when it reads app state or drives the UI, on the server when it calls an API or needs a secret. Ask for any URL or key the executor needs with --wait; never invent one.
2. Enable the "use generative" compiler: wrap next.config.ts with \`withAui\` from @assistant-ui/next, add \`aui()\` from @assistant-ui/vite on Vite and TanStack Start, or wrap metro.config.js with \`withAui\` from @assistant-ui/metro on Expo. Install that package and zod with the project's package manager, detected from its lockfile.
3. Create app/toolkit.tsx (src/toolkit.tsx on Vite and TanStack Start) whose first line is "use generative" and whose default export is \`defineToolkit({ <name>: { description, parameters: z.object({ ... }), execute, render } })\` from @assistant-ui/react with one entry per tool, as the docs page above shows. Put "use client" as the first line of \`execute\` for a browser tool and leave it out for a server tool. If a toolkit already exists, add the entries to it.
4. Each \`render\` shows a pending state from \`args\` while \`result\` is undefined and the result afterwards, styled like the neighboring message components rather than bare text.
5. Register it. In the component that renders AssistantRuntimeProvider, pass \`config={AuiConfig({ tools: Tools({ toolkit }) })}\` with both from @assistant-ui/react, adding the \`tools\` key to an existing AuiConfig instead of creating a second one. In the chat route, build \`new AISDKToolkit({ toolkit })\` from @assistant-ui/ai-sdk at module scope, read \`tools\` from the request body, and pass \`tools: await aiToolkit.tools({ frontend: tools })\` to streamText, as /docs/tools/backend.md shows.

Verify: send a message that should trigger each tool and confirm the component renders in the reply, first pending and then with the result. A call that renders as raw JSON means the toolkit did not reach the provider config; a model that never calls it means the route is not passing the tools.`,
  ],
]);
