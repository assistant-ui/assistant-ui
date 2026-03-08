import { resource } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { AttachmentRuntime } from "../../runtime";
import { tapSubscribable } from "./tap-subscribable";

export const AttachmentRuntimeClient = resource(
  ({ runtime }: { runtime: AttachmentRuntime }): ClientOutput<"attachment"> => {
    const state = tapSubscribable(runtime);

    return {
      getState: () => state,
      remove: runtime.remove,
      __internal_getRuntime: () => runtime,
    };
  },
);
