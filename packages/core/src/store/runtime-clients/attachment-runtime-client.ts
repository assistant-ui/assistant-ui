import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { AttachmentRuntime } from "../../runtime/api/attachment-runtime";
import { useSubscribable } from "./useSubscribable";

export const handleAttachmentRemove = (
  remove: () => Promise<void>,
): Promise<void> => {
  const task = remove();

  void task.catch((error: unknown) => {
    console.error("[assistant-ui] attachment remove failed:", error);
  });
  return task;
};

const useAttachmentRuntimeClient = ({
  runtime,
}: {
  runtime: AttachmentRuntime;
}): ClientOutput<"attachment"> => {
  const state = useSubscribable(runtime);

  return {
    getState: () => state,
    remove: () => handleAttachmentRemove(runtime.remove),
    __internal_getRuntime: () => runtime,
  };
};

export const AttachmentRuntimeClient = resource(useAttachmentRuntimeClient);
