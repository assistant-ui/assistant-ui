import type { WeatherConditionCode } from "../schema";
import type {
  WeatherEffectsCanvasProps,
  LayerToggles,
  CelestialParams,
  CloudParams,
  RainParams,
  LightningParams,
  SnowParams,
  InteractionParams,
  PostProcessParams,
} from "./weather-effects-types";

export type TimeCheckpoint = "dawn" | "noon" | "dusk" | "midnight";

export const TIME_CHECKPOINTS: Record<TimeCheckpoint, number> = {
  dawn: 0.25,
  noon: 0.5,
  dusk: 0.75,
  midnight: 0.0,
};

export const TIME_CHECKPOINT_ORDER: TimeCheckpoint[] = [
  "dawn",
  "noon",
  "dusk",
  "midnight",
];

export interface WeatherEffectsOverrides {
  layers?: Partial<LayerToggles>;
  celestial?: Partial<CelestialParams>;
  cloud?: Partial<CloudParams>;
  rain?: Partial<RainParams>;
  lightning?: Partial<LightningParams>;
  snow?: Partial<SnowParams>;
  glass?: {
    enabled?: boolean;
    depth?: number;
    strength?: number;
    chromaticAberration?: number;
    blur?: number;
    brightness?: number;
    saturation?: number;
  };
  interactions?: Partial<InteractionParams>;
  post?: Partial<PostProcessParams>;
}

export interface WeatherEffectsCheckpointOverrides {
  dawn: WeatherEffectsOverrides;
  noon: WeatherEffectsOverrides;
  dusk: WeatherEffectsOverrides;
  midnight: WeatherEffectsOverrides;
}

export type WeatherEffectsTunedPresets = Partial<
  Record<WeatherConditionCode, WeatherEffectsCheckpointOverrides>
>;

export function getNearestCheckpoint(timeOfDay: number): TimeCheckpoint {
  const normalized = ((timeOfDay % 1) + 1) % 1;

  let nearest: TimeCheckpoint = "noon";
  let minDist = Infinity;

  for (const checkpoint of TIME_CHECKPOINT_ORDER) {
    const value = TIME_CHECKPOINTS[checkpoint];
    let dist = Math.abs(normalized - value);
    if (dist > 0.5) dist = 1 - dist;
    if (dist < minDist) {
      minDist = dist;
      nearest = checkpoint;
    }
  }

  return nearest;
}

function mergeGroup<T extends object>(
  base: Partial<T> | undefined,
  override: Partial<T> | undefined,
): Partial<T> | undefined {
  if (!base && !override) return undefined;
  return { ...(base ?? {}), ...(override ?? {}) };
}

/**
 * Merge tuned overrides into computed canvas props.
 *
 * This is intentionally a shallow merge per parameter group.
 * Missing override fields fall back to the base props (and then canvas defaults).
 */
export function applyWeatherEffectsOverrides(
  base: WeatherEffectsCanvasProps,
  overrides: WeatherEffectsOverrides,
): WeatherEffectsCanvasProps {
  const layers = mergeGroup(base.layers, overrides.layers);
  const celestial = mergeGroup(base.celestial, overrides.celestial);
  const cloud = mergeGroup(base.cloud, overrides.cloud);
  const rain = mergeGroup(base.rain, overrides.rain);
  const lightning = mergeGroup(base.lightning, overrides.lightning);
  const snow = mergeGroup(base.snow, overrides.snow);
  const interactions = mergeGroup(base.interactions, overrides.interactions);
  const post = mergeGroup(base.post, overrides.post);

  return {
    ...(layers ? { layers } : {}),
    ...(celestial ? { celestial } : {}),
    ...(cloud ? { cloud } : {}),
    ...(rain ? { rain } : {}),
    ...(lightning ? { lightning } : {}),
    ...(snow ? { snow } : {}),
    ...(interactions ? { interactions } : {}),
    ...(post ? { post } : {}),
  };
}
