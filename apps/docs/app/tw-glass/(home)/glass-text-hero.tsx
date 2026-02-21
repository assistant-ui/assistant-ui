"use client";

import { useState, useRef, useEffect } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "motion/react";
import { useControls, folder, button } from "leva";
import { HERO_TEXT } from "./constants";
import { unsplash } from "./pattern-picker";

const MOUSE_SPRING = { stiffness: 200, damping: 30, mass: 0.3 };

const GLASS_TEXT_DEFAULTS = {
  // Blur (height map)
  blurStdDev: 1.1,
  // Diffuse lighting
  diffSurfaceScale: 8,
  diffConstant: 1.4,
  diffLightX: 0,
  diffLightY: -160,
  diffLightZ: 30,
  // Specular lighting
  specSurfaceScale: 9,
  specConstant: 3.2,
  specExponent: 17,
  specLightX: 0,
  specLightY: 160,
  specLightZ: 50,
  // Compositing
  diffOpacity: 0.7,
  specOpacity: 0.6,
  // Background
  showBgImage: true,
  bgOpacity: 1,
};

export function GlassTextHero({ bg }: { bg: string }) {
  const filterId = "glass-text-tunable";
  const controlsRef = useRef<Record<string, unknown>>({});
  const diffPointLightRef = useRef<SVGFEPointLightElement>(null);
  const specPointLightRef = useRef<SVGFEPointLightElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const sx = useSpring(mouseX, MOUSE_SPRING);
  const sy = useSpring(mouseY, MOUSE_SPRING);

  useMotionValueEvent(sx, "change", (v) => {
    diffPointLightRef.current?.setAttribute("x", String(v));
    specPointLightRef.current?.setAttribute("x", String(-v));
  });
  useMotionValueEvent(sy, "change", (v) => {
    diffPointLightRef.current?.setAttribute("y", String(v));
    specPointLightRef.current?.setAttribute("y", String(-v));
  });

  useEffect(() => {
    const range = 500;
    const onMove = (e: MouseEvent) => {
      mouseX.set(((e.clientX / window.innerWidth) * 2 - 1) * range);
      mouseY.set(((e.clientY / window.innerHeight) * 2 - 1) * range);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const controls = useControls({
    "Blur (Height Map)": folder({
      blurStdDev: {
        value: GLASS_TEXT_DEFAULTS.blurStdDev,
        min: 0,
        max: 8,
        step: 0.1,
        label: "Std Deviation",
      },
    }),
    "Diffuse Light": folder({
      diffSurfaceScale: {
        value: GLASS_TEXT_DEFAULTS.diffSurfaceScale,
        min: 0,
        max: 30,
        step: 0.5,
        label: "Surface Scale",
      },
      diffConstant: {
        value: GLASS_TEXT_DEFAULTS.diffConstant,
        min: 0,
        max: 3,
        step: 0.05,
        label: "Intensity",
      },
      diffLightX: {
        value: GLASS_TEXT_DEFAULTS.diffLightX,
        min: -500,
        max: 500,
        step: 10,
        label: "Light X",
      },
      diffLightY: {
        value: GLASS_TEXT_DEFAULTS.diffLightY,
        min: -500,
        max: 500,
        step: 10,
        label: "Light Y",
      },
      diffLightZ: {
        value: GLASS_TEXT_DEFAULTS.diffLightZ,
        min: 0,
        max: 800,
        step: 10,
        label: "Light Z",
      },
      diffOpacity: {
        value: GLASS_TEXT_DEFAULTS.diffOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        label: "Opacity",
      },
    }),
    "Specular Highlight": folder({
      specSurfaceScale: {
        value: GLASS_TEXT_DEFAULTS.specSurfaceScale,
        min: 0,
        max: 30,
        step: 0.5,
        label: "Surface Scale",
      },
      specConstant: {
        value: GLASS_TEXT_DEFAULTS.specConstant,
        min: 0,
        max: 5,
        step: 0.1,
        label: "Intensity",
      },
      specExponent: {
        value: GLASS_TEXT_DEFAULTS.specExponent,
        min: 1,
        max: 128,
        step: 1,
        label: "Sharpness",
      },
      specLightX: {
        value: GLASS_TEXT_DEFAULTS.specLightX,
        min: -500,
        max: 500,
        step: 10,
        label: "Light X",
      },
      specLightY: {
        value: GLASS_TEXT_DEFAULTS.specLightY,
        min: -500,
        max: 500,
        step: 10,
        label: "Light Y",
      },
      specLightZ: {
        value: GLASS_TEXT_DEFAULTS.specLightZ,
        min: 0,
        max: 800,
        step: 10,
        label: "Light Z",
      },
      specOpacity: {
        value: GLASS_TEXT_DEFAULTS.specOpacity,
        min: 0,
        max: 1,
        step: 0.05,
        label: "Opacity",
      },
    }),
    Background: folder(
      {
        showBgImage: {
          value: GLASS_TEXT_DEFAULTS.showBgImage,
          label: "Show Image",
        },
        bgOpacity: {
          value: GLASS_TEXT_DEFAULTS.bgOpacity,
          min: 0,
          max: 1,
          step: 0.05,
          label: "Image Opacity",
        },
      },
      { collapsed: true },
    ),
    "Export for LLM": button(() => {
      const c = controlsRef.current;
      const lines = Object.entries(GLASS_TEXT_DEFAULTS)
        .filter(([, def]) => typeof def === "number")
        .map(([key]) => {
          const val = c[key];
          return `- ${key}: ${val}`;
        })
        .join("\n");
      const text = `## Glass Text Effect — Current Values\n\n${lines}`;
      navigator.clipboard.writeText(text);
    }),
  });

  controlsRef.current = controls;

  // Crossfade: detect bg change during render (not in effect) per rerender-derived-state-no-effect
  const [prevBg, setPrevBg] = useState(bg);
  const [fadingBg, setFadingBg] = useState<string | null>(null);

  if (bg !== prevBg) {
    setPrevBg(bg);
    setFadingBg(prevBg);
  }

  // Clear the fading layer after the animation completes
  useEffect(() => {
    if (fadingBg !== null) {
      const timer = setTimeout(() => setFadingBg(null), 600);
      return () => clearTimeout(timer);
    }
  }, [fadingBg]);

  const textBgStyle = (bgId: string) => ({
    color: "transparent" as const,
    backgroundImage: controls.showBgImage
      ? `linear-gradient(rgba(255,255,255,${1 - controls.bgOpacity}),rgba(255,255,255,${1 - controls.bgOpacity})),${unsplash(bgId)}`
      : undefined,
    backgroundColor: controls.showBgImage ? undefined : "#999",
    backgroundSize: "cover" as const,
    backgroundPosition: "center" as const,
    backgroundAttachment: "fixed" as const,
    backgroundClip: "text" as const,
    WebkitBackgroundClip: "text",
  });

  return (
    <div className="pointer-events-none relative select-none font-bold text-5xl tracking-tight lg:text-7xl">
      {/* SVG lighting filter — outputs only diffuse + specular (no SourceGraphic) */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <filter
            id={filterId}
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              in="SourceAlpha"
              stdDeviation={controls.blurStdDev}
              result="blur"
            />
            <feDiffuseLighting
              in="blur"
              surfaceScale={controls.diffSurfaceScale}
              diffuseConstant={controls.diffConstant}
              result="diffuse"
            >
              <fePointLight
                ref={diffPointLightRef}
                x={0}
                y={0}
                z={controls.diffLightZ}
              />
            </feDiffuseLighting>
            <feSpecularLighting
              in="blur"
              surfaceScale={controls.specSurfaceScale}
              specularConstant={controls.specConstant}
              specularExponent={controls.specExponent}
              result="specular"
            >
              <fePointLight
                ref={specPointLightRef}
                x={0}
                y={0}
                z={controls.specLightZ}
              />
            </feSpecularLighting>
            <feComposite
              in="specular"
              in2="SourceAlpha"
              operator="in"
              result="specClip"
            />
            <feComposite
              in="diffuse"
              in2="SourceAlpha"
              operator="in"
              result="diffClip"
            />
            <feColorMatrix
              in="diffClip"
              type="matrix"
              values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${controls.diffOpacity} 0`}
              result="diffFade"
            />
            <feColorMatrix
              in="specClip"
              type="matrix"
              values={`1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${controls.specOpacity} 0`}
              result="specFade"
            />
            {/* Only lighting — no SourceGraphic in merge */}
            <feMerge>
              <feMergeNode in="diffFade" />
              <feMergeNode in="specFade" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Current bg — always visible underneath */}
      <h1
        className="pointer-events-auto inline text-9xl"
        style={textBgStyle(bg)}
      >
        {HERO_TEXT}
      </h1>

      {/* Previous bg — fades out on top to reveal new image (crossfade) */}
      {fadingBg && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-9xl"
          style={{
            ...textBgStyle(fadingBg),
            animation: "glass-text-fade-out 600ms ease-out forwards",
          }}
        >
          {HERO_TEXT}
        </span>
      )}

      {/* Lighting overlay: filter uses constant SourceAlpha — no flicker */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-9xl"
        style={{
          filter: `url(#${filterId})`,
          color: "white",
        }}
      >
        {HERO_TEXT}
      </span>
    </div>
  );
}
