import { notFound } from "next/navigation";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnStage,
  listLearnStageIds,
} from "@/lib/xulux/learn/registry";
import type { LearnStageDefinition } from "@/lib/xulux/learn/types";

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
  let stage: LearnStageDefinition;
  try {
    stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, stageId);
  } catch {
    notFound();
  }

  const { default: StagePage } = await stage.loadPreview();
  const preview = <StagePage />;

  if (!stage.loadPreviewRuntime) {
    return <div className="bg-background h-dvh overflow-hidden">{preview}</div>;
  }

  const { RuntimeProvider } = await stage.loadPreviewRuntime();
  const previewSessionId = crypto.randomUUID();

  return (
    <div className="bg-background h-dvh overflow-hidden">
      <RuntimeProvider
        api={`/api/xulux/learn/preview/${stageId}/chat?sessionId=${previewSessionId}`}
      >
        {preview}
      </RuntimeProvider>
    </div>
  );
}
