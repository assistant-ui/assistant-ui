import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { AttachmentRuntime } from "../../runtime/api/attachment-runtime";
import { useSubscribable } from "./useSubscribable";

export const AttachmentRuntimeClient = resource(
  function AttachmentRuntimeClient({
    runtime,
  }: {
    runtime: AttachmentRuntime;
  }): ClientOutput<"attachment"> {
    const state = useSubscribable(runtime);

    return {
      getState: () => state,
      remove: runtime.remove,
      __internal_getRuntime: () => runtime,
    };
  },
);
