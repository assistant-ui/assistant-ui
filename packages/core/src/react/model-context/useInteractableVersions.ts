import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import {
  getInteractableVersions,
  type InteractableVersion,
} from "../../model-context/interactable-composer-metadata";
import { useInteractableState } from "./useInteractableState";
import { useJSONEqual } from "../utils/useJSONEqual";

/**
 * Every version of a thread-scoped interactable recorded in the current
 * thread, oldest first: the creating tool call, each user edit, and each
 * `update_*` call. Each entry carries the full state as of that version and a
 * `restore()` that sets the live instance back to it — enough for a version
 * picker like an artifact's history dropdown.
 *
 * @deprecated Unstable / Experimental (not actually removed).
 */
export const useInteractableVersions = <TState = unknown>(
  id: string,
  name: string,
): (Omit<InteractableVersion, "state"> & {
  state: TState;
  restore: () => void;
})[] => {
  const versions = useAuiState(
    useJSONEqual((s) => getInteractableVersions(s.thread.messages, id, name)),
  );
  const [, { setState }] = useInteractableState<TState>(id);

  return useMemo(
    () =>
      versions.map((v) => ({
        ...v,
        state: v.state as TState,
        restore: () => setState(v.state as TState),
      })),
    [versions, setState],
  );
};
