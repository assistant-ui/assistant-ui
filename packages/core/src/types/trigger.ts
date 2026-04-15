import type { ReadonlyJSONObject } from "assistant-stream/utils";

/** A selectable item displayed inside a trigger popover (e.g. mention, slash command). */
export type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

/** A grouping of trigger items shown in a trigger popover. */
export type Unstable_TriggerCategory = {
  readonly id: string;
  readonly label: string;
};
