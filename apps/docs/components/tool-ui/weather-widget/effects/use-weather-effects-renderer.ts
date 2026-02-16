"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  releaseWeatherWebglBudgetSlotOnInitFailure,
  releaseWeatherWebglCanvasBudgetSlot,
  tryAcquireWeatherWebglCanvasBudgetSlot,
} from "./weather-webgl-budget";
import {
  CELESTIAL_FRAGMENT,
  CLOUD_FRAGMENT,
  COMPOSITE_FRAGMENT,
  FULLSCREEN_VERTEX,
  LIGHTNING_FRAGMENT,
  RAIN_FRAGMENT,
  SNOW_FRAGMENT,
} from "./weather-effect-shaders";
import {
  createFramebuffer,
  createProgram,
  resizeFramebuffer,
  type Framebuffer,
} from "./weather-effect-gl";
import {
  clearOffscreenPass,
  isLightningPassActive,
  renderCelestialPass,
  renderCloudPass,
  renderCompositePass,
  renderLightningPass,
  renderRainPass,
  renderSnowPass,
} from "./weather-effect-render-passes";
import type { ResolvedWeatherEffectsCanvasProps } from "./weather-effects-types";

interface WeatherEffectsPrograms {
  celestial: WebGLProgram | null;
  cloud: WebGLProgram | null;
  rain: WebGLProgram | null;
  lightning: WebGLProgram | null;
  snow: WebGLProgram | null;
  composite: WebGLProgram | null;
}

interface InitFailureOptions {
  canvas: HTMLCanvasElement;
  contextLost?: boolean;
  markInitFailed?: boolean;
  warnMessage?: string;
  errorMessage?: string;
}

