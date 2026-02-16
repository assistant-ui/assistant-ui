import type { Framebuffer } from "./weather-effect-gl";
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

export type UniformLocationGetter = (
  program: WebGLProgram,
  name: string,
) => WebGLUniformLocation | null;

interface BasePassInput {
  gl: WebGL2RenderingContext;
  displayWidth: number;
  displayHeight: number;
  time: number;
  getUniformLocation: UniformLocationGetter;
}

interface CelestialPassInput extends BasePassInput {
  program: WebGLProgram;
  target: Framebuffer;
  params: CelestialParams;
  moonTexture: WebGLTexture | null;
  moonTextureLoaded: boolean;
}

interface CloudPassInput extends BasePassInput {
  program: WebGLProgram;
  target: Framebuffer;
  sceneTexture: WebGLTexture;
  params: CloudParams;
  celestial: CelestialParams;
}

interface RainPassInput extends BasePassInput {
  program: WebGLProgram;
  target: Framebuffer;
  sceneTexture: WebGLTexture;
  params: RainParams;
  interactions: InteractionParams;
}

interface LightningPassInput extends BasePassInput {
  program: WebGLProgram;
  target: Framebuffer;
  sceneTexture: WebGLTexture;
  params: LightningParams;
  interactions: InteractionParams;
  lastFlashTime: number;
  strikeSeed: number;
}

interface SnowPassInput extends BasePassInput {
  program: WebGLProgram;
  target: Framebuffer;
  sceneTexture: WebGLTexture;
  params: SnowParams;
}

interface CompositePassInput extends BasePassInput {
  program: WebGLProgram;
  sceneTexture: WebGLTexture;
  celestial: CelestialParams;
  interactions: InteractionParams;
  post: PostProcessParams;
  lastFlashTime: number;
  strikeSeed: number;
}

