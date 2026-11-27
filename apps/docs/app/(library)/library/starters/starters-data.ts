export type StarterKind = "template" | "example";

export type Starter = {
  name: string;
  label: string;
  description: string;
  kind: StarterKind;
};

// The CLI is not a dependency of the docs app, so this list mirrors
// PROJECT_METADATA in packages/cli/src/commands/create.ts.
export const STARTERS: readonly Starter[] = [
  {
    name: "default",
    label: "Default",
    description: "A Next.js chat on the Vercel AI SDK.",
    kind: "template",
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "A bare-bones starting point.",
    kind: "template",
  },
  {
    name: "cloud",
    label: "Cloud",
    description: "Threads saved to Assistant Cloud.",
    kind: "template",
  },
  {
    name: "cloud-clerk",
    label: "Cloud + Clerk",
    description: "Threads saved to Assistant Cloud, with Clerk sign-in.",
    kind: "template",
  },
  {
    name: "cloud-harness",
    label: "Shared cloud chat",
    description:
      "A hosted harness with one conversation shared across browsers.",
    kind: "template",
  },
  {
    name: "langchain",
    label: "LangChain",
    description: "A LangGraph agent through the react-langchain adapter.",
    kind: "template",
  },
  {
    name: "mcp",
    label: "MCP",
    description: "MCP tools and an MCP Apps renderer.",
    kind: "template",
  },
  {
    name: "eve",
    label: "Eve",
    description: "An Eve agent in a Next.js app.",
    kind: "template",
  },
  {
    name: "vscode",
    label: "VS Code",
    description: "A VS Code extension with a chat webview.",
    kind: "template",
  },
  {
    name: "with-ag-ui",
    label: "AG-UI",
    description: "An agent over the AG-UI protocol.",
    kind: "example",
  },
  {
    name: "with-google-adk",
    label: "Google ADK",
    description: "A Google ADK agent.",
    kind: "example",
  },
  {
    name: "with-ai-sdk-v7",
    label: "AI SDK v7",
    description: "A chat on version 7 of the Vercel AI SDK.",
    kind: "example",
  },
  {
    name: "with-eve",
    label: "Eve",
    description: "An Eve agent integration.",
    kind: "example",
  },
  {
    name: "with-artifacts",
    label: "Artifacts",
    description: "Artifact rendering.",
    kind: "example",
  },
  {
    name: "with-assistant-transport",
    label: "Assistant Transport",
    description: "A backend on the assistant transport protocol.",
    kind: "example",
  },
  {
    name: "with-chain-of-thought",
    label: "Chain of Thought",
    description: "Reasoning, tool calls, and source citations.",
    kind: "example",
  },
  {
    name: "with-cloud",
    label: "Cloud",
    description: "An Assistant Cloud integration.",
    kind: "example",
  },
  {
    name: "with-custom-thread-list",
    label: "Custom Thread List",
    description: "A thread list with its own UI.",
    kind: "example",
  },
  {
    name: "with-elevenlabs-conversational",
    label: "ElevenLabs Conversational",
    description: "Realtime voice with ElevenLabs.",
    kind: "example",
  },
  {
    name: "with-elevenlabs-scribe",
    label: "ElevenLabs Scribe",
    description: "Speech to text with ElevenLabs Scribe.",
    kind: "example",
  },
  {
    name: "with-livekit",
    label: "LiveKit Voice",
    description: "Realtime voice with LiveKit.",
    kind: "example",
  },
  {
    name: "with-expo",
    label: "Expo",
    description: "A React Native app on Expo.",
    kind: "example",
  },
  {
    name: "with-interactables",
    label: "Interactables",
    description: "Interactive components the model drives.",
    kind: "example",
  },
  {
    name: "with-external-store",
    label: "External Store",
    description: "Messages kept in your own store.",
    kind: "example",
  },
  {
    name: "with-ffmpeg",
    label: "FFmpeg",
    description: "File processing with FFmpeg.",
    kind: "example",
  },
  {
    name: "with-langgraph",
    label: "LangGraph",
    description: "A LangGraph integration.",
    kind: "example",
  },
  {
    name: "with-react-hook-form",
    label: "React Hook Form",
    description: "A React Hook Form integration.",
    kind: "example",
  },
  {
    name: "with-react-ink",
    label: "React Ink",
    description: "A chat in the terminal.",
    kind: "example",
  },
  {
    name: "with-react-router",
    label: "React Router",
    description: "React Router 7 on Vite.",
    kind: "example",
  },
  {
    name: "with-tanstack",
    label: "TanStack",
    description: "TanStack Router on Vite.",
    kind: "example",
  },
  {
    name: "with-resumable-stream",
    label: "Resumable Stream",
    description: "A response that keeps streaming after a reload.",
    kind: "example",
  },
  {
    name: "with-openui",
    label: "OpenUI",
    description: "Generative UI through OpenUI.",
    kind: "example",
  },
];

export const TEMPLATES = STARTERS.filter(
  (starter) => starter.kind === "template",
);

export const EXAMPLES = STARTERS.filter(
  (starter) => starter.kind === "example",
);

export const starterCommand = ({ name, kind }: Starter): string => {
  if (kind === "example")
    return `npx assistant-ui@latest create my-app -e ${name}`;
  if (name === "default") return "npx assistant-ui@latest create my-app";
  if (name === "cloud-harness")
    return "npx assistant-ui@latest cloud setup my-app";
  return `npx assistant-ui@latest create my-app -t ${name}`;
};

export const starterSourceHref = ({ name, kind }: Starter): string =>
  `https://github.com/assistant-ui/assistant-ui/tree/main/${kind}s/${name}`;
