"use client";

// Extracted from weather-effects-canvas.tsx to keep render logic readable.
// Shader source order is preserved to avoid behavior changes.

export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
in vec4 a_position;
out vec2 v_uv;

void main() {
  gl_Position = a_position;
  v_uv = a_position.xy * 0.5 + 0.5;
}
`;

// Pass 1: Celestial (sky, sun, moon, stars)
export const CELESTIAL_FRAGMENT = /* glsl */ `#version 300 es
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
#define GODRAY_MAX_SAMPLES 32
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

  // Alpha is reserved for a cloud-occlusion mask (used by post-processing like
  // crepuscular rays). The celestial pass contains no cloud coverage, so it
  // writes 0.
  fragColor = vec4(color, 0.0);
}
`;

// Pass 2: Clouds (composites over celestial)
export const CLOUD_FRAGMENT = /* glsl */ `#version 300 es
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

  // Preserve cloud opacity as alpha so later passes can keep the mask intact
  // (for god rays / atmospheric post-processing).
  fragColor = vec4(color, accumulatedAlpha);
}
`;

// Pass 3: Rain (refracts the scene)
export const RAIN_FRAGMENT = /* glsl */ `#version 300 es
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

  vec4 scene = texture(u_sceneTexture, refractedUV);
  vec3 color = scene.rgb;

  // Subtle specular on rain
  float rainMagnitude = length(fallingRainOffset);
  if (rainMagnitude > 0.001) {
    float brightness = dot(scene.rgb, vec3(0.299, 0.587, 0.114));
    float specular = rainMagnitude * 15.0 * (0.1 + brightness * 0.9);
    color += vec3(0.8, 0.85, 0.95) * specular * 0.3;
  }

  color += vec3(0.1, 0.12, 0.15) * c.x * 0.5;

  fragColor = vec4(color, scene.a);
}
`;

// Pass 4: Lightning (illuminates scene with procedural bolts)
export const LIGHTNING_FRAGMENT = /* glsl */ `#version 300 es
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

  vec3 color = scene.rgb;

  if (flash > 0.01 || afterimage > 0.01) {
    vec2 strikeHash = hash22(vec2(u_strikeSeed * 123.456, u_strikeSeed * 789.012));
    vec2 boltStart = vec2((0.3 + strikeHash.x * 0.4) * aspect, 1.05);
    vec2 boltEnd = vec2(boltStart.x + (strikeHash.x - 0.5) * 0.4, -0.05);

    float straightDist = distToSegment(uv, boltStart, boltEnd);

    // Always apply the broad source glow (cheap). If this is inside the early-out
    // region it will get hard-clipped and look like a visible “container” around
    // the bolt.
    float sourceGlow = exp(-length(uv - boltStart) * 3.0);
    color += vec3(0.4, 0.45, 0.6) * sourceGlow * afterimage * 0.3;

    // Cheap early-out: most pixels are far from the bolt path.
    // This avoids running the expensive segment/branch distance loops when the
    // contribution would be effectively zero.
    float distLimit = 0.18 + u_branchDensity * 0.25 + u_flashIntensity * 0.05;
    float feather = 0.08;
    float region = 1.0 - smoothstep(distLimit - feather, distLimit, straightDist);
    if (region <= 0.0005) {
      fragColor = vec4(color, scene.a);
      return;
    }

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

    color += (mainCore + branchCore) * max(flash, 0.0) * region;
    color += (mainAfterglow + branchAfterglow) * afterimage * region;
  }

  fragColor = vec4(color, scene.a);
}
`;

// Pass 5: Snow (sophisticated version with flutter, turbulence, sparkle)
export const SNOW_FRAGMENT = /* glsl */ `#version 300 es
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

  fragColor = vec4(color, scene.a);
}
`;

// Final composite: post-processing (atmosphere + camera response)
export const COMPOSITE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_sceneTexture;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_timeOfDay;
uniform vec2 u_sunPos;
uniform float u_sunVisible;
uniform float u_lastFlashTime;
uniform float u_strikeSeed;
uniform float u_lightningSceneIllumination;

uniform bool u_postEnabled;

// Aerial perspective / haze
uniform float u_haze;
uniform float u_hazeHorizon;
uniform float u_hazeDesaturation;
uniform float u_hazeContrast;

// Bloom / glare
uniform float u_bloomIntensity;
uniform float u_bloomThreshold;
uniform float u_bloomKnee;
uniform float u_bloomRadius;
uniform float u_bloomTapScale;

// Exposure response (lightning)
uniform float u_exposureIntensity;
uniform float u_exposureDesaturation;
uniform float u_exposureRecovery;

// Crepuscular rays
uniform float u_godRayIntensity;
uniform float u_godRayDecay;
uniform float u_godRayDensity;
uniform float u_godRayWeight;
uniform int u_godRaySamples;

#define PI 3.14159265359
#define GODRAY_MAX_SAMPLES 32

float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// -----------------------------------------------------------------------------
// Lightning flash envelope (mirrors lightning pass timing)
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// Post-process building blocks
// -----------------------------------------------------------------------------
float getSunAltitudeFromTimeOfDay(float timeOfDay) {
  // 0..1 timeOfDay -> -1..1 altitude (mirrors cloud/celestial assumptions)
  float sunAlt = timeOfDay < 0.5 ? timeOfDay * 2.0 : 2.0 - timeOfDay * 2.0;
  return sunAlt * 2.0 - 1.0;
}

vec3 applyHaze(vec3 color, vec2 uv) {
  float haze = saturate(u_haze);
  if (haze <= 0.0001) return color;

  float horizon = pow(1.0 - uv.y, 1.8);
  float hazeWeight = haze * mix(1.0, horizon, saturate(u_hazeHorizon));

  // Slight horizon lift (mix towards a sky-tinted haze color).
  float sunAlt = getSunAltitudeFromTimeOfDay(u_timeOfDay);
  float daylight = smoothstep(-0.12, 0.1, sunAlt);
  vec3 hazeDay = vec3(0.60, 0.70, 0.85);
  vec3 hazeNight = vec3(0.06, 0.07, 0.10);
  vec3 hazeColor = mix(hazeNight, hazeDay, daylight);
  color = mix(color, hazeColor, hazeWeight * 0.55);

  // Contrast compression (towards mid gray).
  float contrast = saturate(1.0 - hazeWeight * saturate(u_hazeContrast));
  color = mix(vec3(0.5), color, contrast);

  // Slight desaturation.
  float gray = luminance(color);
  float sat = saturate(1.0 - hazeWeight * saturate(u_hazeDesaturation));
  color = mix(vec3(gray), color, sat);

  return color;
}

vec3 bloomTap(vec2 uv) {
  vec3 c = texture(u_sceneTexture, clamp(uv, 0.0, 1.0)).rgb;
  float l = luminance(c);
  float knee = max(0.0001, u_bloomKnee);
  float m = smoothstep(u_bloomThreshold, u_bloomThreshold + knee, l);
  return c * m;
}

vec3 computeBloom(vec2 uv) {
  float intensity = u_bloomIntensity;
  if (intensity <= 0.0001) return vec3(0.0);

  vec2 texel = 1.0 / max(u_resolution, vec2(1.0));
  // Interpret bloomRadius as a scene-relative scalar, not literal pixels.
  // This keeps the control meaningful across widget sizes and DPR.
  float radiusPx = max(0.0, u_bloomRadius) * (u_resolution.y * 0.02);
  radiusPx *= max(0.25, u_bloomTapScale);
  vec2 d = texel * radiusPx;

  // 9-tap blur (center + 4 cardinal + 4 diagonal). Weights sum to 1.
  vec3 sum = vec3(0.0);
  sum += bloomTap(uv) * 0.20;
  sum += bloomTap(uv + vec2( d.x, 0.0)) * 0.12;
  sum += bloomTap(uv + vec2(-d.x, 0.0)) * 0.12;
  sum += bloomTap(uv + vec2(0.0,  d.y)) * 0.12;
  sum += bloomTap(uv + vec2(0.0, -d.y)) * 0.12;
  sum += bloomTap(uv + vec2( d.x,  d.y)) * 0.08;
  sum += bloomTap(uv + vec2(-d.x,  d.y)) * 0.08;
  sum += bloomTap(uv + vec2( d.x, -d.y)) * 0.08;
  sum += bloomTap(uv + vec2(-d.x, -d.y)) * 0.08;

  return sum * intensity;
}

vec3 applyExposureResponse(vec3 color, float flashStrength) {
  if (flashStrength <= 0.0001) return color;

  // Treat flashStrength as already “intensity-scaled” (so the UI sliders are
  // predictable). Use a smooth, LDR-friendly curve that still brightens values
  // below 1.0 (Reinhard can cancel out gains for sub-1 values).
  float t = saturate(flashStrength);
  float gain = 1.0 + flashStrength * 2.2;
  vec3 lifted = color * gain;
  vec3 tonemapped = 1.0 - exp(-lifted);

  vec3 outColor = mix(color, tonemapped, t);

  // Subtle desaturation at peak flash.
  float gray = luminance(outColor);
  float desat = saturate(u_exposureDesaturation) * t;
  outColor = mix(outColor, vec3(gray), desat);

  // A tiny “white crush” at peak helps it read as sensor saturation.
  outColor = mix(outColor, vec3(1.0), t * 0.06);

  return outColor;
}

vec3 computeGodRays(vec2 uv) {
  if (u_godRayIntensity <= 0.0001) return vec3(0.0);
  if (u_godRaySamples <= 0) return vec3(0.0);
  if (u_sunVisible <= 0.001) return vec3(0.0);

  float sunAlt = getSunAltitudeFromTimeOfDay(u_timeOfDay);
  float daylight = smoothstep(-0.12, 0.1, sunAlt);
  // Crepuscular rays are most believable when the sun is low. This gating also
  // prevents noon blowout even if the user cranks u_godRayIntensity.
  float lowSun = 1.0 - smoothstep(0.25, 0.75, max(0.0, sunAlt));

  // Clamp sun position to sampling domain; if it's far off-screen, rays look odd.
  vec2 sunUV = clamp(u_sunPos, vec2(-0.25), vec2(1.25));
  vec2 delta = (uv - sunUV) * (u_godRayDensity / float(u_godRaySamples));

  vec2 coord = uv;
  float illuminationDecay = 1.0;
  float accum = 0.0;

  // Hard cap for WebGL loop constraints.
  for (int i = 0; i < GODRAY_MAX_SAMPLES; i++) {
    if (i >= u_godRaySamples) break;
    coord -= delta;
    vec4 s = texture(u_sceneTexture, clamp(coord, 0.0, 1.0));

    // Alpha encodes cloud opacity (0 = clear, 1 = fully occluded).
    float transmittance = 1.0 - saturate(s.a);
    float sampleLum = luminance(s.rgb);

    // Require some brightness along the path so rays read like “sunlight leaking”.
    // Use a high threshold so we don’t integrate the entire bright sky, which
    // can quickly wash the scene to white at midday.
    float brightMask = saturate((sampleLum - 0.85) / 0.15);
    brightMask *= brightMask;
    float raySample = transmittance * brightMask;

    accum += raySample * illuminationDecay * u_godRayWeight;
    illuminationDecay *= u_godRayDecay;
  }

  // Color: warm daylight shafts.
  vec3 rayColor = mix(vec3(0.7, 0.72, 0.8), vec3(1.0, 0.92, 0.75), daylight);

  float intensity = u_godRayIntensity * saturate(u_sunVisible) * daylight * lowSun;
  return rayColor * accum * intensity;
}

void main() {
  vec4 scene = texture(u_sceneTexture, v_uv);
  vec3 color = scene.rgb;

  if (!u_postEnabled) {
    fragColor = vec4(color, 1.0);
    return;
  }

  // Rays first so they can be bloomed/overexposed later.
  color += computeGodRays(v_uv);

  // Bloom/glare (forward scatter).
  color += computeBloom(v_uv);

  // Lightning-driven exposure response (global camera feel).
  float flashStrength = 0.0;
  if (u_exposureIntensity > 0.0001) {
    float timeSinceStrike = u_time - u_lastFlashTime;
    float durationSec = 0.8;

    float f = restrikeEnvelope(timeSinceStrike, durationSec, u_strikeSeed);
    float afterimageDuration = durationSec * 1.5;
    // Guard against 0 recovery which would “stick” the afterimage.
    float afterT = clamp((timeSinceStrike * max(0.05, u_exposureRecovery)) / afterimageDuration, 0.0, 1.0);
    float afterimage = timeSinceStrike < 0.0 ? 0.0 : (1.0 - easeInSine(afterT));

    // Legacy “scene illumination” (kept separate from exposure so tuning the
    // camera response doesn’t get unintentionally suppressed).
    float sceneFlash = f * max(0.0, u_lightningSceneIllumination);
    color += vec3(0.3, 0.32, 0.4) * sceneFlash;

    // Exposure response: controlled directly by u_exposureIntensity.
    // Keep the tail subtle; flash does the heavy lifting.
    flashStrength = f * u_exposureIntensity;
    flashStrength = max(flashStrength, afterimage * u_exposureIntensity * 0.12);
    color = applyExposureResponse(color, flashStrength);
  }

  // Aerial perspective / haze as the final “air” grade.
  color = applyHaze(color, v_uv);

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
