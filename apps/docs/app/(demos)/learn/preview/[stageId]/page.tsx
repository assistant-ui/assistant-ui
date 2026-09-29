import { notFound } from "next/navigation";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import {
  DEFAULT_LEARN_COURSE_ID,
  listLearnStageIds,
} from "@/lib/xulux/learn/registry";
import { getLearnPreview } from "@/lib/xulux/learn/preview-registry";
import { PublicAssistantSessionBoundary } from "@/components/xulux/learn/PublicAssistantSessionBoundary";

// Each preview needs its own server-side usage-budget session.
export const dynamic = "force-dynamic";

// The docs stylesheet sets `overflow-y: scroll` on html for gutter stability; inside the preview iframe that reserves a permanent scrollbar strip along the right edge wherever the platform draws classic scrollbars.
const PreviewShell = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-background h-dvh overflow-hidden">
    <style>{`html { overflow: hidden; }`}</style>
    {children}
  </div>
);

export function generateStaticParams() {
  return listLearnStageIds(DEFAULT_LEARN_COURSE_ID).map((stageId) => ({
    stageId,
  }));
}

export default async function LearnStagePreviewPage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  if (!isAiPlaygroundEnabled) notFound();

  const { stageId } = await params;
  let previewDefinition;
  try {
    previewDefinition = getLearnPreview(stageId);
  } catch {
    notFound();
  }

  const { default: StagePage } = await previewDefinition.loadPage();
  const preview = <StagePage />;

  if (!previewDefinition.loadRuntime) {
    return <PreviewShell>{preview}</PreviewShell>;
  }

  const { RuntimeProvider } = await previewDefinition.loadRuntime();
  const previewSessionId = crypto.randomUUID();

  return (
    <PreviewShell>
      <PublicAssistantSessionBoundary>
        <RuntimeProvider
          api={`/api/xulux/learn/preview/${stageId}/chat?sessionId=${previewSessionId}`}
          storagePrefix={`generative-ui-course:${stageId}:`}
        >
          {preview}
        </RuntimeProvider>
      </PublicAssistantSessionBoundary>
    </PreviewShell>
  );
}
