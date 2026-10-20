import {
  INPUT_PRESETS as SETUP_INPUT_PRESETS,
  presetInput as setupPresetInput,
  type PresetId as SetupPresetId,
  type PresetOverrides as SetupPresetOverrides,
} from "setup-agent";

export type PresetId = Extract<SetupPresetId, "framework" | "llm-provider">;
export type PresetOverrides = Omit<SetupPresetOverrides, "found">;

export const INPUT_PRESETS = {
  framework: SETUP_INPUT_PRESETS.framework,
  "llm-provider": SETUP_INPUT_PRESETS["llm-provider"],
} satisfies Pick<typeof SETUP_INPUT_PRESETS, PresetId>;

export const isPresetId = (id: string): id is PresetId =>
  Object.hasOwn(INPUT_PRESETS, id);

export const presetInput = (id: PresetId, overrides: PresetOverrides = {}) =>
  setupPresetInput(id, {
    ...(overrides.only !== undefined && { only: overrides.only }),
    ...(overrides.default !== undefined && { default: overrides.default }),
    ...(overrides.optional !== undefined && { optional: overrides.optional }),
    ...(overrides.stepId !== undefined && { stepId: overrides.stepId }),
  });
