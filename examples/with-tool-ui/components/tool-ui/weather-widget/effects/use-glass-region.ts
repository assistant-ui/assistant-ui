"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type RefObject,
} from "react";

export interface GlassRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseGlassRegionOptions {
  targetRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  padding?: number;
  enabled?: boolean;
}

export function useGlassRegion({
  targetRef,
  containerRef,
  padding = 0,
  enabled = true,
}: UseGlassRegionOptions): [number, number, number, number] {
  const [region, setRegion] = useState<[number, number, number, number]>([
    0, 0, 1, 1,
  ]);
  const rafRef = useRef<number>(0);

  const calculateRegion = useCallback(() => {
    if (!enabled || !targetRef.current || !containerRef.current) {
      return;
    }

    const target = targetRef.current.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();

    if (container.width === 0 || container.height === 0) {
      return;
    }

    const x = Math.max(
      0,
      (target.left - container.left - padding) / container.width,
    );
    const y = Math.max(
      0,
      (target.top - container.top - padding) / container.height,
    );
    const width = Math.min(
      1 - x,
      (target.width + padding * 2) / container.width,
    );
    const height = Math.min(
      1 - y,
      (target.height + padding * 2) / container.height,
    );

    setRegion([x, 1 - y - height, width, height]);
  }, [targetRef, containerRef, padding, enabled]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(calculateRegion);
  }, [calculateRegion]);

  useEffect(() => {
    if (!enabled) return;

    calculateRegion();

    const targetObserver = new ResizeObserver(scheduleUpdate);
    const containerObserver = new ResizeObserver(scheduleUpdate);

    if (targetRef.current) {
      targetObserver.observe(targetRef.current);
    }
    if (containerRef.current) {
      containerObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      targetObserver.disconnect();
      containerObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled, calculateRegion, scheduleUpdate, targetRef, containerRef]);

  return region;
}

export function useContainerQuery(
  ref: RefObject<HTMLElement | null>,
  breakpoints: { name: string; minWidth: number }[],
): string {
  const [activeBreakpoint, setActiveBreakpoint] = useState<string>("");

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const width = entry.contentRect.width;
      let active = "";

      for (const bp of breakpoints) {
        if (width >= bp.minWidth) {
          active = bp.name;
        }
      }

      setActiveBreakpoint(active);
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, breakpoints]);

  return activeBreakpoint;
}

export function useAdaptiveGlassParams(
  containerRef: RefObject<HTMLElement | null>,
): {
  refractionScale: number;
  edgeWidth: number;
  chromaticAberration: number;
  specularIntensity: number;
} {
  const breakpoint = useContainerQuery(containerRef, [
    { name: "xs", minWidth: 0 },
    { name: "sm", minWidth: 320 },
    { name: "md", minWidth: 480 },
    { name: "lg", minWidth: 640 },
  ]);

  switch (breakpoint) {
    case "xs":
      return {
        refractionScale: 20,
        edgeWidth: 0.2,
        chromaticAberration: 0.8,
        specularIntensity: 1.0,
      };
    case "sm":
      return {
        refractionScale: 25,
        edgeWidth: 0.18,
        chromaticAberration: 1.0,
        specularIntensity: 1.2,
      };
    case "md":
      return {
        refractionScale: 30,
        edgeWidth: 0.15,
        chromaticAberration: 1.2,
        specularIntensity: 1.5,
      };
    default:
      return {
        refractionScale: 35,
        edgeWidth: 0.12,
        chromaticAberration: 1.4,
        specularIntensity: 1.8,
      };
  }
}
