import type { ReadonlyJSONObject } from "assistant-stream/utils";

// =============================================================================
// Trigger Item (generic item for any trigger-based popover: @mention, /command)
// =============================================================================

export type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly icon?: string | undefined;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

// =============================================================================
// Trigger Category (for hierarchical navigation in trigger popovers)
// =============================================================================

export type Unstable_TriggerCategory = {
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
};
