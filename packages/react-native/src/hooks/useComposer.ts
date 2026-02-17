import type { ComposerState } from "@assistant-ui/core/store";
import { useAuiState } from "@assistant-ui/store";

export function useComposer(): ComposerState;
export function useComposer<TSelected>(
  selector: (state: ComposerState) => TSelected,
): TSelected;
export function useComposer<TSelected = ComposerState>(
  selector?: (state: ComposerState) => TSelected,
): TSelected {
  return useAuiState((s) =>
    selector ? selector(s.composer) : (s.composer as unknown as TSelected),
  );
}
