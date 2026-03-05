export type ErrorDoc = {
  title: string;
  description: string;
  sections: {
    heading: string;
    content: string;
  }[];
  fixPrompt: string;
};

export const ERROR_DOCS: Record<string, ErrorDoc> = {
  "store/unstable-selector": {
    title: "Unstable Selector Return Value",
    description:
      "Your useAuiState selector returns a new object reference on every call, causing your component to re-render on every state change — even when the selected values haven't changed.",
    sections: [
      {
        heading: "Why does this happen?",
        content: `When you return a new object literal from a \`useAuiState\` selector, JavaScript creates a fresh object each time. Since React uses reference equality (\`===\`) to determine if state has changed, a new object always triggers a re-render.

\`\`\`typescript
// BAD — creates a new { text, isEditing } object on every call
const { text, isEditing } = useAuiState((s) => ({
  text: s.composer.text,
  isEditing: s.composer.isEditing,
}));
\`\`\``,
      },
      {
        heading: "How to fix it",
        content: `**Option A: Use \`useShallow\`** to wrap your selector. This performs a shallow equality check so the previous object is reused when all its values are unchanged.

\`\`\`typescript
import { useShallow, useAuiState } from "@assistant-ui/react";

const { text, isEditing } = useAuiState(
  useShallow((s) => ({
    text: s.composer.text,
    isEditing: s.composer.isEditing,
  })),
);
\`\`\`

**Option B: Split into multiple \`useAuiState\` calls.** Each call returns a primitive, so reference equality works naturally.

\`\`\`typescript
const text = useAuiState((s) => s.composer.text);
const isEditing = useAuiState((s) => s.composer.isEditing);
\`\`\``,
      },
    ],
    fixPrompt:
      "My useAuiState selector is creating a new object on every render, causing unnecessary re-renders. Fix this by either wrapping the selector with useShallow or splitting it into multiple useAuiState calls.",
  },
  "store/missing-provider": {
    title: "Missing AuiProvider",
    description:
      "A component or hook that depends on assistant-ui state was rendered outside of an <AuiProvider>.",
    sections: [
      {
        heading: "Why does this happen?",
        content:
          "assistant-ui uses React context to share state between components. Hooks like `useAuiState` and `useAuiEvent` require an `<AuiProvider>` ancestor in the component tree.",
      },
      {
        heading: "How to fix it",
        content: `Wrap your component tree with \`<AuiProvider>\`:

\`\`\`typescript
import { AuiProvider, useAui } from "@assistant-ui/react";

function App() {
  const aui = useAui({ /* your scopes */ });
  return (
    <AuiProvider value={aui}>
      <YourComponent />
    </AuiProvider>
  );
}
\`\`\``,
      },
    ],
    fixPrompt:
      "I'm getting a missing AuiProvider error. A component using useAuiState or useAuiEvent is not wrapped in an <AuiProvider>. Help me find where the provider is missing and add it.",
  },
  "store/entire-state-selected": {
    title: "Entire State Selected",
    description:
      "You passed a selector to useAuiState that returns the entire AssistantState object. This is not supported.",
    sections: [
      {
        heading: "Why does this happen?",
        content:
          "The AssistantState object is a lazy proxy — its properties are computed on access. Returning the entire proxy prevents the subscription system from knowing which parts of state your component depends on.",
      },
      {
        heading: "How to fix it",
        content: `Select only the specific values you need:

\`\`\`typescript
// BAD
const state = useAuiState((s) => s);

// GOOD — select specific values
const text = useAuiState((s) => s.composer.text);
\`\`\``,
      },
    ],
    fixPrompt:
      "My useAuiState selector returns the entire state object. I need to select only the specific values I need instead.",
  },
  "runtime/missing-runtime": {
    title: "Missing AssistantRuntimeProvider",
    description:
      "A component or hook that requires an assistant runtime was rendered without an AssistantRuntimeProvider ancestor.",
    sections: [
      {
        heading: "Why does this happen?",
        content:
          "assistant-ui primitives and hooks like `useThreadRuntime()` need a runtime to be available via React context. This runtime is provided by `AssistantRuntimeProvider` (or a runtime-specific hook like `useLocalRuntime`, `useChatRuntime`, etc.).",
      },
      {
        heading: "How to fix it",
        content: `Ensure your component is wrapped in a runtime provider:

\`\`\`typescript
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";

function App() {
  const runtime = useLocalRuntime({ /* your adapter */ });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <YourChatComponent />
    </AssistantRuntimeProvider>
  );
}
\`\`\``,
      },
    ],
    fixPrompt:
      "I'm getting a missing AssistantRuntimeProvider error. A component using assistant-ui primitives is not wrapped in an AssistantRuntimeProvider. Help me set up the runtime correctly.",
  },
  "runtime/tool-not-found": {
    title: "Tool Handler Not Found",
    description:
      "A tool call was received from the AI model, but no matching tool handler is registered.",
    sections: [
      {
        heading: "Why does this happen?",
        content:
          "When the AI model calls a tool, assistant-ui looks for a registered handler. If none is found, the tool call cannot be executed. This usually means you forgot to register the tool or there's a name mismatch.",
      },
      {
        heading: "How to fix it",
        content: `Register a tool handler using \`useAssistantTool\` or \`makeAssistantTool\`:

\`\`\`typescript
import { useAssistantTool } from "@assistant-ui/react";

useAssistantTool({
  toolName: "get_weather",
  execute: async ({ location }) => {
    const data = await fetchWeather(location);
    return data;
  },
});
\`\`\`

Make sure the \`toolName\` matches exactly what the AI model uses.`,
      },
    ],
    fixPrompt:
      "I'm getting a tool-not-found error. The AI model is calling a tool but no handler is registered. Help me register the correct tool handler.",
  },
};
