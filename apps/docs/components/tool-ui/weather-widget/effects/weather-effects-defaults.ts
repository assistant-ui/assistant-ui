import type {
  CelestialParams,
  CloudParams,
  InteractionParams,
  LayerToggles,
  LightningParams,
  PostProcessParams,
  RainParams,
  SnowParams,
} from "./weather-effects-types";

export const DEFAULT_LAYERS: LayerToggles = {
  celestial: true,
  clouds: true,
  rain: false,
  lightning: false,
  snow: false,
};

export const DEFAULT_CELESTIAL: CelestialParams = {
  timeOfDay: 0.5,
  moonPhase: 0.5,
  starDensity: 0.5,
  celestialX: 0.74,
  celestialY: 0.78,
  sunSize: 0.14,
  moonSize: 0.17,
  sunGlowIntensity: 3.05,
  sunGlowSize: 0.3,
  sunRayCount: 6,
  sunRayLength: 3.0,
  sunRayIntensity: 0.1,
  sunRayShimmer: 1.0,
  sunRayShimmerSpeed: 1.0,
  moonGlowIntensity: 3.45,
  moonGlowSize: 0.94,
  skyBrightness: 1.0,
  skySaturation: 1.0,
  skyContrast: 1.0,
};

export const DEFAULT_CLOUD: CloudParams = {
  coverage: 0.5,
  density: 0.7,
  softness: 0.5,
  cloudScale: 1.0,
  windSpeed: 0.3,
  windAngle: 0,
  turbulence: 0.3,
  lightIntensity: 1.0,
  ambientDarkness: 0.2,
  backlightIntensity: 0.5,
  numLayers: 3,
};

export const DEFAULT_RAIN: RainParams = {
  glassIntensity: 0.5,
  glassZoom: 1.0,
  fallingIntensity: 0.6,
  fallingSpeed: 2.0,
  fallingAngle: 0.1,
  fallingStreakLength: 1.0,
  fallingLayers: 4,
};

export const DEFAULT_LIGHTNING: LightningParams = {
  enabled: false,
  autoMode: true,
  autoInterval: 8,
  flashIntensity: 1.0,
  branchDensity: 0.5,
};

export const DEFAULT_SNOW: SnowParams = {
  intensity: 0.5,
  layers: 4,
  fallSpeed: 0.6,
  windSpeed: 0.3,
  windAngle: 0.2,
  turbulence: 0.3,
  drift: 0.5,
  flutter: 0.5,
  windShear: 0.5,
  flakeSize: 1.0,
  sizeVariation: 0.5,
  opacity: 0.5,
  glowAmount: 0.25,
  sparkle: 0.25,
};

export const DEFAULT_INTERACTIONS: InteractionParams = {
  rainRefractionStrength: 1.0,
  lightningSceneIllumination: 0.6,
};

export const DEFAULT_POST: PostProcessParams = {
  enabled: true,

  haze: 0.0,
  hazeHorizon: 0.8,
  hazeDesaturation: 0.35,
  hazeContrast: 0.6,

  bloomIntensity: 0.0,
  bloomThreshold: 0.82,
  bloomKnee: 0.35,
  bloomRadius: 1.2,
  bloomTapScale: 1.0,

  exposureIntensity: 0.0,
  exposureDesaturation: 0.25,
  exposureRecovery: 1.0,

  godRayIntensity: 0.0,
  godRayDecay: 0.965,
  godRayDensity: 0.9,
  godRayWeight: 0.35,
  godRaySamples: 16,
};
