import { getTimeOfDay } from "./effects/parameter-mapper";
import type { WeatherWidgetTime } from "./schema";

export interface ResolveWeatherTimeInput {
  time?: WeatherWidgetTime;
  updatedAt?: string;
}

export type WeatherTimeSource =
  | "timeBucket"
  | "localTimeOfDay"
  | "updatedAt"
  | "defaultNoon";

export interface ResolvedWeatherTime {
  timeOfDay: number;
  source: WeatherTimeSource;
}

function normalizeTimeOfDay(value: number): number {
  const normalized = ((value % 1) + 1) % 1;
  return normalized;
}

export function timeBucketToTimeOfDay(timeBucket: number): number {
  const normalizedBucket = ((Math.floor(timeBucket) % 12) + 12) % 12;
  return (normalizedBucket + 0.5) / 12;
}

export function resolveWeatherTime(
  input: ResolveWeatherTimeInput,
): ResolvedWeatherTime {
  const { time, updatedAt } = input;

  if (typeof time?.timeBucket === "number") {
    return {
      timeOfDay: timeBucketToTimeOfDay(time.timeBucket),
      source: "timeBucket",
    };
  }

  if (typeof time?.localTimeOfDay === "number") {
    return {
      timeOfDay: normalizeTimeOfDay(time.localTimeOfDay),
      source: "localTimeOfDay",
    };
  }

  if (typeof updatedAt === "string") {
    return {
      timeOfDay: getTimeOfDay(updatedAt),
      source: "updatedAt",
    };
  }

  return {
    timeOfDay: 0.5,
    source: "defaultNoon",
  };
}
