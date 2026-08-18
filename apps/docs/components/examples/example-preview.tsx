import type { ReactNode } from "react";
import { Artifacts } from "@/components/examples/artifacts";
import { Base } from "@/components/examples/base";
import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Gemini } from "@/components/examples/gemini";
import { GenUI } from "@/components/examples/genui";
import { Grok } from "@/components/examples/grok";
import { ModalChat } from "@/components/examples/modal";
import { Perplexity } from "@/components/examples/perplexity";
import { DemoIframe } from "@/components/docs/demo-iframe";
import { ArtifactsRuntimeProvider } from "@/contexts/ArtifactsRuntimeProvider";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";

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
