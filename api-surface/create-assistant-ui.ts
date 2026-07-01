type CliSurfaceSnapshot = Record<string, unknown>;

export const cliSurface: CliSurfaceSnapshot = {
  "name": "create-assistant-ui",
  "description": "create assistant-ui apps with one command",
  "forwardsTo": "assistant-ui create",
  "arguments": [
    {
      "syntax": "[project-directory]",
      "description": "",
      "required": false
    }
  ],
  "options": [
    {
      "flags": "-t, --template <template>",
      "description": "template to use (default, minimal, cloud, cloud-clerk, langchain, mcp, eve)",
      "required": true
    },
    {
      "flags": "-e, --example <example>",
      "description": "create from an example (with-ag-ui, with-google-adk, with-ai-sdk-v7, with-eve, with-artifacts, with-assistant-transport, with-chain-of-thought, with-cloud, with-custom-thread-list, with-elevenlabs-conversational, with-elevenlabs-scribe, with-livekit, with-expo, with-interactables, with-external-store, with-ffmpeg, with-langgraph, with-react-hook-form, with-react-ink, with-react-router, with-tanstack)",
      "required": true
    },
    {
      "flags": "-p, --preset <name-or-url>",
      "description": "preset name or URL (e.g., chatgpt or https://www.assistant-ui.com/playground/init?preset=chatgpt)",
      "required": true
    },
    {
      "flags": "--use-npm",
      "description": "explicitly use npm"
    },
    {
      "flags": "--use-pnpm",
      "description": "explicitly use pnpm"
    },
    {
      "flags": "--use-yarn",
      "description": "explicitly use yarn"
    },
    {
      "flags": "--use-bun",
      "description": "explicitly use bun"
    },
    {
      "flags": "--native",
      "description": "create an Expo / React Native project"
    },
    {
      "flags": "--ink",
      "description": "create a React Ink terminal project"
    },
    {
      "flags": "--skip-install",
      "description": "skip installing packages"
    },
    {
      "flags": "--skills",
      "description": "add assistant-ui agent skills for AI coding assistants"
    },
    {
      "flags": "--no-skills",
      "description": "skip adding assistant-ui agent skills"
    },
    {
      "flags": "--debug-source-root <path>",
      "description": "copy templates/examples from a local assistant-ui repo root",
      "required": true,
      "hidden": true
    }
  ]
};
