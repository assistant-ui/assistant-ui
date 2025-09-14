import { resource } from "../../../../tap/dist/core/resource";
import { AttachmentClientApi } from "../../client/types/Attachment";
import { tapApi } from "../../utils/tap-store";
import { AttachmentRuntime } from "../runtime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";

export const AttachmentRuntimeClient = resource(
  ({ runtime }: { runtime: AttachmentRuntime }) => {
    const state = tapSubscribable(runtime);
    return tapApi<AttachmentClientApi>(
      {
        getState: () => state,
        remove: runtime.remove,
        __internal_getRuntime: () => runtime,
      },
      {
        key: state.id,
      },
    );
  },
);
