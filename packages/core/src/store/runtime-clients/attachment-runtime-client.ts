import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { AttachmentRuntime } from "../../runtime/api/attachment-runtime";
import { handleRuntimeAction } from "./handle-runtime-action";
import { useSubscribable } from "./useSubscribable";

const useAttachmentRuntimeClient = ({
  runtime,
}: {
  runtime: AttachmentRuntime;
}): ClientOutput<"attachment"> => {
  const state = useSubscribable(runtime);

  return {
    getState: () => state,
    remove: () => handleRuntimeAction("attachment remove", runtime.remove),
    __internal_getRuntime: () => runtime,
  };
};

export const AttachmentRuntimeClient = resource(useAttachmentRuntimeClient);
