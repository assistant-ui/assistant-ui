import type { WeatherEffectParams } from "./types";
import {
  buildCanvasBaseFromWeather,
  createStudioTimestamp,
} from "./canvas-resolver-base";
import { resolveInterpolatedOverridesForTime } from "./checkpoint-overrides";
import {
  applyWeatherEffectsOverrides,
  getNearestCheckpoint,
  TIME_CHECKPOINTS,
  type TimeCheckpoint,
  type WeatherEffectsTunedPresets,
} from "./tuning";
import type {
  CloudParams,
  InteractionParams,
  LightningParams,
  PostProcessParams,
  RainParams,
  WeatherEffectsCanvasProps,
} from "./weather-effects-types";

export { mapWeatherCompositorParamsToCanvasProps } from "./canvas-resolver-base";
export type { WeatherStudioCompositorParams } from "./canvas-resolver-base";
export { resolveConditionCheckpointOverridesForTime } from "./checkpoint-overrides";

export type WeatherEffectsCheckpointMode = "nearest" | "interpolated";

export interface ResolveWeatherEffectsCanvasPropsInput
  extends WeatherEffectParams {
  tunedPresets?: WeatherEffectsTunedPresets;
  checkpointMode?: WeatherEffectsCheckpointMode;
  /**
   * Optional explicit time-of-day (0-1) used for checkpoint blending.
   * When omitted, it is derived from `timestamp`.
   */
  timeOfDay?: number;
}

function resolveBaseForCheckpoint(
  params: WeatherEffectParams,
  checkpoint: TimeCheckpoint,
): WeatherEffectsCanvasProps {
  const time = TIME_CHECKPOINTS[checkpoint];
  const timestamp = createStudioTimestamp(time, params.timestamp);
  return buildCanvasBaseFromWeather({
    ...params,
    timestamp,
  });
}

export function resolveWeatherEffectsCanvasProps(
  input: ResolveWeatherEffectsCanvasPropsInput,
): WeatherEffectsCanvasProps {
  const checkpointMode = input.checkpointMode ?? "nearest";
  const base = buildCanvasBaseFromWeather(input);
  const explicitTimeOfDay = input.timeOfDay;
  if (typeof explicitTimeOfDay === "number" && base.celestial) {
    base.celestial.timeOfDay = explicitTimeOfDay;
  }

  const conditionCheckpoints = input.tunedPresets?.[input.conditionCode];
  const timeOfDay = explicitTimeOfDay ?? base.celestial?.timeOfDay;
  if (!conditionCheckpoints || timeOfDay === undefined) {
    return base;
  }

  if (checkpointMode === "interpolated") {
    const interpolated = resolveInterpolatedOverridesForTime({
      checkpointOverrides: conditionCheckpoints,
      timeOfDay,
      getBaseForCheckpoint: (checkpoint) =>
        resolveBaseForCheckpoint(input, checkpoint),
    });

    return interpolated
      ? applyWeatherEffectsOverrides(base, interpolated)
      : base;
  }

  const checkpoint = getNearestCheckpoint(timeOfDay);
  return applyWeatherEffectsOverrides(base, conditionCheckpoints[checkpoint]);
}

export type {
  CloudParams,
  InteractionParams,
  LightningParams,
  PostProcessParams,
  RainParams,
};
