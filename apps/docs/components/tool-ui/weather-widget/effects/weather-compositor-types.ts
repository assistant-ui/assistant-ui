import type {
  LayerToggles,
  PostProcessParams,
  SnowParams,
} from "./weather-effects-types";

export interface WeatherCompositorCelestialParams {
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
  sunRayShimmer: number;
  sunRayShimmerSpeed: number;
  moonGlowIntensity: number;
  moonGlowSize: number;
  skyBrightness: number;
  skySaturation: number;
  skyContrast: number;
}

export interface WeatherCompositorCloudParams {
  cloudScale: number;
  coverage: number;
  density: number;
  softness: number;
  windSpeed: number;
  windAngle: number;
  turbulence: number;
  lightIntensity: number;
  ambientDarkness: number;
  backlightIntensity: number;
  numLayers: number;
}

export interface WeatherCompositorRainParams {
  glassIntensity: number;
  zoom: number;
  fallingIntensity: number;
  fallingSpeed: number;
  fallingAngle: number;
  fallingStreakLength: number;
  fallingLayers: number;
  fallingRefraction: number;
}

export interface WeatherCompositorLightningParams {
  autoMode: boolean;
  autoInterval: number;
  glowIntensity: number;
  branchDensity: number;
  sceneIllumination: number;
}

export interface WeatherCompositorParams {
  layers: LayerToggles;
  celestial: WeatherCompositorCelestialParams;
  cloud: WeatherCompositorCloudParams;
  rain: WeatherCompositorRainParams;
  lightning: WeatherCompositorLightningParams;
  snow: SnowParams;
  post: PostProcessParams;
}

export type WeatherStudioCompositorParams = WeatherCompositorParams;
