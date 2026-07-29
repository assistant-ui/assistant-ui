import Image from "next/image";
import { Artifacts } from "@/components/examples/artifacts";
import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Gemini } from "@/components/examples/gemini";
import { GenUI } from "@/components/examples/genui";
import { Grok } from "@/components/examples/grok";
import { ModalChat } from "@/components/examples/modal";
import { Perplexity } from "@/components/examples/perplexity";
import { Base } from "@/components/examples/base";
import { ArtifactsRuntimeProvider } from "@/contexts/ArtifactsRuntimeProvider";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";

type PreviewData = {
  slug: string;
  title: string;
  description?: string | undefined;
  screenshotUrl: string;
  hasComponentPreview: boolean;
};

export function ExamplePreview({ preview }: { preview: PreviewData }) {
  return (
    <main className="bg-background text-foreground h-screen w-screen overflow-hidden">
      {renderPreview(preview)}
    </main>
  );
}

function renderPreview(preview: PreviewData) {
  switch (preview.slug) {
    case "ai-sdk":
      return (
        <DocsRuntimeProvider>
          <Base />
        </DocsRuntimeProvider>
      );
    case "artifacts":
      return (
        <ArtifactsRuntimeProvider>
          <Artifacts />
        </ArtifactsRuntimeProvider>
      );
    case "chatgpt":
      return (
        <DocsRuntimeProvider>
          <ChatGPT />
        </DocsRuntimeProvider>
      );
    case "claude":
      return (
        <DocsRuntimeProvider>
          <Claude />
        </DocsRuntimeProvider>
      );
    case "gemini":
      return (
        <DocsRuntimeProvider>
          <Gemini />
        </DocsRuntimeProvider>
      );
    case "generative-ui":
      return <GenUI />;
    case "grok":
      return (
        <DocsRuntimeProvider>
          <Grok />
        </DocsRuntimeProvider>
      );
    case "modal":
      return (
        <DocsRuntimeProvider>
          <ModalChat />
        </DocsRuntimeProvider>
      );
    case "perplexity":
      return (
        <DocsRuntimeProvider>
          <Perplexity />
        </DocsRuntimeProvider>
      );
    default:
      return <ScreenshotPreview preview={preview} />;
  }
}

function ScreenshotPreview({ preview }: { preview: PreviewData }) {
  return (
    <div className="bg-muted/30 flex h-full w-full flex-col">
      <div className="bg-background flex h-10 shrink-0 items-center justify-between border-b px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{preview.title}</p>
          <p className="text-muted-foreground truncate text-[11px]">
            Screenshot preview
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        <div className="bg-background relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg border shadow-sm">
          <Image
            src={preview.screenshotUrl}
            alt={preview.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
