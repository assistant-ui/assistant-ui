export type WeatherConditionCode =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "sleet"
  | "hail"
  | "windy";

export type TemperatureUnit = "celsius" | "fahrenheit";

export type PrecipitationLevel = "none" | "light" | "moderate" | "heavy";

export type TimeBucket = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface ForecastDay {
  label: string;
  conditionCode: WeatherConditionCode;
  tempMin: number;
  tempMax: number;
}

export interface WeatherWidgetCurrent {
  conditionCode: WeatherConditionCode;
  temperature: number;
  tempMin: number;
  tempMax: number;
  windSpeed?: number;
  precipitationLevel?: PrecipitationLevel;
  visibility?: number;
}

export interface WeatherWidgetTime {
  timeBucket?: TimeBucket;
  localTimeOfDay?: number;
}

export interface WeatherWidgetLocation {
  name: string;
}

export interface WeatherWidgetPayload {
  version: "3.1";
  id: string;
  location: WeatherWidgetLocation;
  units: {
    temperature: TemperatureUnit;
  };
  current: WeatherWidgetCurrent;
  forecast: ForecastDay[];
  time: WeatherWidgetTime;
  updatedAt?: string;
}

export type EffectQuality = "low" | "medium" | "high" | "auto";

export interface EffectSettings {
  enabled?: boolean;
  quality?: EffectQuality;
  reducedMotion?: boolean;
}

export interface WeatherWidgetRuntimeProps extends WeatherWidgetPayload {
  className?: string;
  effects?: EffectSettings;
}
