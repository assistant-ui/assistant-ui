import { agentSetupPrompt } from "@/lib/agent-setup-prompt";

export type StarterKind = "template" | "example";

export const STARTER_FRAMEWORKS = [
  "Next.js",
  "React Router",
  "TanStack Start",
  "Expo",
  "Ink",
  "VS Code",
] as const;

export type StarterFramework = (typeof STARTER_FRAMEWORKS)[number];

export const STARTER_BACKENDS = [
  "AI SDK",
  "LangGraph",
  "AG-UI",
  "Google ADK",
  "Eve",
  "OpenAI SDK",
] as const;

export type StarterBackend = (typeof STARTER_BACKENDS)[number];

export type Starter = {
  name: string;
  label: string;
  description: string;
  kind: StarterKind;
  framework: StarterFramework;
  /** The library or protocol the app talks to its model through, when it has one. */
  backend?: StarterBackend;
  /** A screenshot of the app running, from public/screenshot/examples. */
  image?: string;
};

// The CLI is not a dependency of the docs app, so this list mirrors
// PROJECT_METADATA in packages/cli/src/commands/create.ts.
export const STARTERS: readonly Starter[] = [
  {
    name: "default",
    label: "Default",
    description: "A Next.js chat on the Vercel AI SDK.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "minimal",
    label: "Minimal",
    description: "A bare-bones starting point.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "cloud",
    label: "Cloud",
    description: "Threads saved to Assistant Cloud.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "cloud-clerk",
    label: "Cloud + Clerk",
    description: "Threads saved to Assistant Cloud, with Clerk sign-in.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "cloud-harness",
    label: "Shared cloud chat",
    description:
      "A hosted harness with one conversation shared across browsers.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "langchain",
    label: "LangChain",
    description: "A LangGraph agent through the react-langchain adapter.",
    kind: "template",
    framework: "Next.js",
    backend: "LangGraph",
  },
  {
    name: "mcp",
    label: "MCP",
    description: "MCP tools and an MCP Apps renderer.",
    kind: "template",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "eve",
    label: "Eve",
    description: "An Eve agent in a Next.js app.",
    kind: "template",
    framework: "Next.js",
    backend: "Eve",
  },
  {
    name: "vscode",
    label: "VS Code",
    description: "A VS Code extension with a chat webview.",
    kind: "template",
    framework: "VS Code",
    backend: "AI SDK",
  },
  {
    name: "with-ag-ui",
    label: "AG-UI",
    description: "An agent over the AG-UI protocol.",
    kind: "example",
    framework: "Next.js",
    backend: "AG-UI",
  },
  {
    name: "with-google-adk",
    label: "Google ADK",
    description: "A Google ADK agent.",
    kind: "example",
    framework: "Next.js",
    backend: "Google ADK",
  },
  {
    name: "with-ai-sdk-v7",
    label: "AI SDK v7",
    description: "A chat on version 7 of the Vercel AI SDK.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-eve",
    label: "Eve",
    description: "An Eve agent integration.",
    kind: "example",
    framework: "Next.js",
    backend: "Eve",
  },
  {
    name: "with-artifacts",
    label: "Artifacts",
    description: "Artifact rendering.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
    image: "/screenshot/examples/artifacts.png",
  },
  {
    name: "with-assistant-transport",
    label: "Assistant Transport",
    description: "A backend on the assistant transport protocol.",
    kind: "example",
    framework: "Next.js",
    backend: "LangGraph",
  },
  {
    name: "with-chain-of-thought",
    label: "Chain of Thought",
    description: "Reasoning, tool calls, and source citations.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-cloud",
    label: "Cloud",
    description: "An Assistant Cloud integration.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-custom-thread-list",
    label: "Custom Thread List",
    description: "A thread list with its own UI.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-elevenlabs-conversational",
    label: "ElevenLabs Conversational",
    description: "Realtime voice with ElevenLabs.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-elevenlabs-scribe",
    label: "ElevenLabs Scribe",
    description: "Speech to text with ElevenLabs Scribe.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-livekit",
    label: "LiveKit Voice",
    description: "Realtime voice with LiveKit.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-expo",
    label: "Expo",
    description: "A React Native app on Expo.",
    kind: "example",
    framework: "Expo",
    backend: "AI SDK",
    image: "/screenshot/examples/expo.png",
  },
  {
    name: "with-interactables",
    label: "Interactables",
    description: "Interactive components the model drives.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
    image: "/screenshot/examples/interactables.png",
  },
  {
    name: "with-external-store",
    label: "External Store",
    description: "Messages kept in your own store.",
    kind: "example",
    framework: "Next.js",
  },
  {
    name: "with-ffmpeg",
    label: "FFmpeg",
    description: "File processing with FFmpeg.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-langgraph",
    label: "LangGraph",
    description: "A LangGraph integration.",
    kind: "example",
    framework: "Next.js",
    backend: "LangGraph",
  },
  {
    name: "with-react-hook-form",
    label: "React Hook Form",
    description: "A React Hook Form integration.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
    image: "/screenshot/examples/form-demo.png",
  },
  {
    name: "with-react-ink",
    label: "React Ink",
    description: "A chat in the terminal.",
    kind: "example",
    framework: "Ink",
  },
  {
    name: "with-react-router",
    label: "React Router",
    description: "React Router 7 on Vite.",
    kind: "example",
    framework: "React Router",
    backend: "OpenAI SDK",
  },
  {
    name: "with-tanstack",
    label: "TanStack",
    description: "TanStack Router on Vite.",
    kind: "example",
    framework: "TanStack Start",
    backend: "OpenAI SDK",
  },
  {
    name: "with-resumable-stream",
    label: "Resumable Stream",
    description: "A response that keeps streaming after a reload.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
  },
  {
    name: "with-openui",
    label: "OpenUI",
    description: "Generative UI through OpenUI.",
    kind: "example",
    framework: "Next.js",
    backend: "AI SDK",
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

/** Unique across templates and examples, which share some names. */
export const starterId = ({ name, kind }: Starter): string =>
  `${kind}s/${name}`;

export const starterPrompt = (starter: Starter): string =>
  agentSetupPrompt([], `Start from the \`${starter.name}\` ${starter.kind}`);