interface CelestialBodyState {
  sunY: number;
  moonY: number;
  sunVisible: number;
  moonVisible: number;
  activeY: number;
  activeSize: number;
  activeBrightness: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function resolveCelestialBodyState(
  celestial: CelestialParams,
): CelestialBodyState {
  const t = celestial.timeOfDay;
  const baseY = celestial.celestialY;
  const belowHorizon = -0.25;

  const sunRise = smoothstep(0.18, 0.32, t);
  const sunSet = smoothstep(0.68, 0.82, t);
  const sunVisible = sunRise * (1 - sunSet);
  const sunY = belowHorizon + (baseY - belowHorizon) * sunVisible;

  const moonRising = smoothstep(0.74, 0.88, t);
  const moonSetting = 1 - smoothstep(0.12, 0.26, t);
  const moonVisible = Math.max(moonRising, moonSetting);
  const moonY = belowHorizon + (baseY - belowHorizon) * moonVisible;

  const useSun = sunVisible > moonVisible;
  const activeY = useSun ? sunY : moonY;
  const activeSize = useSun ? celestial.sunSize : celestial.moonSize;
  const activeBrightness = useSun
    ? Math.min(1.0, celestial.sunGlowIntensity * 0.3) * sunVisible
    : Math.min(0.5, celestial.moonGlowIntensity * 0.15) * moonVisible;

  return {
    sunY,
    moonY,
    sunVisible,
    moonVisible,
    activeY,
    activeSize,
    activeBrightness,
  };
}

function bindOffscreenPass(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  target: Framebuffer,
  width: number,
  height: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.viewport(0, 0, width, height);
  gl.useProgram(program);
}

function bindSceneTexture(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  sceneTexture: WebGLTexture,
  getUniformLocation: UniformLocationGetter,
): void {
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
  gl.uniform1i(getUniformLocation(program, "u_sceneTexture"), 0);
}

export function clearOffscreenPass(
  gl: WebGL2RenderingContext,
  target: Framebuffer,
  displayWidth: number,
  displayHeight: number,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
  gl.viewport(0, 0, displayWidth, displayHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export function renderCelestialPass({
  gl,
  program,
  target,
  displayWidth,
  displayHeight,
  time,
  params,
  moonTexture,
  moonTextureLoaded,
  getUniformLocation,
}: CelestialPassInput): void {
  bindOffscreenPass(gl, program, target, displayWidth, displayHeight);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1f(getUniformLocation(program, "u_timeOfDay"), params.timeOfDay);
  gl.uniform1f(getUniformLocation(program, "u_moonPhase"), params.moonPhase);
  gl.uniform1f(
    getUniformLocation(program, "u_starDensity"),
    params.starDensity,
  );
  gl.uniform2f(
    getUniformLocation(program, "u_celestialPos"),
    params.celestialX,
    params.celestialY,
  );
  gl.uniform1f(getUniformLocation(program, "u_sunSize"), params.sunSize);
  gl.uniform1f(getUniformLocation(program, "u_moonSize"), params.moonSize);
  gl.uniform1f(
    getUniformLocation(program, "u_sunGlowIntensity"),
    params.sunGlowIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunGlowSize"),
    params.sunGlowSize,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunRayCount"),
    params.sunRayCount,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunRayLength"),
    params.sunRayLength,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunRayIntensity"),
    params.sunRayIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunRayShimmer"),
    params.sunRayShimmer,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sunRayShimmerSpeed"),
    params.sunRayShimmerSpeed,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_moonGlowIntensity"),
    params.moonGlowIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_moonGlowSize"),
    params.moonGlowSize,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_skyBrightness"),
    params.skyBrightness,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_skySaturation"),
    params.skySaturation,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_skyContrast"),
    params.skyContrast,
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, moonTexture);
  gl.uniform1i(getUniformLocation(program, "u_moonTexture"), 0);
  gl.uniform1i(
    getUniformLocation(program, "u_hasMoonTexture"),
    moonTextureLoaded ? 1 : 0,
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderCloudPass({
  gl,
  program,
  target,
  sceneTexture,
  displayWidth,
  displayHeight,
  time,
  params,
  celestial,
  getUniformLocation,
}: CloudPassInput): void {
  bindOffscreenPass(gl, program, target, displayWidth, displayHeight);
  bindSceneTexture(gl, program, sceneTexture, getUniformLocation);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1f(getUniformLocation(program, "u_timeOfDay"), celestial.timeOfDay);
  gl.uniform1f(getUniformLocation(program, "u_coverage"), params.coverage);
  gl.uniform1f(getUniformLocation(program, "u_density"), params.density);
  gl.uniform1f(getUniformLocation(program, "u_softness"), params.softness);
  gl.uniform1f(getUniformLocation(program, "u_windSpeed"), params.windSpeed);
  gl.uniform1f(getUniformLocation(program, "u_windAngle"), params.windAngle);
  gl.uniform1f(getUniformLocation(program, "u_turbulence"), params.turbulence);
  gl.uniform1f(
    getUniformLocation(program, "u_lightIntensity"),
    params.lightIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_ambientDarkness"),
    params.ambientDarkness,
  );
  gl.uniform1i(getUniformLocation(program, "u_numLayers"), params.numLayers);
  gl.uniform1f(getUniformLocation(program, "u_cloudScale"), params.cloudScale);

  const bodies = resolveCelestialBodyState(celestial);

  gl.uniform2f(
    getUniformLocation(program, "u_celestialPos"),
    celestial.celestialX,
    bodies.activeY,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_celestialSize"),
    bodies.activeSize,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_celestialBrightness"),
    bodies.activeBrightness,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_backlightIntensity"),
    params.backlightIntensity,
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderRainPass({
  gl,
  program,
  target,
  sceneTexture,
  displayWidth,
  displayHeight,
  time,
  params,
  interactions,
  getUniformLocation,
}: RainPassInput): void {
  bindOffscreenPass(gl, program, target, displayWidth, displayHeight);
  bindSceneTexture(gl, program, sceneTexture, getUniformLocation);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_glassIntensity"),
    params.glassIntensity,
  );
  gl.uniform1f(getUniformLocation(program, "u_glassZoom"), params.glassZoom);
  gl.uniform1f(
    getUniformLocation(program, "u_fallingIntensity"),
    params.fallingIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_fallingSpeed"),
    params.fallingSpeed,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_fallingAngle"),
    params.fallingAngle,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_fallingStreakLength"),
    params.fallingStreakLength,
  );
  gl.uniform1i(
    getUniformLocation(program, "u_fallingLayers"),
    params.fallingLayers,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_refractionStrength"),
    interactions.rainRefractionStrength,
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function isLightningPassActive(
  layers: LayerToggles,
  params: LightningParams,
  program: WebGLProgram | null,
  time: number,
  lastFlashTime: number,
): boolean {
  if (!layers.lightning || !program || !params.enabled) {
    return false;
  }

  const lightningDurationSec = 0.8;
  const lightningAfterimageDuration = lightningDurationSec * 1.5;
  const lightningTimeSinceStrike = time - lastFlashTime;

  return (
    lightningTimeSinceStrike >= 0 &&
    lightningTimeSinceStrike <= lightningAfterimageDuration
  );
}

export function renderLightningPass({
  gl,
  program,
  target,
  sceneTexture,
  displayWidth,
  displayHeight,
  time,
  params,
  interactions,
  lastFlashTime,
  strikeSeed,
  getUniformLocation,
}: LightningPassInput): void {
  bindOffscreenPass(gl, program, target, displayWidth, displayHeight);
  bindSceneTexture(gl, program, sceneTexture, getUniformLocation);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1i(
    getUniformLocation(program, "u_enabled"),
    params.enabled ? 1 : 0,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_flashIntensity"),
    params.flashIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_branchDensity"),
    params.branchDensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_sceneIllumination"),
    interactions.lightningSceneIllumination,
  );
  gl.uniform1f(getUniformLocation(program, "u_lastFlashTime"), lastFlashTime);
  gl.uniform1f(getUniformLocation(program, "u_strikeSeed"), strikeSeed);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderSnowPass({
  gl,
  program,
  target,
  sceneTexture,
  displayWidth,
  displayHeight,
  time,
  params,
  getUniformLocation,
}: SnowPassInput): void {
  bindOffscreenPass(gl, program, target, displayWidth, displayHeight);
  bindSceneTexture(gl, program, sceneTexture, getUniformLocation);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1f(getUniformLocation(program, "u_intensity"), params.intensity);
  gl.uniform1i(getUniformLocation(program, "u_layers"), params.layers);
  gl.uniform1f(getUniformLocation(program, "u_fallSpeed"), params.fallSpeed);
  gl.uniform1f(getUniformLocation(program, "u_windSpeed"), params.windSpeed);
  gl.uniform1f(getUniformLocation(program, "u_windAngle"), params.windAngle);
  gl.uniform1f(getUniformLocation(program, "u_turbulence"), params.turbulence);
  gl.uniform1f(getUniformLocation(program, "u_drift"), params.drift);
  gl.uniform1f(getUniformLocation(program, "u_flutter"), params.flutter);
  gl.uniform1f(getUniformLocation(program, "u_windShear"), params.windShear);
  gl.uniform1f(getUniformLocation(program, "u_flakeSize"), params.flakeSize);
  gl.uniform1f(
    getUniformLocation(program, "u_sizeVariation"),
    params.sizeVariation,
  );
  gl.uniform1f(getUniformLocation(program, "u_opacity"), params.opacity);
  gl.uniform1f(getUniformLocation(program, "u_glowAmount"), params.glowAmount);
  gl.uniform1f(getUniformLocation(program, "u_sparkle"), params.sparkle);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderCompositePass({
  gl,
  program,
  sceneTexture,
  displayWidth,
  displayHeight,
  time,
  celestial,
  interactions,
  post,
  lastFlashTime,
  strikeSeed,
  getUniformLocation,
}: CompositePassInput): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, displayWidth, displayHeight);
  gl.useProgram(program);
  bindSceneTexture(gl, program, sceneTexture, getUniformLocation);

  gl.uniform1f(getUniformLocation(program, "u_time"), time);
  gl.uniform2f(
    getUniformLocation(program, "u_resolution"),
    displayWidth,
    displayHeight,
  );
  gl.uniform1f(getUniformLocation(program, "u_timeOfDay"), celestial.timeOfDay);

  const bodies = resolveCelestialBodyState(celestial);
  gl.uniform2f(
    getUniformLocation(program, "u_sunPos"),
    celestial.celestialX,
    bodies.sunY,
  );
  gl.uniform1f(getUniformLocation(program, "u_sunVisible"), bodies.sunVisible);

  gl.uniform1f(getUniformLocation(program, "u_lastFlashTime"), lastFlashTime);
  gl.uniform1f(getUniformLocation(program, "u_strikeSeed"), strikeSeed);
  gl.uniform1f(
    getUniformLocation(program, "u_lightningSceneIllumination"),
    interactions.lightningSceneIllumination,
  );

  gl.uniform1i(
    getUniformLocation(program, "u_postEnabled"),
    post.enabled ? 1 : 0,
  );

  gl.uniform1f(getUniformLocation(program, "u_haze"), post.haze);
  gl.uniform1f(getUniformLocation(program, "u_hazeHorizon"), post.hazeHorizon);
  gl.uniform1f(
    getUniformLocation(program, "u_hazeDesaturation"),
    post.hazeDesaturation,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_hazeContrast"),
    post.hazeContrast,
  );

  gl.uniform1f(
    getUniformLocation(program, "u_bloomIntensity"),
    post.bloomIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_bloomThreshold"),
    post.bloomThreshold,
  );
  gl.uniform1f(getUniformLocation(program, "u_bloomKnee"), post.bloomKnee);
  gl.uniform1f(getUniformLocation(program, "u_bloomRadius"), post.bloomRadius);
  gl.uniform1f(
    getUniformLocation(program, "u_bloomTapScale"),
    post.bloomTapScale,
  );

  gl.uniform1f(
    getUniformLocation(program, "u_exposureIntensity"),
    post.exposureIntensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_exposureDesaturation"),
    post.exposureDesaturation,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_exposureRecovery"),
    post.exposureRecovery,
  );

  gl.uniform1f(
    getUniformLocation(program, "u_godRayIntensity"),
    post.godRayIntensity,
  );
  gl.uniform1f(getUniformLocation(program, "u_godRayDecay"), post.godRayDecay);
  gl.uniform1f(
    getUniformLocation(program, "u_godRayDensity"),
    post.godRayDensity,
  );
  gl.uniform1f(
    getUniformLocation(program, "u_godRayWeight"),
    post.godRayWeight,
  );
  gl.uniform1i(
    getUniformLocation(program, "u_godRaySamples"),
    Math.max(0, Math.min(32, Math.floor(post.godRaySamples))),
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
