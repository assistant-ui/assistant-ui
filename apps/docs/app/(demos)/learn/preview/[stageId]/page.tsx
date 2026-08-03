import { notFound } from "next/navigation";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import {
  DEFAULT_LEARN_COURSE_ID,
  listLearnStageIds,
} from "@/lib/xulux/learn/registry";
import { getLearnPreview } from "@/lib/xulux/learn/preview-registry";

// Each preview needs its own server-side usage-budget session.
export const dynamic = "force-dynamic";

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
    return <div className="bg-background h-dvh overflow-hidden">{preview}</div>;
  }

  const { RuntimeProvider } = await previewDefinition.loadRuntime();
  const previewSessionId = crypto.randomUUID();

  return (
    <div className="bg-background h-dvh overflow-hidden">
      <RuntimeProvider
        api={`/api/xulux/learn/preview/${stageId}/chat?sessionId=${previewSessionId}`}
        storagePrefix={`generative-ui-course:${stageId}:`}
      >
        {preview}
      </RuntimeProvider>
    </div>
  );
}
