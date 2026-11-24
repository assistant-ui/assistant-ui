/*
 * `DEFAULT_MODEL` leaves the choice to the chat route, which then runs
 * `ROUTE_MODEL`. The other models in the composer's menu are the ones chosen
 * in the settings, which the runtime is sent as `provider/id`.
 */
export const DEFAULT_MODEL = "default";

export const ROUTE_MODEL = "gpt-6.2-sol";

/*
 * How hard the model thinks before it answers, lightest first. `value` is
 * sent as `reasoningEffort`.
 */
export const EFFORTS = [
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
] as const;

export type Effort = (typeof EFFORTS)[number]["value"];

export const DEFAULT_EFFORT: Effort = "low";
