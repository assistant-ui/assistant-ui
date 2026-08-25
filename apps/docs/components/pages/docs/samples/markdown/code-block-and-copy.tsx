"use client";

import { TextMessagePartProvider } from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function MarkdownWithCode() {
  const codeMarkdown = `Wrap \`useLocalRuntime\` in a hook, then call the hook from your provider component.

\`\`\`typescript
function useExampleRuntime() {
  return useLocalRuntime({
    async run({ messages }) {
      const reply = \`Received \${messages.length} messages.\`;
      return { content: [{ type: "text", text: reply }] };
    },
  });
}
\`\`\``;

  return (
    <TextMessagePartProvider text={codeMarkdown}>
      <MarkdownText />
    </TextMessagePartProvider>
  );
}

export function MarkdownCodeBlockSample() {
  return (
    <SampleFrame className="h-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <MarkdownWithCode />
      </div>
    </SampleFrame>
  );
}
