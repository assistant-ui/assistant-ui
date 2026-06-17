import { useEffect } from "react";

/**
 * Persists the resolved master/detail selection back to the panel once it
 * settles, so the nav highlight and the detail pane stay in agreement without
 * re-selecting on every render.
 */
export const useNavSelectionSync = (
  selectedId: string | null,
  selection: string | null,
  setSelection: (id: string | null) => void,
) => {
  useEffect(() => {
    if (!selectedId || selection === selectedId) return;
    setSelection(selectedId);
  }, [selectedId, selection, setSelection]);
};
