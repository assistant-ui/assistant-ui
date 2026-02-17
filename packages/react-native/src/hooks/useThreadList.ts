import type { ThreadsState } from "@assistant-ui/core/store";
import { useAuiState } from "@assistant-ui/store";

export function useThreadList(): ThreadsState;
export function useThreadList<TSelected>(
  selector: (state: ThreadsState) => TSelected,
): TSelected;
export function useThreadList<TSelected = ThreadsState>(
  selector?: (state: ThreadsState) => TSelected,
): TSelected {
  return useAuiState((s) =>
    selector ? selector(s.threads) : (s.threads as unknown as TSelected),
  );
}
