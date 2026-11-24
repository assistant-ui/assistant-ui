# Agents

An agent builder in one thread, built from assistant-ui primitives: templates that open in a dialog, a message box that makes an agent from a description, and the agent drawn as a card in the chat.

## Files

| Concern | Where it lives |
|---|---|
| Runtime, templates, messages, message box | `components/agents.tsx` |
| The agent card, and the line a tool call leaves in the chat | `components/agent.tsx` |
| A template's dialog: its settings, its config in four forms, cancel and use | `components/template.tsx` |
| The open agent | `components/store.ts` |
| The agent as the API takes it, written as YAML, TypeScript, Python and curl | `components/config.ts` |
| Icon, tooltip and menu parts | `components/ui.tsx` |
| The tools the model calls | `toolkit.tsx` |
| The chat route | `api/chat/route.ts` |
| Templates, and the models, connectors, tools and skills to pick from | `data.json` |
| Theme | `block.css` |

## Run it

Wrap your Next.js config with `withAui` from `@assistant-ui/next`, which compiles `toolkit.tsx`. Copy `.env.example` to `.env.local` beside your app's `package.json`, set `OPENAI_API_KEY`, and set `BLOCKS_LIVE_API` to `true`. Without the flag the route answers 404, and without a key it answers 401.

Put your own sign-in and rate limit in front of the route before you deploy it.

## How an agent is made

- A template opens in a dialog that shows its model, connectors, tools, skills and schedule, and its config. Use this template opens it as it is, with no model call.
- The message box talks to the chat route. With every message the model is told the open agent as JSON.
- The model calls `create_agent` or `update_agent`. Each runs in the browser and changes the store. The card is drawn while the arguments stream in, and stays under the newest tool call; older calls keep one line.
- The dialog and the card's Copy config menu write the agent as a Claude Managed Agents create call in YAML, TypeScript, Python or curl. The block does not create or run the agent.
- A schedule is shown but is not part of that call: on Managed Agents it is a scheduled deployment, made separately with the agent's id and an environment.

## What is not kept

The agent and the chat live in memory and are gone on reload. Save the agent from `components/store.ts` to keep it.

## Change what can be picked

`data.json` lists the models, connectors, tools and skills. The tool schemas and the model's instructions are built from those lists, so a new entry there is all a new choice needs. `builder` names the model that writes the agents, which is separate from the model an agent runs on.
