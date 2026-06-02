import type { RunConfig } from "../../types/message";

export const applyModeToRunConfig = (
  runConfig: RunConfig,
  mode: string | undefined,
): RunConfig => {
  if (mode === undefined) return runConfig;
  return {
    ...runConfig,
    custom: { ...runConfig.custom, mode },
  };
};
