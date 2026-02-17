import type { ThreadState } from "@assistant-ui/core/store";
import { useAuiState } from "@assistant-ui/store";

export function useThread(): ThreadState;
export function useThread<TSelected>(
  selector: (state: ThreadState) => TSelected,
): TSelected;
export function useThread<TSelected = ThreadState>(
  selector?: (state: ThreadState) => TSelected,
): TSelected {
  return useAuiState((s) =>
    selector ? selector(s.thread) : (s.thread as unknown as TSelected),
  );
}
