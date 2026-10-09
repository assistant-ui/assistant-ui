import type { ReactNode } from "react";
import { Artifacts } from "@/components/pages/examples/artifacts";
import { Base } from "@/components/pages/examples/base";
import { ChatGPT } from "@/components/pages/examples/chatgpt";
import { Claude } from "@/components/pages/examples/claude";
import { Gemini } from "@/components/pages/examples/gemini";
import { GenUI } from "@/components/pages/examples/genui";
import { Grok } from "@/components/pages/examples/grok";
import { ModalChat } from "@/components/pages/examples/modal";
import { Perplexity } from "@/components/pages/examples/perplexity";
import { DemoIframe } from "@/components/pages/docs/demo-iframe";
import { ArtifactsRuntimeProvider } from "@/runtimes/artifacts";
import { DocsRuntimeProvider } from "@/runtimes/docs";

function ThreadPreview({ children }: { children: ReactNode }) {
  return <DocsRuntimeProvider>{children}</DocsRuntimeProvider>;
}

export function hasExamplePreview(slug: string): boolean {
  switch (slug) {
    case "modal":
    case "form-demo":
    case "chatgpt":
    case "claude":
    case "gemini":
    case "grok":
    case "perplexity":
    case "ai-sdk":
    case "mem0":
    case "stockbroker":
    case "artifacts":
    case "generative-ui":
      return true;
    default:
      return false;
  }
}

export function ExamplePreview({ slug }: { slug: string }): ReactNode {
  switch (slug) {
    case "modal":
      return (
        <ThreadPreview>
          <ModalChat />
        </ThreadPreview>
      );
    case "form-demo":
      return (
        <DemoIframe
          title="Form Filling Co-Pilot demo"
          className="h-full w-full border-none"
          src="https://assistant-ui-form-demo.vercel.app/"
        />
      );
    case "chatgpt":
      return (
        <ThreadPreview>
          <ChatGPT />
        </ThreadPreview>
      );
    case "claude":
      return (
        <ThreadPreview>
          <Claude />
        </ThreadPreview>
      );
    case "gemini":
      return (
        <ThreadPreview>
          <Gemini />
        </ThreadPreview>
      );
    case "grok":
      return (
        <ThreadPreview>
          <Grok />
        </ThreadPreview>
      );
    case "perplexity":
      return (
        <ThreadPreview>
          <Perplexity />
        </ThreadPreview>
      );
    case "ai-sdk":
      return (
        <ThreadPreview>
          <Base />
        </ThreadPreview>
      );
    case "mem0":
      return (
        <DemoIframe
          title="Mem0 - ChatGPT with memory demo"
          className="h-full w-full border-none"
          src="https://mem0-4vmi.vercel.app/"
        />
      );
    case "stockbroker":
      return (
        <DemoIframe
          title="Stockbroker example"
          className="h-full w-full border-none"
          src="https://assistant-ui-stockbroker.vercel.app/"
        />
      );
    case "artifacts":
      return (
        <ArtifactsRuntimeProvider>
          <Artifacts />
        </ArtifactsRuntimeProvider>
      );
    case "generative-ui":
      return <GenUI />;
    default:
      return null;
  }
}
