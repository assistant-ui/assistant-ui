/**
 * Minimal, production-focused Weather Widget surface.
 *
 * Prefer importing from this module in application code.
 * Use `index.tsx` only when you need lower-level internals.
 */
export { WeatherWidget } from "./weather-widget";
export {
  WeatherWidgetPayloadSchema,
  parseWeatherWidgetPayload,
  safeParseWeatherWidgetPayload,
  type WeatherWidgetPayload,
  type WeatherWidgetProps,
  type WeatherWidgetCurrent,
  type WeatherWidgetTime,
  type WeatherWidgetLocation,
  type WeatherConditionCode,
  type ForecastDay,
  type TemperatureUnit,
  type PrecipitationLevel,
} from "./schema";
