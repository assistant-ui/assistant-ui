import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubProjectLayout } from "@/components/shared/sub-project-layout";
import { XuluxApp } from "@/components/xulux/XuluxApp";
import { isAiPlaygroundEnabled } from "@/lib/feature-flags";
import { DEFAULT_LEARN_COURSE_ID } from "@/lib/xulux/learn/registry";
import { createOgMetadata } from "@/lib/og";
import { parseLearnAutoStartSource } from "@/lib/xulux/learn/types";

const title = "Learn assistant-ui";
const description =
  "Build assistant interfaces through a guided course in the Xulux playground.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; source?: string }>;
}) {
  if (!isAiPlaygroundEnabled) notFound();
  const { start, source } = await searchParams;

  return (
    <SubProjectLayout
      name="learn"
      githubPath="https://github.com/assistant-ui/assistant-ui/tree/main/apps/docs/lib/xulux/learn"
      fullHeight
      hideFooter
    >
      <XuluxApp
        mode="learn"
        courseId={DEFAULT_LEARN_COURSE_ID}
        autoStart={start === "1"}
        autoStartSource={parseLearnAutoStartSource(source)}
      />
    </SubProjectLayout>
  );
}
