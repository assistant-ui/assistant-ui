/*
 * The models the composer offers, by the names Codex lists them under. `id` is
 * what the runtime is sent as `modelName`; a route that does not serve an id
 * answers with its own default, so set these to the ids yours serves.
 */
export const MODELS = [
  { id: "gpt-6.2-sol", name: "GPT-6.2 Sol" },
  { id: "gpt-6.2-astra", name: "GPT-6.2 Astra" },
  { id: "gpt-6.1-terra", name: "GPT-6.1 Terra" },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol" },
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
  { id: "gpt-6-sol", name: "GPT-6 Sol" },
  { id: "gpt-6-luna", name: "GPT-6 Luna" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

/** Leaves the choice to the route, which the menu lists first. */
export const DEFAULT_MODEL = "default";

/** The model the default stands for, which the composer names while it is chosen. */
export const RECOMMENDED_MODEL: ModelId = MODELS[0].id;

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
