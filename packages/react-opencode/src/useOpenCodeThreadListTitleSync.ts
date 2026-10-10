import { useEffect, useRef } from "react";
import type { OpenCodeThreadControllerLike } from "./types";

export const useOpenCodeThreadListTitleSync = (
  controller: OpenCodeThreadControllerLike,
  sessionTitle: string | undefined,
  threadListTitle: string | undefined,
  reload: () => Promise<void>,
  enabled: boolean,
) => {
  const lastReload = useRef<
    { controller: OpenCodeThreadControllerLike; title: string } | undefined
  >(undefined);

  useEffect(() => {
    if (!enabled || typeof sessionTitle !== "string") {
      lastReload.current = undefined;
      return;
    }
    if (sessionTitle === threadListTitle) {
      lastReload.current = undefined;
      return;
    }

    const previous = lastReload.current;
    if (
      previous?.controller === controller &&
      previous.title === sessionTitle
    ) {
      return;
    }

    lastReload.current = { controller, title: sessionTitle };
    void reload();
  }, [controller, enabled, reload, sessionTitle, threadListTitle]);
};
