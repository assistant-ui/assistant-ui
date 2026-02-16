import type { WeatherConditionCode } from "../schema";
import {
  getNearestCheckpoint,
  TIME_CHECKPOINTS,
  TIME_CHECKPOINT_ORDER,
  type TimeCheckpoint,
  type WeatherEffectsCheckpointOverrides,
  type WeatherEffectsOverrides,
  type WeatherEffectsTunedPresets,
} from "./tuning";
import type { WeatherEffectsCanvasProps } from "./weather-effects-types";

interface SurroundingCheckpoints {
  before: TimeCheckpoint;
  after: TimeCheckpoint;
  t: number;
}

function getSurroundingCheckpoints(timeOfDay: number): SurroundingCheckpoints {
  const checkpointTimes = TIME_CHECKPOINT_ORDER.map((checkpoint) => ({
    checkpoint,
    value: TIME_CHECKPOINTS[checkpoint],
  })).sort((a, b) => a.value - b.value);

  const normalized = ((timeOfDay % 1) + 1) % 1;

  for (let i = 0; i < checkpointTimes.length; i++) {
    const current = checkpointTimes[i]!;
    const next = checkpointTimes[(i + 1) % checkpointTimes.length]!;

    const start = current.value;
    let end = next.value;

    if (end < start) {
      end += 1;
    }

    let query = normalized;
    if (query < start && end > 1) {
      query += 1;
    }

    if (query >= start && query < end) {
      const range = end - start;
      const t = range > 0 ? (query - start) / range : 0;
      return {
        before: current.checkpoint,
        after: next.checkpoint,
        t,
      };
    }
  }

  return {
    before: "midnight",
    after: "dawn",
    t: 0,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePartialObject<T extends object>(
  before: Partial<T> | undefined,
  after: Partial<T> | undefined,
  baseBefore: T | undefined,
  baseAfter: T | undefined,
  t: number,
): Partial<T> | undefined {
  if (!before && !after) return undefined;

  const result: Partial<T> = {};
  const keys = new Set([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : []),
  ]) as Set<keyof T>;

  for (const key of keys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (beforeValue === undefined && afterValue === undefined) {
      continue;
    }

    let from = beforeValue;
    let to = afterValue;

    if (from === undefined && baseBefore) {
      from = baseBefore[key];
    }
    if (to === undefined && baseAfter) {
      to = baseAfter[key];
    }

    if (from === undefined || to === undefined) {
      result[key] = (from ?? to) as T[keyof T];
      continue;
    }

    if (typeof from === "number" && typeof to === "number") {
      result[key] = lerp(from, to, t) as T[keyof T];
      continue;
    }

    if (typeof from === "boolean") {
      result[key] = (t < 0.5 ? from : to) as T[keyof T];
      continue;
    }

    result[key] = (t < 0.5 ? from : to) as T[keyof T];
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function interpolateWeatherEffectsOverrides(
  before: WeatherEffectsOverrides | undefined,
  after: WeatherEffectsOverrides | undefined,
  baseBefore: WeatherEffectsCanvasProps | undefined,
  baseAfter: WeatherEffectsCanvasProps | undefined,
  t: number,
): WeatherEffectsOverrides | undefined {
  if (!before && !after) return undefined;

  const result: WeatherEffectsOverrides = {};

  const layers = interpolatePartialObject(
    before?.layers,
    after?.layers,
    baseBefore?.layers,
    baseAfter?.layers,
    t,
  );
  if (layers) result.layers = layers;

  const celestial = interpolatePartialObject(
    before?.celestial,
    after?.celestial,
    baseBefore?.celestial,
    baseAfter?.celestial,
    t,
  );
  if (celestial) result.celestial = celestial;

  const cloud = interpolatePartialObject(
    before?.cloud,
    after?.cloud,
    baseBefore?.cloud,
    baseAfter?.cloud,
    t,
  );
  if (cloud) result.cloud = cloud;

  const rain = interpolatePartialObject(
    before?.rain,
    after?.rain,
    baseBefore?.rain,
    baseAfter?.rain,
    t,
  );
  if (rain) result.rain = rain;

  const lightning = interpolatePartialObject(
    before?.lightning,
    after?.lightning,
    baseBefore?.lightning,
    baseAfter?.lightning,
    t,
  );
  if (lightning) result.lightning = lightning;

  const snow = interpolatePartialObject(
    before?.snow,
    after?.snow,
    baseBefore?.snow,
    baseAfter?.snow,
    t,
  );
  if (snow) result.snow = snow;

  const interactions = interpolatePartialObject(
    before?.interactions,
    after?.interactions,
    baseBefore?.interactions,
    baseAfter?.interactions,
    t,
  );
  if (interactions) result.interactions = interactions;

  const post = interpolatePartialObject(
    before?.post,
    after?.post,
    baseBefore?.post,
    baseAfter?.post,
    t,
  );
  if (post) result.post = post;

  return Object.keys(result).length > 0 ? result : undefined;
}

export function resolveInterpolatedOverridesForTime(opts: {
  checkpointOverrides: WeatherEffectsCheckpointOverrides;
  timeOfDay: number;
  getBaseForCheckpoint: (
    checkpoint: TimeCheckpoint,
  ) => WeatherEffectsCanvasProps;
}): WeatherEffectsOverrides | undefined {
  const { before, after, t } = getSurroundingCheckpoints(opts.timeOfDay);

  return interpolateWeatherEffectsOverrides(
    opts.checkpointOverrides[before],
    opts.checkpointOverrides[after],
    opts.getBaseForCheckpoint(before),
    opts.getBaseForCheckpoint(after),
    t,
  );
}

export function resolveConditionCheckpointOverridesForTime(opts: {
  conditionCode: WeatherConditionCode;
  timeOfDay: number;
  tunedPresets: WeatherEffectsTunedPresets;
  checkpointMode?: "nearest" | "interpolated";
}): WeatherEffectsOverrides | undefined {
  const checkpointMode = opts.checkpointMode ?? "nearest";
  const conditionCheckpoints = opts.tunedPresets[opts.conditionCode];
  if (!conditionCheckpoints) return undefined;

  if (checkpointMode === "interpolated") {
    const { before, after, t } = getSurroundingCheckpoints(opts.timeOfDay);
    return interpolateWeatherEffectsOverrides(
      conditionCheckpoints[before],
      conditionCheckpoints[after],
      undefined,
      undefined,
      t,
    );
  }

  return conditionCheckpoints[getNearestCheckpoint(opts.timeOfDay)];
}
