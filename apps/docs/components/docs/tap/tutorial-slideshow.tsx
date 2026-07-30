import { CodeSlideshow } from "@/components/docs/code-slideshow";
import { tapTutorialSteps } from "./tutorial-data";

export const TapTutorialSlideshow = () => (
  <CodeSlideshow steps={tapTutorialSteps} testId="tap-tutorial-slideshow" />
);
