import "server-only";

import type { ComponentType, ReactNode } from "react";

type PreviewRuntimeProps = Readonly<{
  api?: string;
  storagePrefix?: string;
  children: ReactNode;
}>;

type LearnPreviewDefinition = {
  loadPage: () => Promise<{ default: ComponentType }>;
  loadRuntime?: () => Promise<{
    RuntimeProvider: ComponentType<PreviewRuntimeProps>;
  }>;
};

const LEARN_PREVIEWS: Record<string, LearnPreviewDefinition> = {
  S0: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S0/project/app/page"),
  },
  S1: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S2: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S2/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S3: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S3/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S4: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S4/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S5: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S5/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S5/project/components/runtime-provider"),
  },
  S6: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S6/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S6/project/components/runtime-provider"),
  },
  S7: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/stages/S7/project/app/page"),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S6/project/components/runtime-provider"),
  },
};

export function getLearnPreview(stageId: string): LearnPreviewDefinition {
  if (!Object.hasOwn(LEARN_PREVIEWS, stageId)) {
    throw new Error(`Unregistered Learn preview: ${stageId}`);
  }
  return LEARN_PREVIEWS[stageId]!;
}
