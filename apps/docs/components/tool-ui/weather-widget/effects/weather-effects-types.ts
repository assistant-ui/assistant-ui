export interface CelestialParams {
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
  /**
   * Scales subtle, noise-driven ray motion (shimmer + slow "breathing").
   * 0 disables motion; 1 is the default subtlety; >1 increases visibility.
   */
  sunRayShimmer: number;
  /**
   * Global speed multiplier for the ray shimmer/breath noise inputs.
   * 1 is the default speed; >1 speeds up motion.
   */
  sunRayShimmerSpeed: number;
  moonGlowIntensity: number;
  moonGlowSize: number;
  skyBrightness: number;
  skySaturation: number;
  skyContrast: number;
}

export interface CloudParams {
  coverage: number;
  density: number;
  softness: number;
  cloudScale: number;
  windSpeed: number;
  windAngle: number;
  turbulence: number;
  lightIntensity: number;
  ambientDarkness: number;
  backlightIntensity: number;
  numLayers: number;
}

export interface RainParams {
  glassIntensity: number;
  glassZoom: number;
  fallingIntensity: number;
  fallingSpeed: number;
  fallingAngle: number;
  fallingStreakLength: number;
  fallingLayers: number;
}

export interface LightningParams {
  enabled: boolean;
  autoMode: boolean;
  autoInterval: number;
  flashIntensity: number;
  branchDensity: number;
}

export interface SnowParams {
  intensity: number;
  layers: number;
  fallSpeed: number;
  windSpeed: number;
  windAngle: number;
  turbulence: number;
  drift: number;
  flutter: number;
  windShear: number;
  flakeSize: number;
  sizeVariation: number;
  opacity: number;
  glowAmount: number;
  sparkle: number;
}

export interface InteractionParams {
  rainRefractionStrength: number;
  lightningSceneIllumination: number;
}

export interface PostProcessParams {
  enabled: boolean;

  // ---------------------------------------------------------------------------
  // Aerial perspective / haze
  // ---------------------------------------------------------------------------
  /**
   * 0 = clear air, 1 = heavy haze/fog.
   * This is intended to be driven by visibility (and optionally condition).
   */
  haze: number;
  /**
   * Controls how much haze concentrates near the horizon (bottom of the scene).
   * 0 = uniform, 1 = strongly horizon-weighted.
   */
  hazeHorizon: number;
  /**
   * Additional desaturation applied by haze (scaled by `haze`).
   * 0 = none, 1 = strong.
   */
  hazeDesaturation: number;
  /**
   * Contrast compression applied by haze (scaled by `haze`).
   * 0 = none, 1 = strong.
   */
  hazeContrast: number;

  // ---------------------------------------------------------------------------
  // Forward-scatter bloom / glare
  // ---------------------------------------------------------------------------
  bloomIntensity: number;
  bloomThreshold: number;
  bloomKnee: number;
  /**
   * Blur radius in pixels at 1x DPR. Higher values = softer bloom.
   */
  bloomRadius: number;
  /**
   * Scales sampling offsets so we can reduce bloom cost on large canvases.
   * 1 = normal, >1 = fewer effective taps, <1 = higher quality.
   */
  bloomTapScale: number;

  // ---------------------------------------------------------------------------
  // Exposure response (lightning overexposure + recovery)
  // ---------------------------------------------------------------------------
  exposureIntensity: number;
  exposureDesaturation: number;
  exposureRecovery: number;

  // ---------------------------------------------------------------------------
  // Crepuscular rays (screen-space shafts)
  // ---------------------------------------------------------------------------
  godRayIntensity: number;
  godRayDecay: number;
  godRayDensity: number;
  godRayWeight: number;
  godRaySamples: number;
}

export interface LayerToggles {
  celestial: boolean;
  clouds: boolean;
  rain: boolean;
  lightning: boolean;
  snow: boolean;
}

export interface WeatherEffectsCanvasProps {
  className?: string;
  /**
   * Override device pixel ratio used for rendering.
   * When omitted, defaults to `window.devicePixelRatio`.
   */
  dpr?: number;
  layers?: Partial<LayerToggles>;
  celestial?: Partial<CelestialParams>;
  cloud?: Partial<CloudParams>;
  rain?: Partial<RainParams>;
  lightning?: Partial<LightningParams>;
  snow?: Partial<SnowParams>;
  interactions?: Partial<InteractionParams>;
  post?: Partial<PostProcessParams>;
}

export interface ResolvedWeatherEffectsCanvasProps {
  layers: LayerToggles;
  celestial: CelestialParams;
  cloud: CloudParams;
  rain: RainParams;
  lightning: LightningParams;
  snow: SnowParams;
  interactions: InteractionParams;
  post: PostProcessParams;
  dpr?: number;
}
