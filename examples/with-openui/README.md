# OpenUI Example

This example renders streaming [OpenUI Lang](https://www.openui.com) interfaces inside an assistant-ui conversation using [`@openuidev/assistant-ui`](https://www.npmjs.com/package/@openuidev/assistant-ui), the integration package published and maintained by OpenUI.

assistant-ui owns the chat shell, runtime, messages, streaming, and tool lifecycle. OpenUI renders the `ui` argument of two tool calls: `present_openui` for display-only interfaces and `prompt_openui` for forms and choices that wait for the user to submit.

## Quick Start

### Clone the example

```bash
git clone https://github.com/assistant-ui/assistant-ui.git
cd assistant-ui
pnpm install
```

The example runs inside the monorepo with pnpm.

### Environment Variables

Create `examples/with-openui/.env.local`:

```sh
OPENAI_API_KEY=your-api-key-here
```

### Run

Build the workspace packages the example imports, then start the dev server:

```bash
pnpm exec turbo build --filter='with-openui^...'
pnpm -C examples/with-openui dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Key Features

- Registers `openuiIntegration.toolkit` so the model can call `present_openui` and `prompt_openui`
- Mounts `OpenUIInstructions` so the model learns the OpenUI component vocabulary through assistant instructions
- Uses `sendAutomaticallyWhen: shouldContinueAfterOpenUIPrompt` so a display-only call ends the turn while an interactive submission continues the conversation
- Forwards the instructions and both frontend tools to the backend through `AssistantChatTransport`, so the API route stays generic
- Loads the OpenUI layered stylesheet once in `app/globals.css`

## How it works

- `app/page.tsx` wires the runtime, toolkit, instructions, and suggestions
- `app/api/chat/route.ts` streams with the AI SDK and exposes the forwarded frontend tools with `frontendTools`
- Submitted form state is returned through `addResult` and hydrates again on replay

## Related Documentation

- [assistant-ui OpenUI guide](https://www.assistant-ui.com/docs/tools/openui)
- [OpenUI assistant-ui integration reference](https://www.openui.com/docs/api-reference/assistant-ui)
