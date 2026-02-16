import type { WeatherConditionCode } from "../schema";

export type EffectQuality = "low" | "medium" | "high" | "auto";

export interface EffectSettings {
  enabled?: boolean;
  quality?: EffectQuality;
  reducedMotion?: boolean;
}

export interface CloudLayerConfig {
  coverage: number;
  speed: number;
  darkness: number;
  turbulence: number;
}

export interface RainLayerConfig {
  intensity: number;
  glassDrops: boolean;
  fallingRain: boolean;
  angle: number;
}

export interface LightningLayerConfig {
  enabled: boolean;
  autoTrigger: boolean;
  intervalMin: number;
  intervalMax: number;
}

export interface SnowLayerConfig {
  intensity: number;
  windDrift: number;
}

export interface AtmosphereConfig {
  sunAltitude: number;
  haze: number;
  starVisibility: number;
}

export interface PostProcessConfig {
  enabled?: boolean;

  haze?: number;
  hazeHorizon?: number;
  hazeDesaturation?: number;
  hazeContrast?: number;

  bloomIntensity?: number;
  bloomThreshold?: number;
  bloomKnee?: number;
  bloomRadius?: number;
  bloomTapScale?: number;

  exposureIntensity?: number;
  exposureDesaturation?: number;
  exposureRecovery?: number;

  godRayIntensity?: number;
  godRayDecay?: number;
  godRayDensity?: number;
  godRayWeight?: number;
  godRaySamples?: number;
}

export interface CelestialConfig {
  timeOfDay: number;
  moonPhase: number;
  starDensity: number;
  celestialX: number;
  celestialY: number;
  sunSize: number;
  moonSize: number;
  sunGlowIntensity: number;
  sunGlowSize: number;
  sunRayCount: number;
  sunRayLength: number;
  sunRayIntensity: number;
  moonGlowIntensity: number;
  moonGlowSize: number;
}

export interface EffectLayerConfig {
  cloud?: CloudLayerConfig;
  rain?: RainLayerConfig;
  lightning?: LightningLayerConfig;
  snow?: SnowLayerConfig;
  celestial?: CelestialConfig;
  atmosphere: AtmosphereConfig;
  post?: PostProcessConfig;
}

export interface WeatherEffectParams {
  conditionCode: WeatherConditionCode;
  windSpeed?: number;
  precipitationLevel?: "none" | "light" | "moderate" | "heavy";
  visibility?: number;
  timestamp?: string;
  timeOfDay?: number;
}
