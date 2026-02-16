import { z } from "zod";
import { defineToolUiContract } from "../shared/contract";

import type { CustomEffectProps } from "./effects/custom-effect-props";
import type { EffectSettings } from "./effects/types";

export const WeatherConditionCodeSchema = z.enum([
  "clear",
  "partly-cloudy",
  "cloudy",
  "overcast",
  "fog",
  "drizzle",
  "rain",
  "heavy-rain",
  "thunderstorm",
  "snow",
  "sleet",
  "hail",
  "windy",
]);

export type WeatherConditionCode = z.infer<typeof WeatherConditionCodeSchema>;

export const TemperatureUnitSchema = z.enum(["celsius", "fahrenheit"]);

export const ForecastDaySchema = z.object({
  label: z.string().min(1),
  conditionCode: WeatherConditionCodeSchema,
  tempMin: z.number(),
  tempMax: z.number(),
});

export type ForecastDay = z.infer<typeof ForecastDaySchema>;

export type TemperatureUnit = z.infer<typeof TemperatureUnitSchema>;

export const PrecipitationLevelSchema = z.enum([
  "none",
  "light",
  "moderate",
  "heavy",
]);

export type PrecipitationLevel = z.infer<typeof PrecipitationLevelSchema>;

export const TimeBucketSchema = z.number().int().min(0).max(11);

export const WeatherWidgetPayloadSchema = z
  .object({
    version: z.literal("3.1"),
    id: z.string().min(1),
    location: z.object({
      name: z.string().min(1),
    }),
    units: z.object({
      temperature: TemperatureUnitSchema,
    }),
    current: z.object({
      conditionCode: WeatherConditionCodeSchema,
      temperature: z.number(),
      tempMin: z.number(),
      tempMax: z.number(),
      windSpeed: z.number().optional(),
      precipitationLevel: PrecipitationLevelSchema.optional(),
      visibility: z.number().optional(),
    }),
    forecast: z.array(ForecastDaySchema).min(1).max(7),
    // Rendering-time hints only (not weather data):
    // - `timeBucket` selects one of 12 fixed scenes
    // - `localTimeOfDay` gives a continuous 0..1 position in the day cycle
    time: z.object({
      timeBucket: TimeBucketSchema.optional(),
      localTimeOfDay: z.number().min(0).max(1).optional(),
    }),
    updatedAt: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    const hasBucket = value.time.timeBucket !== undefined;
    const hasLocalTime = value.time.localTimeOfDay !== undefined;

    if (!hasBucket && !hasLocalTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "time must include timeBucket or localTimeOfDay",
      });
      return;
    }

    if (hasBucket && hasLocalTime) {
      const normalized = (((value.time.localTimeOfDay ?? 0) % 1) + 1) % 1;
      const derivedBucket = Math.floor(normalized * 12) % 12;
      if (derivedBucket !== value.time.timeBucket) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["time"],
          message: "timeBucket must match localTimeOfDay bucket",
        });
      }
    }
  });

export type WeatherWidgetPayload = z.infer<typeof WeatherWidgetPayloadSchema>;

export type WeatherWidgetCurrent = WeatherWidgetPayload["current"];

export type WeatherWidgetTime = WeatherWidgetPayload["time"];

export type WeatherWidgetLocation = WeatherWidgetPayload["location"];

export const WeatherEffectDriversSchema = z.object({
  windSpeed: z.number().optional(),
  precipitationLevel: PrecipitationLevelSchema.optional(),
  visibility: z.number().optional(),
});

export type WeatherEffectDrivers = z.infer<typeof WeatherEffectDriversSchema>;

const WeatherWidgetPayloadSchemaContract = defineToolUiContract(
  "WeatherWidget",
  WeatherWidgetPayloadSchema,
);

export const parseWeatherWidgetPayload: (
  input: unknown,
) => WeatherWidgetPayload = WeatherWidgetPayloadSchemaContract.parse;

export const safeParseWeatherWidgetPayload: (
  input: unknown,
) => WeatherWidgetPayload | null = WeatherWidgetPayloadSchemaContract.safeParse;
export interface WeatherWidgetProps extends WeatherWidgetPayload {
  className?: string;
  effects?: EffectSettings;
  /**
   * Custom effect props for direct control over all effect parameters.
   * Used by the compositor sandbox for tuning effects in context.
   */
  customEffectProps?: CustomEffectProps;
}
