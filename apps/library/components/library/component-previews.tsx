"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/** The design components' specimens, which the docs app keeps in one map. */
export const DesignSpecimen = dynamic(async () => {
  const { DESIGN_PREVIEWS } =
    await import("@/components/pages/design/registry");
  return function DesignSpecimen({ slug }: { slug: string }) {
    const Specimen = DESIGN_PREVIEWS[slug];
    return Specimen ? <Specimen /> : null;
  };
});

/** The sample each primitive's docs page opens with, keyed by the page's slug. */
const PRIMITIVE_SAMPLES: Record<string, ComponentType> = {
  composer: dynamic(() =>
    import("@/components/pages/docs/samples/composer-primitive").then(
      (m) => m.ComposerPrimitiveSample,
    ),
  ),
  thread: dynamic(() =>
    import("@/components/pages/docs/samples/thread-primitive").then(
      (m) => m.ThreadPrimitiveSample,
    ),
  ),
  message: dynamic(() =>
    import("@/components/pages/docs/samples/message-primitive").then(
      (m) => m.MessagePrimitiveSample,
    ),
  ),
  "action-bar": dynamic(() =>
    import("@/components/pages/docs/samples/action-bar-primitive").then(
      (m) => m.ActionBarPrimitiveSample,
    ),
  ),
  "branch-picker": dynamic(() =>
    import("@/components/pages/docs/samples/branch-picker-primitive").then(
      (m) => m.BranchPickerPrimitiveSample,
    ),
  ),
  "thread-list": dynamic(() =>
    import("@/components/pages/docs/samples/thread-list-primitive").then(
      (m) => m.ThreadListPrimitiveSample,
    ),
  ),
  // This sample reads the runtime its docs page sits in, so it gets one here.
  "assistant-modal": dynamic(async () => {
    const [{ AssistantModalSample }, { SampleRuntimeProvider }] =
      await Promise.all([
        import("@/components/pages/docs/samples/assistant-modal"),
        import("@/components/pages/docs/samples/sample-runtime-provider"),
      ]);
    return function AssistantModalPreview() {
      return (
        <SampleRuntimeProvider>
          <AssistantModalSample />
        </SampleRuntimeProvider>
      );
    };
  }),
  attachment: dynamic(() =>
    import("@/components/pages/docs/samples/attachment").then(
      (m) => m.AttachmentSample,
    ),
  ),
  suggestion: dynamic(() =>
    import("@/components/pages/docs/samples/suggestion-primitive").then(
      (m) => m.SuggestionPrimitiveSample,
    ),
  ),
  "selection-toolbar": dynamic(() =>
    import("@/components/pages/docs/samples/selection-toolbar-primitive").then(
      (m) => m.SelectionToolbarPrimitiveSample,
    ),
  ),
  error: dynamic(() =>
    import("@/components/pages/docs/samples/error-primitive").then(
      (m) => m.ErrorPrimitiveSample,
    ),
  ),
  "chain-of-thought": dynamic(() =>
    import("@/components/pages/docs/samples/chain-of-thought-primitive").then(
      (m) => m.ChainOfThoughtPrimitiveSample,
    ),
  ),
};

export function PrimitiveSample({ slug }: { slug: string }) {
  const Sample = PRIMITIVE_SAMPLES[slug];
  return Sample ? <Sample /> : null;
}
