"use client";

import { ImageGeneration } from "@/components/assistant-ui/elements/image-generation";
import { defineStates } from "./types";

const noop = () => {};
const PROMPT = "A calm mountain lake at dawn";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "generating",
    label: "Generating",
    note: "The dot grid holds the frame while the image is still rendering.",
    Component: () => (
      <ImageGeneration prompt={PROMPT} generating onRegenerate={noop} />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "The finished image with its prompt and a regenerate button.",
    Component: () => (
      <ImageGeneration prompt={PROMPT} generating={false} onRegenerate={noop} />
    ),
  },
  {
    key: "no-regenerate",
    label: "No regenerate",
    note: "Without a regenerate handler the image is final and the button is hidden.",
    Component: () => <ImageGeneration prompt={PROMPT} generating={false} />,
  },
  {
    key: "long-content",
    label: "Long prompt",
    note: "A long prompt truncates to one line beside the button.",
    Component: () => (
      <ImageGeneration
        prompt="A calm mountain lake at dawn, mist over the water, pine forest on the far shore, soft pink and violet light, wide angle, 35mm film grain"
        generating={false}
        onRegenerate={noop}
      />
    ),
  },
]);
