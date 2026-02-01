"use client";

import { useEffect, useRef, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

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
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const DEFAULT_LAYERS: LayerToggles = {
  celestial: true,
  clouds: true,
  rain: false,
  lightning: false,
  snow: false,
};

const DEFAULT_CELESTIAL: CelestialParams = {
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

const DEFAULT_CLOUD: CloudParams = {
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

const DEFAULT_RAIN: RainParams = {
  glassIntensity: 0.5,
  glassZoom: 1.0,
  fallingIntensity: 0.6,
  fallingSpeed: 2.0,
  fallingAngle: 0.1,
  fallingStreakLength: 1.0,
  fallingLayers: 4,
};

const DEFAULT_LIGHTNING: LightningParams = {
  enabled: false,
  autoMode: true,
  autoInterval: 8,
  flashIntensity: 1.0,
  branchDensity: 0.5,
};

const DEFAULT_SNOW: SnowParams = {
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

const DEFAULT_INTERACTIONS: InteractionParams = {
  rainRefractionStrength: 1.0,
  lightningSceneIllumination: 0.6,
};

// =============================================================================
// SHADERS
// =============================================================================

const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
in vec4 a_position;
out vec2 v_uv;

void main() {
  gl_Position = a_position;
  v_uv = a_position.xy * 0.5 + 0.5;
}
`;

// Pass 1: Celestial (sky, sun, moon, stars)
const CELESTIAL_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_timeOfDay;
uniform float u_moonPhase;
uniform float u_starDensity;
uniform vec2 u_celestialPos;
uniform float u_sunSize;
uniform float u_moonSize;
uniform float u_sunGlowIntensity;
uniform float u_sunGlowSize;
uniform float u_sunRayCount;
uniform float u_sunRayLength;
uniform float u_sunRayIntensity;
uniform float u_sunRayShimmer;
uniform float u_sunRayShimmerSpeed;
uniform float u_moonGlowIntensity;
uniform float u_moonGlowSize;
uniform float u_skyBrightness;
uniform float u_skySaturation;
uniform float u_skyContrast;
uniform sampler2D u_moonTexture;
uniform bool u_hasMoonTexture;

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// Calculate sun Y position based on time of day
// Sun rises 0.18-0.32, visible during day, sets 0.68-0.82
// Note: UV y=0 is bottom, y=1 is top, so below horizon means y < 0
float getSunY(float timeOfDay, float baseY) {
  float belowHorizon = -0.25;
  float riseProgress = smoothstep(0.18, 0.32, timeOfDay);
  float setProgress = smoothstep(0.68, 0.82, timeOfDay);
  float visible = riseProgress * (1.0 - setProgress);
  return mix(belowHorizon, baseY, visible);
}

// Calculate moon Y position based on time of day
// Moon sets 0.12-0.26 (overlaps slightly with sun rise)
// Moon rises 0.74-0.88 (overlaps slightly with sun set)
// During overlap both are near horizon so both faded = subtle handoff
float getMoonY(float timeOfDay, float baseY) {
  float belowHorizon = -0.25;
  float risingEvening = smoothstep(0.74, 0.88, timeOfDay);
  float settingMorning = 1.0 - smoothstep(0.12, 0.26, timeOfDay);
  float visible = max(risingEvening, settingMorning);
  return mix(belowHorizon, baseY, visible);
}

// Fade opacity near horizon for smooth edge (bottom of screen)
// Extended range so bodies visible earlier in their rise
float getHorizonFade(float y) {
  return smoothstep(-0.2, 0.0, y);
}

vec3 getSkyColor(vec2 uv, float timeOfDay) {
  vec3 dayTop = vec3(0.4, 0.6, 0.9);
  vec3 dayHorizon = vec3(0.7, 0.8, 0.95);
  vec3 sunsetTop = vec3(0.2, 0.2, 0.4);
  vec3 sunsetHorizon = vec3(0.9, 0.5, 0.2);
  vec3 nightTop = vec3(0.02, 0.02, 0.05);
  vec3 nightHorizon = vec3(0.05, 0.05, 0.1);

  float dayAmount = smoothstep(0.25, 0.4, timeOfDay) * smoothstep(0.75, 0.6, timeOfDay);
  float sunsetAmount = max(
    smoothstep(0.2, 0.3, timeOfDay) * smoothstep(0.4, 0.3, timeOfDay),
    smoothstep(0.6, 0.7, timeOfDay) * smoothstep(0.8, 0.7, timeOfDay)
  );
  float nightAmount = max(0.0, 1.0 - dayAmount - sunsetAmount);

  float gradientFactor = pow(1.0 - uv.y, 1.0);

  vec3 topColor = dayTop * dayAmount + sunsetTop * sunsetAmount + nightTop * nightAmount;
  vec3 horizonColor = dayHorizon * dayAmount + sunsetHorizon * sunsetAmount + nightHorizon * nightAmount;

  vec3 avgColor = (topColor + horizonColor) * 0.5;
  topColor = mix(avgColor, topColor, u_skyContrast);
  horizonColor = mix(avgColor, horizonColor, u_skyContrast);

  vec3 color = mix(topColor, horizonColor, gradientFactor);

  color *= u_skyBrightness;

  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  if (u_skySaturation <= 1.0) {
    color = mix(vec3(gray), color, u_skySaturation);
  } else {
    float boost = u_skySaturation - 1.0;
    color = color + (color - vec3(gray)) * boost;
  }

  return clamp(color, 0.0, 1.0);
}

float drawStars(vec2 uv, float density, float time) {
  float stars = 0.0;
  for (int layer = 0; layer < 3; layer++) {
    float layerScale = 100.0 + float(layer) * 50.0;
    vec2 gridUV = uv * layerScale;
    vec2 gridID = floor(gridUV);
    vec2 gridFract = fract(gridUV);
    vec2 starPos = hash2(gridID + float(layer) * 100.0);
    float dist = length(gridFract - starPos);
    float starPresent = step(1.0 - density * 0.3, hash(gridID * (float(layer) + 1.0)));
    float starSize = 0.02 + hash(gridID.yx) * 0.03;
    float twinkle = sin(time * (2.0 + hash(gridID) * 3.0) + hash(gridID.yx) * TAU) * 0.3 + 0.7;
    float star = smoothstep(starSize, 0.0, dist) * starPresent * twinkle;
    star *= 1.0 - float(layer) * 0.3;
    stars += star;
  }
  return stars;
}

vec3 drawSun(vec2 uv, vec2 sunPos, float size) {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 diff = (uv - sunPos) * aspect;
  float dist = length(diff);
  float angle = atan(diff.y, diff.x);

  float disc = 1.0 - smoothstep(size * 0.9, size, dist);

  vec3 sunCore = vec3(1.0, 1.0, 0.95);
  vec3 sunEdge = vec3(1.0, 0.9, 0.4);
  float edgeFactor = clamp(dist / size, 0.0, 1.0);
  vec3 sunColor = mix(sunCore, sunEdge, edgeFactor);

  float limbDarkening = 1.0 - pow(clamp(dist / size, 0.0, 1.0), 2.0) * 0.3;
  sunColor *= limbDarkening;

  float glowSize = max(0.1, u_sunGlowSize);
  float scaledDist = dist / glowSize;
  float glow1 = exp(-scaledDist * 8.0) * 0.5;
  float glow2 = exp(-scaledDist * 3.0) * 0.3;
  float glow3 = exp(-scaledDist * 1.5) * 0.15;

  vec3 glowColor = vec3(1.0, 0.8, 0.4);
  float glowTotal = (glow1 + glow2 + glow3) * u_sunGlowIntensity;

  vec3 result = sunColor * disc * 2.0;
  result += glowColor * glowTotal;

  // ---------------------------------------------------------------------------
  // Prismatic flare + rays
  // ---------------------------------------------------------------------------
  // Keep these effects subtle and mostly white — we want "eye optics" more than
  // sci-fi neon. The rainbow shows up as a gentle chromatic fringe on very
  // bright highlights.

  // A thin, slightly prismatic halo ring around the sun.
  float ringCenter = size * 1.15;
  float ringWidth = max(size * 0.35, 0.001);
  float ringMask = smoothstep(size * 0.85, size * 1.05, dist);
  ringMask *= 1.0 - smoothstep(size * 5.0, size * 9.0, dist);

  // Chromatic dispersion grows slightly with distance from the disc.
  float chromaShift = size * (0.012 + u_sunRayIntensity * 0.06);
  chromaShift *= smoothstep(size * 0.9, size * 2.4, dist);

  float ringR = exp(-pow((dist - chromaShift - ringCenter) / ringWidth, 2.0));
  float ringG = exp(-pow((dist - ringCenter) / ringWidth, 2.0));
  float ringB = exp(-pow((dist + chromaShift - ringCenter) / ringWidth, 2.0));

  // Desaturated spectrum-ish tint (mostly white).
  float ringT = clamp((dist - size) / (size * 2.2), 0.0, 1.0);
  vec3 ringSpectral = 0.55 + 0.45 * cos(TAU * (ringT + vec3(0.0, 0.33, 0.67)));
  ringSpectral = clamp(ringSpectral, 0.0, 1.0);
  vec3 ringColor = mix(vec3(1.0), ringSpectral, 0.45);

  float ringIntensity = (ringR + ringG + ringB) / 3.0;
  ringIntensity *= ringMask * u_sunGlowIntensity * 0.025;
  result += ringColor * ringIntensity;

  // Sun rays (diffraction spikes) with gentle shimmer/breath.
  if (u_sunRayCount > 0.0 && u_sunRayIntensity > 0.0) {
    // Rays are only visible close to the disc; bail early for perf.
    if (dist < size * 3.6) {
      float motion = clamp(u_sunRayShimmer, 0.0, 5.0);
      float t = u_time * max(0.0, u_sunRayShimmerSpeed);

      float rayPhase = angle * u_sunRayCount;
      float rayIndex = floor(rayPhase / PI + 0.5);
      float raySeed = hash(vec2(rayIndex, 19.17));

      // Major rays + faint minor spikes (iris/eyelash diffraction).
      float major = pow(abs(cos(rayPhase)), 10.0);
      float minor = pow(abs(cos(rayPhase * 2.0 + raySeed * 2.3)), 22.0) * 0.18;
      float rayShape = max(major, minor);

      // Per-ray breathing (very slow) + along-ray shimmer (slightly faster).
      float breathe =
        1.0 +
        (noise(vec2(t * 0.05, raySeed * 7.0)) - 0.5) * (0.08 * motion);
      float shimmer =
        1.0 +
        (noise(vec2(dist * 12.0 - t * 0.25, raySeed * 23.0)) - 0.5) *
          (0.12 * motion);
      float micro =
        1.0 +
        (noise(vec2(t * 0.6, rayPhase * 0.8)) - 0.5) * (0.06 * motion);

      float rayNoise =
        0.72 +
        0.28 * noise(vec2(rayPhase * 0.35, t * 0.12 + raySeed * 10.0));
      float rayPattern = rayShape * rayNoise;

      float rayStart = smoothstep(size * 0.75, size * 1.25, dist);
      float rayEnd = smoothstep(size * (3.0 * breathe), size * 1.5, dist);

      float rayLengthVar = 0.75 + raySeed * 0.55;
      float maxRayDist = max(0.001, u_sunRayLength * 0.15);
      float rayFalloff = exp(
        -dist * dist / (maxRayDist * maxRayDist * rayLengthVar * breathe)
      );

      float rays = rayPattern * rayFalloff * rayStart * rayEnd * u_sunRayIntensity;
      rays *= shimmer * micro;

      // Chromatic fringe: compute a slightly different falloff per channel.
      float prismMask = smoothstep(size * 1.05, size * 2.6, dist);
      float rayChroma = size * (0.01 + u_sunRayIntensity * 0.05) * prismMask;

      float distR = max(0.0, dist - rayChroma);
      float distB = dist + rayChroma;

      float falloffR = exp(
        -distR * distR / (maxRayDist * maxRayDist * rayLengthVar * breathe)
      );
      float falloffG = rayFalloff;
      float falloffB = exp(
        -distB * distB / (maxRayDist * maxRayDist * rayLengthVar * breathe)
      );

      vec3 rayRGB = vec3(falloffR, falloffG, falloffB) * rayPattern * rayStart * rayEnd;
      float rayAvg = (rayRGB.r + rayRGB.g + rayRGB.b) / 3.0;
      vec3 rayChromaColor = rayRGB / max(rayAvg, 1e-4);

      // Add a very subtle spectrum tint so the fringe reads as "rainbow-like",
      // without turning into a colorful fantasy effect.
      float rayT = clamp((dist - size) / (size * 2.6), 0.0, 1.0);
      vec3 raySpectral = 0.55 + 0.45 * cos(TAU * (rayT + vec3(0.0, 0.33, 0.67)));
      raySpectral = clamp(raySpectral, 0.0, 1.0);
      raySpectral = mix(vec3(1.0), raySpectral, 0.28);

      vec3 rayWarm = vec3(1.0, 0.92, 0.7);
      float prismMix = clamp(0.08 + u_sunRayIntensity * 0.6, 0.0, 0.45) * prismMask;
      vec3 rayColor = mix(rayWarm, rayChromaColor, prismMix);
      rayColor = mix(rayColor, raySpectral, prismMix * 0.65);

      result += rayColor * rays;
    }
  }

  return result;
}

vec3 getSphereNormal(vec2 discUV) {
  float r2 = dot(discUV, discUV);
  if (r2 > 1.0) return vec3(0.0);
  float z = sqrt(1.0 - r2);
  return normalize(vec3(discUV.x, discUV.y, z));
}

vec2 sphereToEquirectangular(vec3 normal) {
  float longitude = atan(normal.x, normal.z);
  float u = longitude / TAU + 0.5;
  float latitude = asin(clamp(normal.y, -1.0, 1.0));
  float v = latitude / PI + 0.5;
  return vec2(u, v);
}

vec3 getMoonSurfaceColor(vec3 normal, vec2 discUV) {
  if (u_hasMoonTexture) {
    vec2 texUV = sphereToEquirectangular(normal);
    return texture(u_moonTexture, texUV).rgb;
  }
  float brightness = 0.7 + fbm(discUV * 5.0, 3) * 0.3;
  return vec3(brightness * 0.85, brightness * 0.83, brightness * 0.8);
}

vec4 drawMoon(vec2 uv, vec2 moonPos, float size, float phase) {
  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  vec2 diff = (uv - moonPos) * aspect;
  float dist = length(diff);

  vec2 discUV = diff / size;
  float discDist = length(discUV);
  float disc = 1.0 - smoothstep(0.95, 1.0, discDist);

  float glowSize = max(0.1, u_moonGlowSize);
  float glowIntensity = u_moonGlowIntensity;

  if (disc < 0.001) {
    float scaledDist = dist / glowSize;
    float glow1 = exp(-scaledDist * 6.0) * 0.15;
    float glow2 = exp(-scaledDist * 2.0) * 0.06;
    vec3 glowColor = vec3(0.8, 0.85, 0.95);
    float phaseAngle = phase * TAU;
    vec3 sunDir = vec3(sin(phaseAngle), 0.0, -cos(phaseAngle));
    float glowPhase = max(0.2, dot(normalize(vec3(discUV, 0.5)), sunDir) * 0.5 + 0.5);
    return vec4(glowColor * (glow1 + glow2) * glowPhase * glowIntensity, 0.0);
  }

  vec3 normal = getSphereNormal(discUV);
  float phaseAngle = phase * TAU;
  vec3 sunDir = vec3(sin(phaseAngle), 0.0, -cos(phaseAngle));
  float NdotL = dot(normal, sunDir);
  float terminator = smoothstep(-0.02, 0.08, NdotL);

  vec3 baseColor = getMoonSurfaceColor(normal, discUV);
  vec3 ambient = baseColor * 0.03;
  vec3 lit = baseColor * terminator;
  vec3 moonSurface = ambient + lit;

  float limbDarkening = 1.0 - pow(discDist, 3.0) * 0.15;
  moonSurface *= limbDarkening;

  float rimLight = pow(1.0 - abs(NdotL), 4.0) * terminator * 0.1;
  moonSurface += vec3(1.0, 0.98, 0.95) * rimLight;

  float scaledDist = dist / glowSize;
  float glow1 = exp(-scaledDist * 6.0) * 0.12;
  float glow2 = exp(-scaledDist * 2.0) * 0.06;
  vec3 glowColor = vec3(0.8, 0.85, 0.95);
  float litAmount = max(0.1, terminator);
  vec3 glow = glowColor * (glow1 + glow2) * litAmount * glowIntensity;

  return vec4(moonSurface * disc + glow, disc);
}

void main() {
  vec2 uv = v_uv;

  vec3 color = getSkyColor(uv, u_timeOfDay);

  // Calculate separate Y positions for sun and moon
  float sunY = getSunY(u_timeOfDay, u_celestialPos.y);
  float moonY = getMoonY(u_timeOfDay, u_celestialPos.y);
  vec2 sunPos = vec2(u_celestialPos.x, sunY);
  vec2 moonPos = vec2(u_celestialPos.x, moonY);

  // Stars visible when moon is up (night time)
  float moonFade = getHorizonFade(moonY);
  if (moonFade > 0.01) {
    float stars = drawStars(uv, u_starDensity, u_time);
    color += vec3(stars) * moonFade;
  }

  // Draw sun with horizon fade
  float sunFade = getHorizonFade(sunY);
  if (sunFade > 0.01) {
    vec3 sun = drawSun(uv, sunPos, u_sunSize);
    color += sun * sunFade;
  }

  // Draw moon with horizon fade
  if (moonFade > 0.01) {
    vec4 moon = drawMoon(uv, moonPos, u_moonSize, u_moonPhase);
    float alpha = moon.a * moonFade;
    color = mix(color, moon.rgb, alpha) + moon.rgb * (1.0 - moon.a) * moonFade;
  }

  fragColor = vec4(color, 1.0);
}
`;

// Pass 2: Clouds (composites over celestial)
const CLOUD_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_sceneTexture;
uniform float u_timeOfDay;
uniform float u_coverage;
uniform float u_density;
uniform float u_softness;
uniform float u_windSpeed;
uniform float u_windAngle;
uniform float u_turbulence;
uniform float u_lightIntensity;
uniform float u_ambientDarkness;
uniform int u_numLayers;
uniform float u_cloudScale;
uniform vec2 u_celestialPos;
uniform float u_celestialSize;
uniform float u_celestialBrightness;
uniform float u_backlightIntensity;

#define PI 3.14159265359

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float cloudLayer(vec2 uv, float time, float layerSeed, float speed, float turbAmount) {
  vec2 wind = vec2(cos(u_windAngle), sin(u_windAngle)) * speed * time;

  // Each layer gets unique offset, scale, and rotation based on seed
  float layerScale = (1.8 + hash(vec2(layerSeed, 0.0)) * 1.2) * u_cloudScale;
  float layerRotation = hash(vec2(layerSeed, 1.0)) * 0.5 - 0.25;
  vec2 layerOffset = vec2(
    hash(vec2(layerSeed, 2.0)) * 100.0,
    hash(vec2(layerSeed, 3.0)) * 100.0
  );

  // Apply rotation
  float c = cos(layerRotation);
  float s = sin(layerRotation);
  vec2 rotatedUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

  vec2 p = rotatedUV * layerScale + wind + layerOffset;

  // Turbulence with layer-specific offset
  float turbSeed = layerSeed * 50.0;
  vec2 turbOffset = vec2(
    fbm(p * 0.5 + time * 0.1 + turbSeed, 4),
    fbm(p * 0.5 + turbSeed + 100.0 + time * 0.1, 4)
  ) * turbAmount;

  float n = fbm(p + turbOffset, 6);
  return n;
}

vec3 cloudLighting(float density, float heightInCloud, float sunAlt, float warmth, float nightFactor, vec2 uv) {
  float daylight = smoothstep(-0.12, 0.1, sunAlt);

  vec3 dayLitColor = vec3(1.0, 0.98, 0.96);
  vec3 sunsetLitColor = vec3(1.0, 0.7, 0.45);
  vec3 nightLitColor = vec3(0.12, 0.14, 0.2);
  vec3 litColor = mix(dayLitColor, sunsetLitColor, warmth);
  litColor = mix(litColor, nightLitColor, nightFactor);

  vec3 dayShadowColor = vec3(0.45, 0.5, 0.6);
  vec3 sunsetShadowColor = vec3(0.35, 0.25, 0.3);
  vec3 nightShadowColor = vec3(0.03, 0.04, 0.07);
  vec3 shadowColor = mix(dayShadowColor, sunsetShadowColor, warmth);
  shadowColor = mix(shadowColor, nightShadowColor, nightFactor);
  shadowColor *= (1.0 - u_ambientDarkness * 0.3);

  float topLight = heightInCloud * max(0.0, sunAlt);
  float sideLight = (1.0 - abs(heightInCloud - 0.5) * 2.0) * (1.0 - sunAlt * 0.5);
  float bottomLight = (1.0 - heightInCloud) * warmth * 0.5;
  float ambientLight = mix(0.03, 0.2, daylight);

  float lightAmount = (topLight * 0.5 + sideLight * 0.3 + bottomLight) * daylight + ambientLight;
  lightAmount = clamp(lightAmount * u_lightIntensity, 0.0, 1.0);

  vec3 cloudColor = mix(shadowColor, litColor, lightAmount);

  float rimLight = pow(density, 0.5) * (1.0 - density) * 4.0;
  vec3 rimColor = mix(vec3(1.0, 1.0, 0.95), vec3(1.0, 0.8, 0.5), warmth);
  rimColor = mix(rimColor, vec3(0.15, 0.18, 0.25), nightFactor);
  float rimStrength = mix(0.1, 0.3, daylight);
  cloudColor += rimColor * rimLight * rimStrength * u_lightIntensity;

  float hotSpot = pow(max(0.0, lightAmount - 0.6) * 2.5, 2.0) * warmth * daylight;
  cloudColor += vec3(1.0, 0.5, 0.2) * hotSpot * 0.4;

  // Celestial body illumination - clouds near sun/moon get backlit
  float aspect = u_resolution.x / u_resolution.y;
  vec2 celestialUV = u_celestialPos;
  vec2 diff = (uv - celestialUV) * vec2(aspect, 1.0);
  float distToCelestial = length(diff);

  // Light transmission - thin clouds scatter light, thick clouds block it
  float transmission = pow(1.0 - density, 2.0); // quadratic falloff - dense clouds block more

  // Backlight glow - extends beyond the celestial body, but blocked by dense clouds
  float glowRadius = u_celestialSize * 6.0;
  float proximityGlow = exp(-distToCelestial * distToCelestial / (glowRadius * glowRadius));
  float backlight = proximityGlow * transmission * u_celestialBrightness;

  // Silver lining - bright edges where thin cloud meets thick cloud near celestial
  // Peaks at medium density (the transition zone), requires proximity to celestial
  float edgeDist = u_celestialSize * 3.0;
  float nearCelestial = smoothstep(edgeDist * 2.5, edgeDist * 0.3, distToCelestial);
  float edgeFactor = density * (1.0 - density) * 4.0; // peaks at 0.5 density
  float silverLining = nearCelestial * edgeFactor * u_celestialBrightness;

  // Color based on day/night, scaled by backlight intensity control
  vec3 backlightColor = mix(vec3(1.0, 0.9, 0.7), vec3(0.7, 0.75, 0.9), nightFactor);
  cloudColor += backlightColor * (backlight * 0.5 + silverLining * 0.8) * u_backlightIntensity;

  return cloudColor;
}

void main() {
  vec2 uv = v_uv;
  vec4 scene = texture(u_sceneTexture, uv);

  float sunAlt = u_timeOfDay < 0.5 ? u_timeOfDay * 2.0 : 2.0 - u_timeOfDay * 2.0;
  sunAlt = sunAlt * 2.0 - 1.0;

  float warmth = 1.0 - smoothstep(0.0, 0.4, sunAlt);
  warmth = warmth * warmth;
  float nightFactor = 1.0 - smoothstep(-0.12, 0.02, sunAlt);
  float daylight = smoothstep(-0.12, 0.1, sunAlt);

  vec3 color = scene.rgb;
  float accumulatedAlpha = 0.0;

  for (int i = u_numLayers - 1; i >= 0; i--) {
    float layerIdx = float(i);
    float layerDepth = layerIdx / max(1.0, float(u_numLayers) - 1.0);

    float layerSeed = layerIdx * 7.31 + 13.0;
    float layerSpeed = u_windSpeed * (0.6 + hash(vec2(layerSeed, 10.0)) * 0.8);
    float layerTurb = u_turbulence * (0.7 + hash(vec2(layerSeed, 11.0)) * 0.6);

    float cloud = cloudLayer(uv, u_time, layerSeed, layerSpeed, layerTurb);

    float threshold = 1.0 - u_coverage;
    cloud = smoothstep(threshold, threshold + u_softness, cloud);

    float heightInCloud = uv.y * 0.6 + cloud * 0.4;
    vec3 cloudColor = cloudLighting(cloud, heightInCloud, sunAlt, warmth, nightFactor, uv);

    vec3 hazeColor = mix(vec3(0.05, 0.06, 0.1), vec3(0.6, 0.7, 0.85), daylight);
    float hazeAmount = layerDepth * layerDepth * 0.5;
    cloudColor = mix(cloudColor, hazeColor, hazeAmount);

    float contrastReduction = 1.0 - layerDepth * 0.3;
    cloudColor = mix(vec3(0.5), cloudColor, contrastReduction);

    float alpha = cloud * u_density * (0.6 + (1.0 - layerDepth) * 0.4);
    color = mix(color, cloudColor, alpha * (1.0 - accumulatedAlpha));
    accumulatedAlpha = accumulatedAlpha + alpha * (1.0 - accumulatedAlpha);
  }

  fragColor = vec4(color, 1.0);
}
`;

// Pass 3: Rain (refracts the scene)
const RAIN_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_sceneTexture;
uniform float u_glassIntensity;
uniform float u_glassZoom;
uniform float u_fallingIntensity;
uniform float u_fallingSpeed;
uniform float u_fallingAngle;
uniform float u_fallingStreakLength;
uniform int u_fallingLayers;
uniform float u_refractionStrength;

#define S(a, b, t) smoothstep(a, b, t)

vec3 N13(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}

float N(float t) {
  return fract(sin(t * 12345.564) * 7658.76);
}

float Saw(float b, float t) {
  return S(0.0, b, t) * S(1.0, b, t);
}

vec2 DropLayer(vec2 uv, float t) {
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 aspect = vec2(6.0, 1.0);
  vec2 grid = aspect * 2.0;
  vec2 id = floor(uv * grid);
  float colShift = N(id.x);
  uv.y += colShift;
  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  float x = n.x - 0.5;
  float y = UV.y * 20.0;
  float wiggle = sin(y + sin(y));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;
  float ti = fract(t + n.z);
  y = (Saw(0.85, ti) - 0.5) * 0.9 + 0.5;
  vec2 p = vec2(x, y);
  float d = length((st - p) * aspect.yx);
  float mainDrop = S(0.4, 0.0, d);
  float r = sqrt(S(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = S(0.23 * r, 0.15 * r * r, cd);
  float trailFront = S(-0.02, 0.02, st.y - y);
  trail *= trailFront * r * r;
  float y2 = fract(UV.y * 10.0) + (st.y - 0.5);
  float dd = length(st - vec2(x, y2));
  float droplets = S(0.3, 0.0, dd);
  float m = mainDrop + droplets * r * trailFront;
  return vec2(m, trail);
}

float StaticDrops(vec2 uv, float t) {
  uv *= 40.0;
  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.7;
  float d = length(uv - p);
  float fade = Saw(0.025, fract(t + n.z));
  float c = S(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
  return c;
}

vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
  float s = StaticDrops(uv, t) * l0;
  vec2 m1 = DropLayer(uv, t) * l1;
  vec2 m2 = DropLayer(uv * 1.85, t) * l2;
  float c = s + m1.x + m2.x;
  c = S(0.3, 1.0, c);
  return vec2(c, max(m1.y * l0, m2.y * l1));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 FallingRainLayer(vec2 uv, float t, float speed, float angle, float streakLen, float scale, float density) {
  vec2 offset = vec2(0.0);
  vec2 p = uv;
  p.x += p.y * angle;
  p *= scale;
  p.y += t * speed;
  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offs = vec2(float(x), float(y));
      vec2 cellId = id + offs;
      float n1 = hash12(cellId);
      if (n1 > density) continue;
      vec2 n2 = vec2(hash12(cellId * 17.23), hash12(cellId * 31.17));
      vec2 dropPos = offs + n2 - 0.5;
      vec2 localUV = gv - dropPos;
      float streakW = 0.025 + n1 * 0.02;
      float streakH = streakLen * (0.4 + hash12(cellId * 7.13) * 0.6);
      float t_pos = (localUV.y + streakH) / (2.0 * streakH);
      t_pos = clamp(t_pos, 0.0, 1.0);
      if (abs(localUV.y) > streakH * 1.2) continue;
      float taper = mix(1.3, 0.4, t_pos * t_pos);
      float width = streakW * taper;
      float core = S(width, width * 0.2, abs(localUV.x));
      float vertFade = S(0.0, 0.1, t_pos) * S(1.0, 0.85, t_pos);
      float streak = core * vertFade;
      if (streak > 0.001) {
        offset.x += localUV.x * streak * 0.5;
        offset.y += (n1 - 0.5) * streak * 0.1;
      }
    }
  }
  return offset;
}

vec2 FallingRain(vec2 uv, float t) {
  vec2 totalOffset = vec2(0.0);
  if (u_fallingIntensity < 0.01) return totalOffset;

  float speed = u_fallingSpeed * 5.0;
  float streakLen = u_fallingStreakLength * 0.3;

  for (int i = 0; i < 6; i++) {
    if (i >= u_fallingLayers) break;
    float layerIdx = float(i);
    float depth = layerIdx / float(max(u_fallingLayers - 1, 1));
    float layerScale = mix(6.0, 30.0, depth);
    float layerSpeed = speed * mix(2.0, 0.5, depth);
    float layerDensity = u_fallingIntensity * mix(0.8, 0.3, depth);
    float layerStrength = mix(1.0, 0.15, depth);
    float layerStreakLen = streakLen * mix(1.5, 0.4, depth);
    float layerAngle = u_fallingAngle * mix(1.0, 0.6, depth);
    vec2 layerOffset = vec2(sin(layerIdx * 73.156) * 3.0, cos(layerIdx * 37.842) * 3.0);
    vec2 layer = FallingRainLayer(uv + layerOffset, t + layerIdx * 0.13, layerSpeed, layerAngle, layerStreakLen, layerScale, layerDensity);
    totalOffset += layer * layerStrength;
  }
  return totalOffset * 0.4;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
  vec2 UV = v_uv;

  uv *= u_glassZoom;
  float t = u_time * 0.2;

  float rainAmount = u_glassIntensity;
  float staticDrops = S(-0.5, 1.0, rainAmount) * 2.0;
  float layer1 = S(0.25, 0.75, rainAmount);
  float layer2 = S(0.0, 0.5, rainAmount);

  vec2 c = Drops(uv, t, staticDrops, layer1, layer2);

  vec2 e = vec2(0.001, 0.0);
  float cx = Drops(uv + e, t, staticDrops, layer1, layer2).x;
  float cy = Drops(uv + e.yx, t, staticDrops, layer1, layer2).x;
  vec2 glassNormal = vec2(cx - c.x, cy - c.x);

  vec2 fallingRainOffset = FallingRain(uv, u_time);

  vec2 totalRefraction = (glassNormal + fallingRainOffset) * u_refractionStrength;

  vec2 refractedUV = UV + totalRefraction;
  refractedUV = clamp(refractedUV, 0.0, 1.0);

  vec3 color = texture(u_sceneTexture, refractedUV).rgb;

  // Subtle specular on rain
  float rainMagnitude = length(fallingRainOffset);
  if (rainMagnitude > 0.001) {
    vec3 refractedLight = texture(u_sceneTexture, refractedUV).rgb;
    float brightness = dot(refractedLight, vec3(0.299, 0.587, 0.114));
    float specular = rainMagnitude * 15.0 * (0.1 + brightness * 0.9);
    color += vec3(0.8, 0.85, 0.95) * specular * 0.3;
  }

  color += vec3(0.1, 0.12, 0.15) * c.x * 0.5;

  fragColor = vec4(color, 1.0);
}
`;

// Pass 4: Lightning (illuminates scene with procedural bolts)
const LIGHTNING_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_sceneTexture;
uniform bool u_enabled;
uniform float u_flashIntensity;
uniform float u_branchDensity;
uniform float u_sceneIllumination;
uniform float u_lastFlashTime;
uniform float u_strikeSeed;

#define MAX_SEGMENTS 32
#define MAX_BRANCHES 16
#define PI 3.14159265359

float easeOutSine(float t) { return sin(t * PI * 0.5); }
float easeInSine(float t) { return 1.0 - cos(t * PI * 0.5); }
float easeInOutSine(float t) { return -(cos(PI * t) - 1.0) * 0.5; }
float easeOutQuad(float t) { return 1.0 - (1.0 - t) * (1.0 - t); }
float easeOutCubic(float t) { float inv = 1.0 - t; return 1.0 - inv * inv * inv; }

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float distToSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 displacedPoint(vec2 start, vec2 end, float t, float seed, float displacementAmt) {
  vec2 basePoint = mix(start, end, t);
  vec2 dir = end - start;
  vec2 perp = normalize(vec2(-dir.y, dir.x));
  float envelope = sin(t * PI);
  float n1 = noise(vec2(t * 8.0, seed * 100.0)) * 2.0 - 1.0;
  float n2 = noise(vec2(t * 16.0, seed * 100.0 + 50.0)) * 2.0 - 1.0;
  float n3 = noise(vec2(t * 32.0, seed * 100.0 + 100.0)) * 2.0 - 1.0;
  float displacement = (n1 * 0.6 + n2 * 0.3 + n3 * 0.1) * envelope * displacementAmt;
  float targetBias = 1.0 - t * 0.3;
  displacement *= targetBias;
  return basePoint + perp * displacement * length(dir);
}

float mainBoltDistance(vec2 uv, vec2 start, vec2 end, float seed, float displacementAmt) {
  float minDist = 999.0;
  vec2 prevPoint = start;
  for (int i = 1; i <= MAX_SEGMENTS; i++) {
    float t = float(i) / float(MAX_SEGMENTS);
    vec2 currPoint = displacedPoint(start, end, t, seed, displacementAmt);
    float d = distToSegment(uv, prevPoint, currPoint);
    minDist = min(minDist, d);
    prevPoint = currPoint;
  }
  return minDist;
}

float branchDistance(vec2 uv, vec2 branchStart, vec2 branchDir, float branchLen, float seed, float displacementAmt) {
  vec2 branchEnd = branchStart + branchDir * branchLen;
  float minDist = 999.0;
  vec2 prevPoint = branchStart;
  for (int i = 1; i <= 12; i++) {
    float t = float(i) / 12.0;
    vec2 currPoint = displacedPoint(branchStart, branchEnd, t, seed, displacementAmt * 0.7);
    float d = distToSegment(uv, prevPoint, currPoint);
    minDist = min(minDist, d);
    prevPoint = currPoint;
  }
  return minDist;
}

vec2 branchesDistance(vec2 uv, vec2 start, vec2 end, float seed, float displacementAmt, float density) {
  float minDist = 999.0;
  float brightness = 0.0;
  vec2 mainDir = normalize(end - start);
  float mainLen = length(end - start);

  for (int i = 0; i < MAX_BRANCHES; i++) {
    float idx = float(i);
    float branchT = 0.15 + hash11(seed + idx * 7.31) * 0.7;
    float branchProb = (1.0 - branchT) * density;
    if (hash11(seed + idx * 3.17) > branchProb) continue;

    vec2 branchStart = displacedPoint(start, end, branchT, seed, displacementAmt);
    float angleOffset = (hash11(seed + idx * 11.13) * 2.0 - 1.0) * 0.6;
    float side = hash11(seed + idx * 5.71) > 0.5 ? 1.0 : -1.0;
    float angle = atan(mainDir.y, mainDir.x) + side * (0.3 + abs(angleOffset) * 0.5);
    vec2 branchDir = vec2(cos(angle), sin(angle));
    float branchLen = mainLen * (0.15 + hash11(seed + idx * 13.37) * 0.25);

    float d = branchDistance(uv, branchStart, branchDir, branchLen, seed + idx * 100.0, displacementAmt);
    if (d < minDist) {
      minDist = d;
      brightness = 0.5 - branchT * 0.2;
    }

    if (density > 0.3 && hash11(seed + idx * 17.19) < density * 0.5) {
      float subT = 0.3 + hash11(seed + idx * 19.23) * 0.4;
      vec2 subStart = branchStart + branchDir * branchLen * subT;
      float subAngle = angle + (hash11(seed + idx * 23.29) * 2.0 - 1.0) * 0.5;
      vec2 subDir = vec2(cos(subAngle), sin(subAngle));
      float subLen = branchLen * 0.4;
      float subD = branchDistance(uv, subStart, subDir, subLen, seed + idx * 200.0, displacementAmt * 0.5);
      if (subD < minDist) {
        minDist = subD;
        brightness = 0.25;
      }
    }
  }
  return vec2(minDist, brightness);
}

vec3 lightningGlow(float dist, float brightness, float intensity, float thickness) {
  float scaledDist = dist / max(thickness, 0.1);
  float core = smoothstep(0.003, 0.0, scaledDist) * brightness;
  float innerGlow = exp(-scaledDist * 150.0) * brightness;
  float outerGlow = exp(-dist * dist * 3000.0) * brightness * thickness;

  vec3 coreColor = vec3(1.0, 1.0, 1.0);
  vec3 innerColor = vec3(0.7, 0.8, 1.0);
  vec3 outerColor = vec3(0.5, 0.5, 0.9);

  vec3 color = coreColor * core * 2.0;
  color += innerColor * innerGlow * 0.8;
  color += outerColor * outerGlow * 0.5;
  return color * intensity;
}

float flashEnvelope(float timeSinceStrike, float duration) {
  if (timeSinceStrike < 0.0 || timeSinceStrike > duration) return 0.0;
  float t = timeSinceStrike / duration;
  float attackT = clamp(t / 0.03, 0.0, 1.0);
  float attack = easeOutCubic(attackT);
  float sustainT = clamp((t - 0.05) / 0.65, 0.0, 1.0);
  float sustain = 1.0 - easeInOutSine(sustainT);
  float decay = exp(-t * 2.0);
  decay = mix(decay, easeOutSine(1.0 - t), 0.3);
  float endT = clamp((t - 0.75) / 0.25, 0.0, 1.0);
  float endFade = 1.0 - easeInSine(endT);
  return attack * max(sustain, decay * 0.4) * endFade;
}

float restrikeEnvelope(float timeSinceStrike, float duration, float seed) {
  float env = flashEnvelope(timeSinceStrike, duration * 0.7);
  if (hash11(seed * 7.7) > 0.7) {
    float restrike1 = flashEnvelope(timeSinceStrike - duration * 0.5, duration * 0.3);
    env = max(env, restrike1 * 0.6);
  }
  if (hash11(seed * 11.3) > 0.85) {
    float restrike2 = flashEnvelope(timeSinceStrike - duration * 0.75, duration * 0.2);
    env = max(env, restrike2 * 0.4);
  }
  return env;
}

void main() {
  vec4 scene = texture(u_sceneTexture, v_uv);

  if (!u_enabled) {
    fragColor = scene;
    return;
  }

  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;

  float timeSinceStrike = u_time - u_lastFlashTime;
  float durationSec = 0.8;

  float flash = restrikeEnvelope(timeSinceStrike, durationSec, u_strikeSeed);
  float afterimageDuration = durationSec * 1.5;
  float afterimageT = clamp(timeSinceStrike / afterimageDuration, 0.0, 1.0);
  float afterimage = timeSinceStrike < 0.0 ? 0.0 : (1.0 - easeInSine(afterimageT));

  float sceneFlash = flash * u_sceneIllumination;
  vec3 color = scene.rgb;
  color += vec3(0.3, 0.32, 0.4) * sceneFlash;

  if (flash > 0.01 || afterimage > 0.01) {
    vec2 strikeHash = hash22(vec2(u_strikeSeed * 123.456, u_strikeSeed * 789.012));
    vec2 boltStart = vec2((0.3 + strikeHash.x * 0.4) * aspect, 1.05);
    vec2 boltEnd = vec2(boltStart.x + (strikeHash.x - 0.5) * 0.4, -0.05);

    float displacementAmt = 0.15;
    float mainDist = mainBoltDistance(uv, boltStart, boltEnd, u_strikeSeed, displacementAmt);
    vec2 branchResult = branchesDistance(uv, boltStart, boltEnd, u_strikeSeed, displacementAmt, u_branchDensity);
    float branchDist = branchResult.x;
    float branchBrightness = branchResult.y;

    float mainThickness = mix(0.2, 1.0, easeOutSine(sqrt(max(flash, 0.0))));
    vec3 afterglowColor = vec3(0.5, 0.45, 0.7);

    vec3 mainCore = lightningGlow(mainDist, easeOutQuad(max(flash, 0.0)), u_flashIntensity, mainThickness);
    float mainAfterglowDist = mainDist * 0.6;
    float mainAfterglowStrength = exp(-mainAfterglowDist * 50.0) * afterimage * 0.5;
    vec3 mainAfterglow = afterglowColor * mainAfterglowStrength;

    float branchThickness = mix(0.15, 1.0, easeOutSine(max(flash, 0.0)));
    vec3 branchCore = lightningGlow(branchDist, branchBrightness * easeOutQuad(max(flash, 0.0)), u_flashIntensity, branchThickness);
    float branchAfterglowDist = branchDist * 0.7;
    float branchAfterglowStrength = exp(-branchAfterglowDist * 80.0) * branchBrightness * afterimage * 0.4;
    vec3 branchAfterglow = afterglowColor * branchAfterglowStrength;

    color += (mainCore + branchCore) * max(flash, 0.0);
    color += (mainAfterglow + branchAfterglow) * afterimage;

    float sourceGlow = exp(-length(uv - boltStart) * 3.0);
    color += vec3(0.4, 0.45, 0.6) * sourceGlow * afterimage * 0.3;
  }

  fragColor = vec4(color, 1.0);
}
`;

// Pass 5: Snow (sophisticated version with flutter, turbulence, sparkle)
const SNOW_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_sceneTexture;
uniform float u_intensity;
uniform int u_layers;
uniform float u_fallSpeed;
uniform float u_windSpeed;
uniform float u_windAngle;
uniform float u_turbulence;
uniform float u_drift;
uniform float u_flutter;
uniform float u_windShear;
uniform float u_flakeSize;
uniform float u_sizeVariation;
uniform float u_opacity;
uniform float u_glowAmount;
uniform float u_sparkle;

#define PI 3.14159265359
#define MAX_LAYERS 6

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 rotate2D(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float snowflakeShape(vec2 uv, float size, float seed, float rotation) {
  vec2 rotatedUV = rotate2D(uv, rotation);
  float dist = length(rotatedUV);
  float circle = smoothstep(size, size * 0.3, dist);
  float angle = atan(rotatedUV.y, rotatedUV.x);
  float hexPattern = 0.5 + 0.5 * cos(angle * 6.0);
  hexPattern = pow(hexPattern, 2.0);
  float crystalAmount = smoothstep(0.02, 0.05, size) * 0.3;
  float shape = mix(circle, circle * (0.7 + hexPattern * 0.3), crystalAmount);
  float glow = exp(-dist * dist / (size * size * 3.0)) * u_glowAmount;
  return shape + glow * 0.4;
}

vec2 getWind(float layerDepth) {
  // Important: keep wind independent of uv to avoid warping the entire field.
  // Per-flake turbulence/drift is applied later (to flakePos) so the result
  // reads like particles, not like a screen-space displacement/refraction map.
  vec2 baseWind = vec2(cos(u_windAngle), 0.0) * u_windSpeed;
  float windResponse = mix(0.3, 1.0, 1.0 - layerDepth);

  // Model "wind shear" as stronger motion in foreground layers rather than a
  // screen-space gradient (which can make the whole effect look bent).
  float shearResponse = 1.0 + u_windShear * (1.0 - layerDepth) * 0.35;

  return baseWind * windResponse * shearResponse;
}

float sparkle(vec2 cellId, float time, float seed) {
  float sparklePhase = hash12(cellId + vec2(seed * 100.0, 0.0)) * 100.0;
  float sparkleFreq = 2.0 + hash12(cellId + vec2(0.0, seed * 100.0)) * 3.0;
  float sparkleWave = sin(time * sparkleFreq + sparklePhase);
  float sparkleIntensity = pow(max(0.0, sparkleWave), 16.0);
  float sparkleProbability = hash12(cellId + vec2(floor(time * 0.5), 0.0));
  sparkleIntensity *= step(0.85, sparkleProbability);
  return sparkleIntensity * u_sparkle;
}

vec3 snowLayer(vec2 uv, float time, float layerIndex, float totalLayers) {
  float depth = layerIndex / max(1.0, totalLayers - 1.0);
  float layerScale = mix(8.0, 40.0, depth);
  float layerSpeed = u_fallSpeed * mix(1.2, 0.4, depth);
  float layerDensity = u_intensity * mix(1.0, 0.5, depth);
  float layerFlakeSize = u_flakeSize * mix(1.5, 0.3, depth);
  float layerOpacity = u_opacity * mix(1.0, 0.4, depth);

  vec2 layerOffset = vec2(
    sin(layerIndex * 73.156) * 10.0,
    cos(layerIndex * 37.842) * 10.0
  );

  vec2 p = (uv + layerOffset) * layerScale;
  p.y += time * layerSpeed * 2.0;

  vec2 baseWind = getWind(depth);
  p.x += time * baseWind.x * 0.3;

  vec2 id = floor(p);
  vec2 gv = fract(p) - 0.5;

  float snow = 0.0;
  float sparkleAccum = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offs = vec2(float(x), float(y));
      vec2 cellId = id + offs;

      float h1 = hash12(cellId);
      vec2 h2 = hash22(cellId);
      float h3 = hash12(cellId + vec2(127.0, 311.0));
      float h4 = hash12(cellId + vec2(271.0, 183.0));

      if (h1 > layerDensity) continue;

      float sizeVar = 1.0 + (h3 - 0.5) * u_sizeVariation;
      float size = layerFlakeSize * sizeVar * 0.04;

      vec2 flakePos = h2 * 0.8 - 0.4;

      float flutterPhase = h3 * PI * 2.0;
      float flutterAmp = u_flutter * 0.15 * (1.0 - depth);
      flakePos.x += sin(time * 3.0 + flutterPhase) * flutterAmp;
      flakePos.y += cos(time * 2.5 + flutterPhase * 1.3) * flutterAmp * 0.5;

      // Per-flake drift (bounded) — avoid bending the whole field by not applying
      // sinusoidal offsets to p (the grid coordinate system).
      float driftPhase = h4 * PI * 2.0 + layerIndex * 1.7;
      flakePos.x += sin(time * 0.55 + driftPhase) * u_drift * 0.18;

      // Per-flake turbulence (bounded) — adds gusty motion without warping UVs.
      float turbFreq = 0.6 + u_turbulence * 1.4;
      vec2 turb = vec2(
        noise(cellId * 0.17 + time * turbFreq),
        noise(cellId.yx * 0.17 + time * turbFreq + 17.0)
      ) - 0.5;
      flakePos += turb * (u_turbulence * 0.22) * (1.0 - depth);

      vec2 localUV = gv - offs - flakePos;

      float rotationSpeed = (1.5 - sizeVar * 0.5) * (0.5 + h4 * 1.0);
      float rotationPhase = h4 * PI * 2.0;
      float rotation = time * rotationSpeed + rotationPhase;

      float flake = snowflakeShape(localUV, size, h1, rotation);
      float flakeSparkle = sparkle(cellId, time, h1) * flake;
      sparkleAccum += flakeSparkle;

      snow += flake * layerOpacity;
    }
  }

  return vec3(snow, sparkleAccum, depth);
}

void main() {
  vec4 scene = texture(u_sceneTexture, v_uv);
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;
  uv.x *= aspect;

  float snow = 0.0;
  float totalSparkle = 0.0;

  for (int i = u_layers - 1; i >= 0; i--) {
    vec3 layerResult = snowLayer(uv, u_time, float(i), float(u_layers));
    snow += layerResult.x;
    totalSparkle += layerResult.y;
  }

  snow = clamp(snow, 0.0, 1.0);
  totalSparkle = clamp(totalSparkle, 0.0, 1.0);

  vec3 snowColor = vec3(0.75, 0.78, 0.85);
  vec3 sparkleColor = vec3(0.9, 0.92, 1.0);

  vec3 color = scene.rgb + snowColor * snow + sparkleColor * totalSparkle;

  fragColor = vec4(color, 1.0);
}
`;

// Final composite (just passes through, but could add post-processing)
const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sceneTexture;

void main() {
  fragColor = texture(u_sceneTexture, v_uv);
}
`;

// =============================================================================
// MATH HELPERS
// =============================================================================

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// =============================================================================
// WEBGL HELPERS
// =============================================================================

const MAX_CONCURRENT_WEATHER_WEBGL_CANVASES = 8;
const allocatedWeatherWebglCanvases = new Set<HTMLCanvasElement>();

function tryAcquireWeatherWebglCanvas(canvas: HTMLCanvasElement): boolean {
  if (allocatedWeatherWebglCanvases.has(canvas)) return true;
  if (
    allocatedWeatherWebglCanvases.size >= MAX_CONCURRENT_WEATHER_WEBGL_CANVASES
  )
    return false;
  allocatedWeatherWebglCanvases.add(canvas);
  return true;
}

function releaseWeatherWebglCanvas(canvas: HTMLCanvasElement): void {
  allocatedWeatherWebglCanvases.delete(canvas);
}

function createShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader | null {
  if (gl.isContextLost()) return null;
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    if (!gl.isContextLost()) {
      const kind =
        type === gl.VERTEX_SHADER
          ? "vertex"
          : type === gl.FRAGMENT_SHADER
            ? "fragment"
            : String(type);
      console.error(`Shader compile error (${kind}):`, info ?? "(no info log)");
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  if (gl.isContextLost()) return null;
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    if (!gl.isContextLost()) {
      console.error("Program link error:", info ?? "(no info log)");
    }
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  // Shaders can be deleted after a successful link.
  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

interface Framebuffer {
  fbo: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

function createFramebuffer(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): Framebuffer | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  if (!fbo) {
    gl.deleteTexture(texture);
    return null;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    if (!gl.isContextLost()) {
      console.error("Framebuffer incomplete:", status);
    }
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return null;
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { fbo, texture, width, height };
}

function resizeFramebuffer(
  gl: WebGL2RenderingContext,
  fb: Framebuffer,
  width: number,
  height: number,
): void {
  if (fb.width === width && fb.height === height) return;

  gl.bindTexture(gl.TEXTURE_2D, fb.texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  gl.bindTexture(gl.TEXTURE_2D, null);

  fb.width = width;
  fb.height = height;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function WeatherEffectsCanvas({
  className,
  dpr: dprProp,
  layers: layersProp,
  celestial: celestialProp,
  cloud: cloudProp,
  rain: rainProp,
  lightning: lightningProp,
  snow: snowProp,
  interactions: interactionsProp,
}: WeatherEffectsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastFlashTimeRef = useRef<number>(-100);
  const nextFlashTimeRef = useRef<number>(0);
  const strikeSeedRef = useRef<number>(0);
  const moonTextureRef = useRef<WebGLTexture | null>(null);
  const moonTextureLoadedRef = useRef<boolean>(false);
  const positionBufferRef = useRef<WebGLBuffer | null>(null);
  const uniformLocationCacheRef = useRef<
    WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>
  >(new WeakMap());
  const isVisibleRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const isContextLostRef = useRef<boolean>(false);
  const initFailedRef = useRef<boolean>(false);
  const hasWebglBudgetSlotRef = useRef<boolean | null>(null);

  // Programs
  const programsRef = useRef<{
    celestial: WebGLProgram | null;
    cloud: WebGLProgram | null;
    rain: WebGLProgram | null;
    lightning: WebGLProgram | null;
    snow: WebGLProgram | null;
    composite: WebGLProgram | null;
  }>({
    celestial: null,
    cloud: null,
    rain: null,
    lightning: null,
    snow: null,
    composite: null,
  });

  // Framebuffers (ping-pong)
  const fbRef = useRef<{
    a: Framebuffer | null;
    b: Framebuffer | null;
  }>({ a: null, b: null });

  // Store props in ref for render loop
  const propsRef = useRef({
    layers: { ...DEFAULT_LAYERS, ...layersProp },
    celestial: { ...DEFAULT_CELESTIAL, ...celestialProp },
    cloud: { ...DEFAULT_CLOUD, ...cloudProp },
    rain: { ...DEFAULT_RAIN, ...rainProp },
    lightning: { ...DEFAULT_LIGHTNING, ...lightningProp },
    snow: { ...DEFAULT_SNOW, ...snowProp },
    interactions: { ...DEFAULT_INTERACTIONS, ...interactionsProp },
    dpr: dprProp,
  });

  propsRef.current = {
    layers: { ...DEFAULT_LAYERS, ...layersProp },
    celestial: { ...DEFAULT_CELESTIAL, ...celestialProp },
    cloud: { ...DEFAULT_CLOUD, ...cloudProp },
    rain: { ...DEFAULT_RAIN, ...rainProp },
    lightning: { ...DEFAULT_LIGHTNING, ...lightningProp },
    snow: { ...DEFAULT_SNOW, ...snowProp },
    interactions: { ...DEFAULT_INTERACTIONS, ...interactionsProp },
    dpr: dprProp,
  };

  const getUniformLocationCached = useCallback(
    (gl: WebGL2RenderingContext, program: WebGLProgram, name: string) => {
      let programCache = uniformLocationCacheRef.current.get(program);
      if (!programCache) {
        programCache = new Map();
        uniformLocationCacheRef.current.set(program, programCache);
      }

      const cached = programCache.get(name);
      if (cached !== undefined) {
        return cached;
      }

      const location = gl.getUniformLocation(program, name);
      programCache.set(name, location);
      return location;
    },
    [],
  );

  const stopRenderLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    isRunningRef.current = false;
  }, []);

  const disposeGL = useCallback(() => {
    stopRenderLoop();

    const gl = glRef.current;
    const isContextLost = isContextLostRef.current;

    if (gl && !isContextLost) {
      // Programs
      for (const program of Object.values(programsRef.current)) {
        if (program) gl.deleteProgram(program);
      }

      // Ping-pong framebuffers + textures
      for (const fb of [fbRef.current.a, fbRef.current.b]) {
        if (!fb) continue;
        gl.deleteFramebuffer(fb.fbo);
        gl.deleteTexture(fb.texture);
      }

      // Moon texture
      if (moonTextureRef.current) {
        gl.deleteTexture(moonTextureRef.current);
      }

      // Fullscreen quad buffer
      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
      }
    }

    // Clear refs regardless (context-loss-safe).
    programsRef.current = {
      celestial: null,
      cloud: null,
      rain: null,
      lightning: null,
      snow: null,
      composite: null,
    };
    fbRef.current = { a: null, b: null };
    moonTextureRef.current = null;
    moonTextureLoadedRef.current = false;
    positionBufferRef.current = null;
    glRef.current = null;
    uniformLocationCacheRef.current = new WeakMap();
  }, [stopRenderLoop]);

  const initGL = useCallback(() => {
    if (initFailedRef.current) return false;

    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (hasWebglBudgetSlotRef.current === false) return false;
    if (hasWebglBudgetSlotRef.current === null) {
      const ok = tryAcquireWeatherWebglCanvas(canvas);
      if (!ok) {
        hasWebglBudgetSlotRef.current = false;
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[WeatherEffectsCanvas] Too many WebGL canvases on the page; rendering this widget without effects.",
          );
        }
        return false;
      }
      hasWebglBudgetSlotRef.current = true;
    }

    // Re-init safely.
    disposeGL();
    isContextLostRef.current = false;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      initFailedRef.current = true;
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[WeatherEffectsCanvas] WebGL2 not supported; rendering without effects.",
        );
      }
      return false;
    }
    glRef.current = gl;
    if (gl.isContextLost()) {
      isContextLostRef.current = true;
      disposeGL();
      return false;
    }

    // Create programs
    programsRef.current.celestial = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      CELESTIAL_FRAGMENT,
    );
    programsRef.current.cloud = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      CLOUD_FRAGMENT,
    );
    programsRef.current.rain = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      RAIN_FRAGMENT,
    );
    programsRef.current.lightning = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      LIGHTNING_FRAGMENT,
    );
    programsRef.current.snow = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      SNOW_FRAGMENT,
    );
    programsRef.current.composite = createProgram(
      gl,
      FULLSCREEN_VERTEX,
      COMPOSITE_FRAGMENT,
    );

    // Require at least a sky + final composite so we can render something.
    if (!programsRef.current.celestial || !programsRef.current.composite) {
      if (gl.isContextLost()) {
        isContextLostRef.current = true;
      } else {
        initFailedRef.current = true;
        console.error("Failed to create required WebGL programs");
      }
      disposeGL();
      return false;
    }

    // Create framebuffers
    const dpr = propsRef.current.dpr ?? window.devicePixelRatio;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    const fbA = createFramebuffer(gl, width, height);
    const fbB = createFramebuffer(gl, width, height);
    if (!fbA || !fbB) {
      if (gl.isContextLost()) {
        isContextLostRef.current = true;
      } else {
        initFailedRef.current = true;
        console.error("Failed to create WebGL framebuffers");
      }
      disposeGL();
      return false;
    }
    fbRef.current.a = fbA;
    fbRef.current.b = fbB;

    // Load moon texture
    const moonTexture = gl.createTexture();
    if (moonTexture) {
      gl.bindTexture(gl.TEXTURE_2D, moonTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([128, 128, 128, 255]),
      );
      moonTextureRef.current = moonTexture;

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        const glCurrent = glRef.current;
        if (!glCurrent || moonTextureRef.current !== moonTexture) return;

        glCurrent.bindTexture(gl.TEXTURE_2D, moonTexture);
        glCurrent.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        );
        glCurrent.generateMipmap(gl.TEXTURE_2D);
        glCurrent.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
        glCurrent.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MAG_FILTER,
          gl.LINEAR,
        );
        glCurrent.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        glCurrent.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_WRAP_T,
          gl.CLAMP_TO_EDGE,
        );
        moonTextureLoadedRef.current = true;
      };
      image.src = "/assets/moon-texture.jpg";
    }

    // Setup fullscreen quad
    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      if (gl.isContextLost()) {
        isContextLostRef.current = true;
      } else {
        initFailedRef.current = true;
        console.error("Failed to create WebGL buffer");
      }
      disposeGL();
      return false;
    }
    positionBufferRef.current = positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Setup vertex attributes for all programs
    for (const program of Object.values(programsRef.current)) {
      if (program) {
        const positionLoc = gl.getAttribLocation(program, "a_position");
        if (positionLoc >= 0) {
          gl.enableVertexAttribArray(positionLoc);
          gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        }
      }
    }

    startTimeRef.current = performance.now();
    return true;
  }, [disposeGL]);

  const render = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const programs = programsRef.current;
    const fb = fbRef.current;
    const props = propsRef.current;

    if (isContextLostRef.current || !isVisibleRef.current) {
      isRunningRef.current = false;
      animationFrameRef.current = 0;
      return;
    }

    if (!gl || !canvas || !fb.a || !fb.b) {
      isRunningRef.current = false;
      return;
    }

    // Resize handling
    const dpr = props.dpr ?? window.devicePixelRatio;
    const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * dpr));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      resizeFramebuffer(gl, fb.a, displayWidth, displayHeight);
      resizeFramebuffer(gl, fb.b, displayWidth, displayHeight);
    }

    const time = (performance.now() - startTimeRef.current) / 1000;

    const u = (program: WebGLProgram, name: string) =>
      getUniformLocationCached(gl, program, name);

    // Lightning auto-trigger
    if (
      props.layers.lightning &&
      props.lightning.enabled &&
      props.lightning.autoMode
    ) {
      if (time >= nextFlashTimeRef.current) {
        lastFlashTimeRef.current = time;
        strikeSeedRef.current = Math.random();
        nextFlashTimeRef.current =
          time + props.lightning.autoInterval * (0.5 + Math.random());
      }
    }

    // Ping-pong framebuffers
    let readFB = fb.a;
    let writeFB = fb.b;

    const swapBuffers = () => {
      const temp = readFB;
      readFB = writeFB;
      writeFB = temp;
    };

    // === PASS 1: Celestial ===
    if (props.layers.celestial && programs.celestial) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.useProgram(programs.celestial);

      const p = props.celestial;
      gl.uniform1f(u(programs.celestial, "u_time"), time);
      gl.uniform2f(
        u(programs.celestial, "u_resolution"),
        displayWidth,
        displayHeight,
      );
      gl.uniform1f(u(programs.celestial, "u_timeOfDay"), p.timeOfDay);
      gl.uniform1f(u(programs.celestial, "u_moonPhase"), p.moonPhase);
      gl.uniform1f(u(programs.celestial, "u_starDensity"), p.starDensity);
      gl.uniform2f(
        u(programs.celestial, "u_celestialPos"),
        p.celestialX,
        p.celestialY,
      );
      gl.uniform1f(u(programs.celestial, "u_sunSize"), p.sunSize);
      gl.uniform1f(u(programs.celestial, "u_moonSize"), p.moonSize);
      gl.uniform1f(
        u(programs.celestial, "u_sunGlowIntensity"),
        p.sunGlowIntensity,
      );
      gl.uniform1f(u(programs.celestial, "u_sunGlowSize"), p.sunGlowSize);
      gl.uniform1f(u(programs.celestial, "u_sunRayCount"), p.sunRayCount);
      gl.uniform1f(u(programs.celestial, "u_sunRayLength"), p.sunRayLength);
      gl.uniform1f(
        u(programs.celestial, "u_sunRayIntensity"),
        p.sunRayIntensity,
      );
      gl.uniform1f(u(programs.celestial, "u_sunRayShimmer"), p.sunRayShimmer);
      gl.uniform1f(
        u(programs.celestial, "u_sunRayShimmerSpeed"),
        p.sunRayShimmerSpeed,
      );
      gl.uniform1f(
        u(programs.celestial, "u_moonGlowIntensity"),
        p.moonGlowIntensity,
      );
      gl.uniform1f(u(programs.celestial, "u_moonGlowSize"), p.moonGlowSize);
      gl.uniform1f(u(programs.celestial, "u_skyBrightness"), p.skyBrightness);
      gl.uniform1f(u(programs.celestial, "u_skySaturation"), p.skySaturation);
      gl.uniform1f(u(programs.celestial, "u_skyContrast"), p.skyContrast);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, moonTextureRef.current);
      gl.uniform1i(u(programs.celestial, "u_moonTexture"), 0);
      gl.uniform1i(
        u(programs.celestial, "u_hasMoonTexture"),
        moonTextureLoadedRef.current ? 1 : 0,
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      swapBuffers();
    } else {
      // Clear to black if no celestial
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      swapBuffers();
    }

    // === PASS 2: Clouds ===
    if (props.layers.clouds && programs.cloud) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.useProgram(programs.cloud);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readFB.texture);
      gl.uniform1i(u(programs.cloud, "u_sceneTexture"), 0);

      const p = props.cloud;
      gl.uniform1f(u(programs.cloud, "u_time"), time);
      gl.uniform2f(
        u(programs.cloud, "u_resolution"),
        displayWidth,
        displayHeight,
      );
      gl.uniform1f(u(programs.cloud, "u_timeOfDay"), props.celestial.timeOfDay);
      gl.uniform1f(u(programs.cloud, "u_coverage"), p.coverage);
      gl.uniform1f(u(programs.cloud, "u_density"), p.density);
      gl.uniform1f(u(programs.cloud, "u_softness"), p.softness);
      gl.uniform1f(u(programs.cloud, "u_windSpeed"), p.windSpeed);
      gl.uniform1f(u(programs.cloud, "u_windAngle"), p.windAngle);
      gl.uniform1f(u(programs.cloud, "u_turbulence"), p.turbulence);
      gl.uniform1f(u(programs.cloud, "u_lightIntensity"), p.lightIntensity);
      gl.uniform1f(u(programs.cloud, "u_ambientDarkness"), p.ambientDarkness);
      gl.uniform1i(u(programs.cloud, "u_numLayers"), p.numLayers);
      gl.uniform1f(u(programs.cloud, "u_cloudScale"), p.cloudScale);

      // Pass celestial position for cloud illumination
      // Calculate actual sun/moon Y positions (must match shader logic)
      const celestialP = props.celestial;
      const t = celestialP.timeOfDay;
      const baseY = celestialP.celestialY;
      const belowHorizon = -0.25;

      // Sun Y: rises 0.18-0.32, sets 0.68-0.82
      const sunRise = smoothstep(0.18, 0.32, t);
      const sunSet = smoothstep(0.68, 0.82, t);
      const sunVisible = sunRise * (1 - sunSet);
      const sunY = belowHorizon + (baseY - belowHorizon) * sunVisible;

      // Moon Y: sets 0.12-0.26, rises 0.74-0.88
      const moonRising = smoothstep(0.74, 0.88, t);
      const moonSetting = 1 - smoothstep(0.12, 0.26, t);
      const moonVisible = Math.max(moonRising, moonSetting);
      const moonY = belowHorizon + (baseY - belowHorizon) * moonVisible;

      // Use whichever body is more visible
      const useSun = sunVisible > moonVisible;
      const celestialY = useSun ? sunY : moonY;
      const celestialSize = useSun ? celestialP.sunSize : celestialP.moonSize;
      const celestialBrightness = useSun
        ? Math.min(1.0, celestialP.sunGlowIntensity * 0.3) * sunVisible
        : Math.min(0.5, celestialP.moonGlowIntensity * 0.15) * moonVisible;
      gl.uniform2f(
        u(programs.cloud, "u_celestialPos"),
        celestialP.celestialX,
        celestialY,
      );
      gl.uniform1f(u(programs.cloud, "u_celestialSize"), celestialSize);
      gl.uniform1f(
        u(programs.cloud, "u_celestialBrightness"),
        celestialBrightness,
      );
      gl.uniform1f(
        u(programs.cloud, "u_backlightIntensity"),
        p.backlightIntensity,
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      swapBuffers();
    }

    // === PASS 3: Rain ===
    if (props.layers.rain && programs.rain) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.useProgram(programs.rain);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readFB.texture);
      gl.uniform1i(u(programs.rain, "u_sceneTexture"), 0);

      const p = props.rain;
      gl.uniform1f(u(programs.rain, "u_time"), time);
      gl.uniform2f(
        u(programs.rain, "u_resolution"),
        displayWidth,
        displayHeight,
      );
      gl.uniform1f(u(programs.rain, "u_glassIntensity"), p.glassIntensity);
      gl.uniform1f(u(programs.rain, "u_glassZoom"), p.glassZoom);
      gl.uniform1f(u(programs.rain, "u_fallingIntensity"), p.fallingIntensity);
      gl.uniform1f(u(programs.rain, "u_fallingSpeed"), p.fallingSpeed);
      gl.uniform1f(u(programs.rain, "u_fallingAngle"), p.fallingAngle);
      gl.uniform1f(
        u(programs.rain, "u_fallingStreakLength"),
        p.fallingStreakLength,
      );
      gl.uniform1i(u(programs.rain, "u_fallingLayers"), p.fallingLayers);
      gl.uniform1f(
        u(programs.rain, "u_refractionStrength"),
        props.interactions.rainRefractionStrength,
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      swapBuffers();
    }

    // === PASS 4: Lightning ===
    if (props.layers.lightning && programs.lightning) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.useProgram(programs.lightning);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readFB.texture);
      gl.uniform1i(u(programs.lightning, "u_sceneTexture"), 0);

      const p = props.lightning;
      gl.uniform1f(u(programs.lightning, "u_time"), time);
      gl.uniform2f(
        u(programs.lightning, "u_resolution"),
        displayWidth,
        displayHeight,
      );
      gl.uniform1i(u(programs.lightning, "u_enabled"), p.enabled ? 1 : 0);
      gl.uniform1f(u(programs.lightning, "u_flashIntensity"), p.flashIntensity);
      gl.uniform1f(u(programs.lightning, "u_branchDensity"), p.branchDensity);
      gl.uniform1f(
        u(programs.lightning, "u_sceneIllumination"),
        props.interactions.lightningSceneIllumination,
      );
      gl.uniform1f(
        u(programs.lightning, "u_lastFlashTime"),
        lastFlashTimeRef.current,
      );
      gl.uniform1f(
        u(programs.lightning, "u_strikeSeed"),
        strikeSeedRef.current,
      );

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      swapBuffers();
    }

    // === PASS 5: Snow ===
    if (props.layers.snow && programs.snow) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFB.fbo);
      gl.viewport(0, 0, displayWidth, displayHeight);
      gl.useProgram(programs.snow);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readFB.texture);
      gl.uniform1i(u(programs.snow, "u_sceneTexture"), 0);

      const p = props.snow;
      gl.uniform1f(u(programs.snow, "u_time"), time);
      gl.uniform2f(
        u(programs.snow, "u_resolution"),
        displayWidth,
        displayHeight,
      );
      gl.uniform1f(u(programs.snow, "u_intensity"), p.intensity);
      gl.uniform1i(u(programs.snow, "u_layers"), p.layers);
      gl.uniform1f(u(programs.snow, "u_fallSpeed"), p.fallSpeed);
      gl.uniform1f(u(programs.snow, "u_windSpeed"), p.windSpeed);
      gl.uniform1f(u(programs.snow, "u_windAngle"), p.windAngle);
      gl.uniform1f(u(programs.snow, "u_turbulence"), p.turbulence);
      gl.uniform1f(u(programs.snow, "u_drift"), p.drift);
      gl.uniform1f(u(programs.snow, "u_flutter"), p.flutter);
      gl.uniform1f(u(programs.snow, "u_windShear"), p.windShear);
      gl.uniform1f(u(programs.snow, "u_flakeSize"), p.flakeSize);
      gl.uniform1f(u(programs.snow, "u_sizeVariation"), p.sizeVariation);
      gl.uniform1f(u(programs.snow, "u_opacity"), p.opacity);
      gl.uniform1f(u(programs.snow, "u_glowAmount"), p.glowAmount);
      gl.uniform1f(u(programs.snow, "u_sparkle"), p.sparkle);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      swapBuffers();
    }

    // === Final: Render to screen ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, displayWidth, displayHeight);

    if (programs.composite) {
      gl.useProgram(programs.composite);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readFB.texture);
      gl.uniform1i(u(programs.composite, "u_sceneTexture"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    if (isVisibleRef.current && !isContextLostRef.current) {
      isRunningRef.current = true;
      animationFrameRef.current = requestAnimationFrame(render);
    } else {
      isRunningRef.current = false;
      animationFrameRef.current = 0;
    }
  }, [getUniformLocationCached]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      isContextLostRef.current = true;
      disposeGL();
    };

    const onContextRestored = () => {
      isContextLostRef.current = false;
      initFailedRef.current = false;
      if (initGL() && isVisibleRef.current) {
        isRunningRef.current = true;
        render();
      }
    };

    canvas.addEventListener("webglcontextlost", onContextLost, {
      passive: false,
    } as AddEventListenerOptions);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              const visible = Boolean(entry?.isIntersecting);
              isVisibleRef.current = visible;

              if (!visible) {
                stopRenderLoop();
                return;
              }

              if (!isRunningRef.current && !isContextLostRef.current) {
                // If we have a valid context, resume. Otherwise re-init.
                if (glRef.current && fbRef.current.a && fbRef.current.b) {
                  isRunningRef.current = true;
                  render();
                } else if (initGL()) {
                  isRunningRef.current = true;
                  render();
                }
              }
            },
            { threshold: 0 },
          )
        : null;

    // If IntersectionObserver isn't available, fall back to always-on rendering.
    if (!observer) {
      isVisibleRef.current = true;
    } else {
      observer.observe(canvas);
    }

    if (!observer) {
      if (initGL() && isVisibleRef.current) {
        isRunningRef.current = true;
        render();
      }
    }

    return () => {
      observer?.disconnect();
      canvas.removeEventListener(
        "webglcontextlost",
        onContextLost as EventListener,
      );
      canvas.removeEventListener(
        "webglcontextrestored",
        onContextRestored as EventListener,
      );
      disposeGL();
      if (hasWebglBudgetSlotRef.current) {
        releaseWeatherWebglCanvas(canvas);
      }
    };
  }, [disposeGL, initGL, render, stopRenderLoop]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
