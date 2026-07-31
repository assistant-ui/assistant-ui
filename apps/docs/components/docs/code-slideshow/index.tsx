import { highlight } from "codehike/code";
import { CodeSlideshowClient, type CodeSlideshowClientStep } from "./client";

export type CodeSlideshowStep = {
  title: string;
  filename: string;
  language: string;
  code: string;
  /** Hard-cut into this step instead of animating from the previous one. */
  cut?: boolean;
};

export const CodeSlideshow = async ({
  steps,
  testId,
}: {
  steps: CodeSlideshowStep[];
  testId?: string;
}) => {
  const highlighted: CodeSlideshowClientStep[] = await Promise.all(
    steps.map(async ({ language, code, ...rest }) => ({
      ...rest,
      code: await highlight(
        { value: code, lang: language, meta: "" },
        "github-from-css",
      ),
    })),
  );

  return <CodeSlideshowClient steps={highlighted} testId={testId} />;
};