export function useWeatherEffectsRenderer(
  props: ResolvedWeatherEffectsCanvasProps,
) {
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

  const propsRef = useRef(props);
  propsRef.current = props;

  const programsRef = useRef<WeatherEffectsPrograms>({
    celestial: null,
    cloud: null,
    rain: null,
    lightning: null,
    snow: null,
    composite: null,
  });

  const fbRef = useRef<{
    a: Framebuffer | null;
    b: Framebuffer | null;
  }>({ a: null, b: null });

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

  const releaseBudgetSlot = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas && hasWebglBudgetSlotRef.current) {
      releaseWeatherWebglCanvasBudgetSlot(canvas);
    }
    hasWebglBudgetSlotRef.current = null;
  }, []);

  const disposeGL = useCallback(() => {
    stopRenderLoop();

    const gl = glRef.current;
    const isContextLost = isContextLostRef.current;

    if (gl && !isContextLost) {
      for (const program of Object.values(programsRef.current)) {
        if (program) gl.deleteProgram(program);
      }

      for (const fb of [fbRef.current.a, fbRef.current.b]) {
        if (!fb) continue;
        gl.deleteFramebuffer(fb.fbo);
        gl.deleteTexture(fb.texture);
      }

      if (moonTextureRef.current) {
        gl.deleteTexture(moonTextureRef.current);
      }

      if (positionBufferRef.current) {
        gl.deleteBuffer(positionBufferRef.current);
      }
    }

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

  const failInit = useCallback(
    ({
      canvas,
      contextLost = false,
      markInitFailed = true,
      warnMessage,
      errorMessage,
    }: InitFailureOptions): false => {
      if (contextLost) {
        isContextLostRef.current = true;
      }

      if (markInitFailed) {
        initFailedRef.current = true;
      }

      if (errorMessage) {
        console.error(errorMessage);
      }

      if (warnMessage && process.env.NODE_ENV !== "production") {
        console.warn(warnMessage);
      }

      disposeGL();
      hasWebglBudgetSlotRef.current =
        releaseWeatherWebglBudgetSlotOnInitFailure(
          canvas,
          hasWebglBudgetSlotRef.current,
        );
      return false;
    },
    [disposeGL],
  );

  const initGL = useCallback(() => {
    if (initFailedRef.current) return false;

    const canvas = canvasRef.current;
    if (!canvas) return false;

    if (hasWebglBudgetSlotRef.current === false) return false;
    if (hasWebglBudgetSlotRef.current === null) {
      const ok = tryAcquireWeatherWebglCanvasBudgetSlot(canvas);
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

    disposeGL();
    isContextLostRef.current = false;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      return failInit({
        canvas,
        warnMessage:
          "[WeatherEffectsCanvas] WebGL2 not supported; rendering without effects.",
      });
    }

    glRef.current = gl;
    if (gl.isContextLost()) {
      return failInit({
        canvas,
        contextLost: true,
        markInitFailed: false,
      });
    }

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

    if (!programsRef.current.celestial || !programsRef.current.composite) {
      if (gl.isContextLost()) {
        return failInit({
          canvas,
          contextLost: true,
          markInitFailed: false,
        });
      }

      return failInit({
        canvas,
        errorMessage: "Failed to create required WebGL programs",
      });
    }

    const dpr = propsRef.current.dpr ?? window.devicePixelRatio;
    const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    const fbA = createFramebuffer(gl, width, height);
    const fbB = createFramebuffer(gl, width, height);

    if (!fbA || !fbB) {
      if (gl.isContextLost()) {
        return failInit({
          canvas,
          contextLost: true,
          markInitFailed: false,
        });
      }

      return failInit({
        canvas,
        errorMessage: "Failed to create WebGL framebuffers",
      });
    }

    fbRef.current.a = fbA;
    fbRef.current.b = fbB;

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
      image.src = new URL(
        "../assets/moon-texture.jpg",
        import.meta.url,
      ).toString();
    }

    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);
    const positionBuffer = gl.createBuffer();

    if (!positionBuffer) {
      if (gl.isContextLost()) {
        return failInit({
          canvas,
          contextLost: true,
          markInitFailed: false,
        });
      }

      return failInit({
        canvas,
        errorMessage: "Failed to create WebGL buffer",
      });
    }

    positionBufferRef.current = positionBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    for (const program of Object.values(programsRef.current)) {
      if (!program) continue;
      const positionLoc = gl.getAttribLocation(program, "a_position");
      if (positionLoc >= 0) {
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      }
    }

    startTimeRef.current = performance.now();
    return true;
  }, [disposeGL, failInit]);

  const render = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const programs = programsRef.current;
    const fb = fbRef.current;
    const runtimeProps = propsRef.current;

    if (isContextLostRef.current || !isVisibleRef.current) {
      isRunningRef.current = false;
      animationFrameRef.current = 0;
      return;
    }

    if (!gl || !canvas || !fb.a || !fb.b) {
      isRunningRef.current = false;
      return;
    }

    const dpr = runtimeProps.dpr ?? window.devicePixelRatio;
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

    if (
      runtimeProps.layers.lightning &&
      runtimeProps.lightning.enabled &&
      runtimeProps.lightning.autoMode &&
      time >= nextFlashTimeRef.current
    ) {
      lastFlashTimeRef.current = time;
      strikeSeedRef.current = Math.random();
      nextFlashTimeRef.current =
        time + runtimeProps.lightning.autoInterval * (0.5 + Math.random());
    }

    let readFB = fb.a;
    let writeFB = fb.b;

    const swapBuffers = () => {
      const temp = readFB;
      readFB = writeFB;
      writeFB = temp;
    };

    if (runtimeProps.layers.celestial && programs.celestial) {
      renderCelestialPass({
        gl,
        program: programs.celestial,
        target: writeFB,
        displayWidth,
        displayHeight,
        time,
        params: runtimeProps.celestial,
        moonTexture: moonTextureRef.current,
        moonTextureLoaded: moonTextureLoadedRef.current,
        getUniformLocation: u,
      });
      swapBuffers();
    } else {
      clearOffscreenPass(gl, writeFB, displayWidth, displayHeight);
      swapBuffers();
    }

    if (runtimeProps.layers.clouds && programs.cloud) {
      renderCloudPass({
        gl,
        program: programs.cloud,
        target: writeFB,
        sceneTexture: readFB.texture,
        displayWidth,
        displayHeight,
        time,
        params: runtimeProps.cloud,
        celestial: runtimeProps.celestial,
        getUniformLocation: u,
      });
      swapBuffers();
    }

    if (runtimeProps.layers.rain && programs.rain) {
      renderRainPass({
        gl,
        program: programs.rain,
        target: writeFB,
        sceneTexture: readFB.texture,
        displayWidth,
        displayHeight,
        time,
        params: runtimeProps.rain,
        interactions: runtimeProps.interactions,
        getUniformLocation: u,
      });
      swapBuffers();
    }

    const lightningActive = isLightningPassActive(
      runtimeProps.layers,
      runtimeProps.lightning,
      programs.lightning,
      time,
      lastFlashTimeRef.current,
    );

    if (lightningActive && programs.lightning) {
      renderLightningPass({
        gl,
        program: programs.lightning,
        target: writeFB,
        sceneTexture: readFB.texture,
        displayWidth,
        displayHeight,
        time,
        params: runtimeProps.lightning,
        interactions: runtimeProps.interactions,
        lastFlashTime: lastFlashTimeRef.current,
        strikeSeed: strikeSeedRef.current,
        getUniformLocation: u,
      });
      swapBuffers();
    }

    if (runtimeProps.layers.snow && programs.snow) {
      renderSnowPass({
        gl,
        program: programs.snow,
        target: writeFB,
        sceneTexture: readFB.texture,
        displayWidth,
        displayHeight,
        time,
        params: runtimeProps.snow,
        getUniformLocation: u,
      });
      swapBuffers();
    }

    if (programs.composite) {
      renderCompositePass({
        gl,
        program: programs.composite,
        sceneTexture: readFB.texture,
        displayWidth,
        displayHeight,
        time,
        celestial: runtimeProps.celestial,
        interactions: runtimeProps.interactions,
        post: runtimeProps.post,
        lastFlashTime: lastFlashTimeRef.current,
        strikeSeed: strikeSeedRef.current,
        getUniformLocation: u,
      });
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
                disposeGL();
                releaseBudgetSlot(canvas);
                return;
              }

              if (!isRunningRef.current && !isContextLostRef.current) {
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

    if (!observer) {
      isVisibleRef.current = true;
    } else {
      observer.observe(canvas);
    }

    if (!observer && initGL() && isVisibleRef.current) {
      isRunningRef.current = true;
      render();
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
      releaseBudgetSlot(canvas);
    };
  }, [disposeGL, initGL, releaseBudgetSlot, render, stopRenderLoop]);

  return canvasRef;
}
