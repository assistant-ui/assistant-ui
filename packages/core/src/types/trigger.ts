import type { ReadonlyJSONObject } from "assistant-stream/utils";

export type Unstable_TriggerItem = {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly icon?: string | undefined;
  readonly description?: string | undefined;
  readonly metadata?: ReadonlyJSONObject | undefined;
};

export type Unstable_TriggerCategory = {
  readonly id: string;
  readonly label: string;
  readonly icon?: string | undefined;
};
