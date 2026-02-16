export { EffectCompositor } from "./effect-compositor";
export type {
  CustomEffectProps,
  WeatherEffectLayer,
} from "./custom-effect-props";
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
} from "./weather-effects-types";

export * from "./tuning";
export { TUNED_WEATHER_EFFECTS_CHECKPOINT_OVERRIDES } from "./tuned-presets";

export {
  GlassPanel,
  GlassPanelCSS,
  GlassPanelUnderlay,
  useGlassStyles,
} from "./glass-panel-svg";
export { resolveGlassBackdropFilterStyles } from "./glass-style-resolver";
export {
  mapWeatherCompositorParamsToCanvasProps,
  resolveConditionCheckpointOverridesForTime,
  resolveWeatherEffectsCanvasProps,
} from "./canvas-resolver";
export type {
  WeatherEffectsCheckpointMode,
  WeatherStudioCompositorParams,
} from "./canvas-resolver";
