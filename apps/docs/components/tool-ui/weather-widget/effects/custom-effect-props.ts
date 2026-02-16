export type WeatherEffectLayer =
  | "celestial"
  | "clouds"
  | "rain"
  | "lightning"
  | "snow";

/**
 * Custom effect layer props for direct control.
 * When provided, these override the auto-calculated values from weather mapping.
 */
export interface CustomEffectProps {
  enabledLayers?: WeatherEffectLayer[];
  celestial?: {
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
    sunRayShimmer?: number;
    /**
     * Global speed multiplier for the ray shimmer/breath noise inputs.
     * 1 is the default speed; >1 speeds up motion.
     */
    sunRayShimmerSpeed?: number;
    moonGlowIntensity: number;
    moonGlowSize: number;
  };
  cloud?: {
    cloudScale?: number;
    coverage: number;
    density?: number;
    softness?: number;
    windSpeed: number;
    windAngle?: number;
    turbulence: number;
    sunAltitude: number;
    sunAzimuth?: number;
    lightIntensity?: number;
    ambientDarkness: number;
    numLayers?: number;
    layerSpread?: number;
    starDensity: number;
    starSize?: number;
    starTwinkleSpeed?: number;
    starTwinkleAmount?: number;
    horizonLine?: number;
  };
  rain?: {
    glassIntensity: number;
    zoom?: number;
    fallingIntensity: number;
    fallingSpeed?: number;
    fallingAngle: number;
    fallingStreakLength?: number;
    fallingLayers?: number;
    fallingRefraction?: number;
    fallingWaviness?: number;
    fallingThicknessVar?: number;
  };
  lightning?: {
    branchDensity?: number;
    displacement?: number;
    glowIntensity?: number;
    flashDuration?: number;
    sceneIllumination?: number;
    afterglowPersistence?: number;
    autoMode: boolean;
    autoInterval: number;
  };
  snow?: {
    intensity: number;
    layers?: number;
    fallSpeed?: number;
    windSpeed: number;
    windAngle?: number;
    turbulence?: number;
    drift: number;
    flutter?: number;
    windShear?: number;
    flakeSize?: number;
    sizeVariation?: number;
    opacity?: number;
    glowAmount?: number;
    sparkle?: number;
    visibility?: number;
  };
  glass?: {
    enabled?: boolean;
    depth?: number;
    strength?: number;
    chromaticAberration?: number;
    blur?: number;
    brightness?: number;
    saturation?: number;
  };
  post?: {
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
  };
}
