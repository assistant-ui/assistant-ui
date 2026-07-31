import { highlight } from "codehike/code";
import { tapTutorialSteps } from "./tutorial-data";
import {
  TapTutorialPlaygroundClient,
  type TapTutorialClientStep,
} from "./tutorial-playground.client";

export const TapTutorialPlayground = async () => {
  const steps: TapTutorialClientStep[] = await Promise.all(
    tapTutorialSteps.map(async ({ language, code, ...rest }) => ({
      ...rest,
      code: await highlight(
        { value: code, lang: language, meta: "" },
        "github-from-css",
      ),
    })),
  );

  return <TapTutorialPlaygroundClient steps={steps} />;
};
