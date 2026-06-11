/**
 * The branch surface a runtime exposes so the branch picker can navigate
 * between sibling variants of a message. Read during render; recreate the
 * adapter object when branch data changes.
 *
 * Editing a message creates a branch only if the `onEdit` handler creates a
 * sibling and `getBranches` reports it. Note that `ExternalThread`'s edit
 * payload carries the edited message's own id as both `parentId` and
 * `sourceId`.
 */
export type ExternalThreadBranchAdapter = {
  /**
   * Returns the sibling branch ids for a message in display order, including
   * the message's own id. Return an empty array for messages without
   * alternative branches.
   */
  getBranches: (messageId: string) => readonly string[];
  /**
   * Makes the given branch the visible one. The runtime is expected to swap
   * the `messages` array to the selected branch. May be invoked
   * programmatically while a run is in progress; pending queue items are not
   * cleared, and reconciling them with the new branch is the runtime's
   * responsibility.
   */
  switchToBranch: (branchId: string) => void;
};
