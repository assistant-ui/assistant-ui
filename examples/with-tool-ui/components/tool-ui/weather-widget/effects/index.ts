export { EffectCompositor } from "./effect-compositor";
export type { CustomEffectProps } from "./effect-compositor";
export {
  mapWeatherToEffects,
  getSunAltitude,
  isNightTime,
  getTimeOfDay,
  getMoonPhase,
  getSceneBrightness,
  getSceneBrightnessFromTimeOfDay,
  timeOfDayToSunAltitude,
  getWeatherTheme,
} from "./parameter-mapper";
export type { WeatherTheme } from "./parameter-mapper";
export { useWeatherTheme } from "./use-weather-theme";
export type {
  EffectSettings,
  EffectQuality,
  EffectLayerConfig,
  WeatherEffectParams,
  CelestialConfig,
} from "./types";

export { WeatherEffectsCanvas } from "./weather-effects-canvas";
export type {
  WeatherEffectsCanvasProps,
  CelestialParams,
  CloudParams,
  RainParams,
  LightningParams,
  SnowParams,
  InteractionParams,
  LayerToggles,
} from "./weather-effects-canvas";

export * from "./tuning";
export { TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES } from "./tuned-presets";

export {
  GlassPanel,
  GlassPanelCSS,
  GlassPanelUnderlay,
  useGlassStyles,
} from "./glass-panel-svg";
