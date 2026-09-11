import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";
import { highlightElementSource } from "@/lib/element-source";

const PROVIDER_SNIPPET = `import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";

export default function App() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* your components */}
    </AssistantRuntimeProvider>
  );
}`;

export async function RuntimeSetup() {
  const highlighted = await highlightElementSource(PROVIDER_SNIPPET);

  return (
    <details className="border-foreground/10 group mt-4 rounded-lg border">
      <summary className="text-muted-foreground hover:text-foreground cursor-pointer px-4 py-2.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors select-none">
        First time? Set up a runtime
      </summary>
      <div className="border-foreground/10 space-y-4 border-t px-4 py-4 text-sm">
        <p className="text-muted-foreground">
          Runtime components read their state from an assistant-ui runtime. Add
          one to an existing project:
        </p>
        <CodeBlock copyText="npx assistant-ui@latest init">
          <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed">
            <code>npx assistant-ui@latest init</code>
          </pre>
        </CodeBlock>
        <p className="text-muted-foreground">
          Then wrap your app in a runtime provider:
        </p>
        <CodeBlock copyText={PROVIDER_SNIPPET} viewportClassName="max-h-72">
          <div dangerouslySetInnerHTML={{ __html: highlighted }} />
        </CodeBlock>
        <p className="text-muted-foreground">
          The{" "}
          <Link
            href="/docs/installation"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            installation guide
          </Link>{" "}
          covers new projects, templates, and API routes.
        </p>
      </div>
    </details>
  );
}
