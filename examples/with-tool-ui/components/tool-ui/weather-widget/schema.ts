import { z } from "zod";
import { ToolUIIdSchema, ToolUIRoleSchema, parseWithSchema } from "../shared";
import type { CustomEffectProps } from "./effects";

export const WeatherConditionSchema = z.enum([
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

export type WeatherCondition = z.infer<typeof WeatherConditionSchema>;

export const CurrentWeatherSchema = z.object({
  temp: z.number(),
  tempMin: z.number(),
  tempMax: z.number(),
  condition: WeatherConditionSchema,
});

export type CurrentWeather = z.infer<typeof CurrentWeatherSchema>;

export const ForecastDaySchema = z.object({
  day: z.string().min(1),
  tempMin: z.number(),
  tempMax: z.number(),
  condition: WeatherConditionSchema,
});

export type ForecastDay = z.infer<typeof ForecastDaySchema>;

export const TemperatureUnitSchema = z.enum(["celsius", "fahrenheit"]);

export type TemperatureUnit = z.infer<typeof TemperatureUnitSchema>;

export const PrecipitationLevelSchema = z.enum([
  "none",
  "light",
  "moderate",
  "heavy",
]);

export type PrecipitationLevel = z.infer<typeof PrecipitationLevelSchema>;

export const EffectQualitySchema = z.enum(["low", "medium", "high", "auto"]);

export type EffectQuality = z.infer<typeof EffectQualitySchema>;

export const EffectSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  quality: EffectQualitySchema.optional(),
  reducedMotion: z.boolean().optional(),
});

export type EffectSettings = z.infer<typeof EffectSettingsSchema>;

export const ExtendedCurrentWeatherSchema = CurrentWeatherSchema.extend({
  windSpeed: z.number().optional(),
  windDirection: z.number().min(0).max(360).optional(),
  humidity: z.number().min(0).max(100).optional(),
  precipitation: PrecipitationLevelSchema.optional(),
  visibility: z.number().optional(),
});

export type ExtendedCurrentWeather = z.infer<
  typeof ExtendedCurrentWeatherSchema
>;

export const SerializableWeatherWidgetSchema = z.object({
  id: ToolUIIdSchema,
  role: ToolUIRoleSchema.optional(),
  location: z.string().min(1),
  // Accept an extended payload (backwards-compatible with CurrentWeatherSchema).
  current: ExtendedCurrentWeatherSchema,
  forecast: z.array(ForecastDaySchema).min(1).max(7),
  unit: TemperatureUnitSchema.optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SerializableWeatherWidget = z.infer<
  typeof SerializableWeatherWidgetSchema
>;

export function parseSerializableWeatherWidget(
  input: unknown,
): SerializableWeatherWidget {
  return parseWithSchema(
    SerializableWeatherWidgetSchema,
    input,
    "WeatherWidget",
  );
}

export interface WeatherWidgetProps extends SerializableWeatherWidget {
  className?: string;
  locale?: string;
  effects?: EffectSettings;
  /**
   * Custom effect props for direct control over all effect parameters.
   * Used by the compositor sandbox for tuning effects in context.
   */
  customEffectProps?: CustomEffectProps;
}
