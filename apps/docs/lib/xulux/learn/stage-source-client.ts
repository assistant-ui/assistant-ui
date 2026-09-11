import type { LearnStageFiles } from "./stage-source";

export async function fetchLearnStageFiles(
  courseId: string,
  stageId: string,
  signal: AbortSignal,
): Promise<LearnStageFiles> {
  const params = new URLSearchParams({ courseId, stageId });
  const response = await fetch(`/api/xulux/learn/source?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Source request failed (${response.status})`);
  }

  const payload = (await response.json()) as { files?: unknown };
  if (!payload.files || typeof payload.files !== "object") {
    throw new Error("Source response was invalid.");
  }
  return payload.files as LearnStageFiles;
}
