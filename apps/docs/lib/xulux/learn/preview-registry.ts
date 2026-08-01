import "server-only";

import type { ComponentType, ReactNode } from "react";

type PreviewRuntimeProps = Readonly<{
  api?: string;
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
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S1Page }) => ({ default: S1Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S2: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S2Page }) => ({ default: S2Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S3: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S3Page }) => ({ default: S3Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S4: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S4Page }) => ({ default: S4Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S1/project/components/runtime-provider"),
  },
  S5: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S5Page }) => ({ default: S5Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S5/project/components/runtime-provider"),
  },
  S6: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S6Page }) => ({ default: S6Page }),
      ),
    loadRuntime: () =>
      import("./courses/build-generative-ui-assistant/stages/S6/project/components/runtime-provider"),
  },
  S7: {
    loadPage: () =>
      import("./courses/build-generative-ui-assistant/preview-pages").then(
        ({ S7Page }) => ({ default: S7Page }),
      ),
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
