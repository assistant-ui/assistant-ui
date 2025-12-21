"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Simple easing function (ease-out cubic)
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

// Simple animation helper to replace motion's animate
const animateValue = (
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
): { stop: () => void } => {
  const startTime = performance.now();
  let animationFrame: number;

  const tick = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / (duration * 1000), 1);
    const easedProgress = easeOutCubic(progress);
    const currentValue = from + (to - from) * easedProgress;

    onUpdate(currentValue);

    if (progress < 1) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  animationFrame = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    },
  };
};

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  enabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}
const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    enabled = false,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);
    const animationControlRef = useRef<{ stop: () => void } | null>(null);
    const cachedRectRef = useRef<DOMRect | null>(null);
    const reducedMotionRef = useRef(false);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current || reducedMotionRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } =
            cachedRectRef.current || element.getBoundingClientRect();
          const mouseX =
            e && typeof e === "object"
              ? "clientX" in e && typeof (e as any).clientX === "number"
                ? (e as any).clientX
                : "x" in e && typeof (e as any).x === "number"
                  ? (e as any).x
                  : lastPosition.current.x
              : lastPosition.current.x;
          const mouseY =
            e && typeof e === "object"
              ? "clientY" in e && typeof (e as any).clientY === "number"
                ? (e as any).clientY
                : "y" in e && typeof (e as any).y === "number"
                  ? (e as any).y
                  : lastPosition.current.y
              : lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          const centerX = left + width * 0.5;
          const centerY = top + height * 0.5;
          const distanceFromCenter = Math.hypot(
            mouseX - centerX,
            mouseY - centerY,
          );
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          const targetAngle =
            (180 * Math.atan2(mouseY - centerY, mouseX - centerX)) / Math.PI +
            90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          animationControlRef.current?.stop();
          animationControlRef.current = animateValue(
            currentAngle,
            newAngle,
            movementDuration,
            (value) => {
              element.style.setProperty("--start", String(value));
            },
          );
        });
      },
      [inactiveZone, proximity, movementDuration],
    );

    // Setup ResizeObserver and prefers-reduced-motion
    useEffect(() => {
      if (!enabled || !containerRef.current) return;

      // Check for reduced motion preference
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotionRef.current = mediaQuery.matches;

      const handleReducedMotionChange = (e: MediaQueryListEvent) => {
        reducedMotionRef.current = e.matches;
      };

      mediaQuery.addEventListener("change", handleReducedMotionChange);

      // Setup ResizeObserver to cache bounding rect
      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current) {
          cachedRectRef.current = containerRef.current.getBoundingClientRect();
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        mediaQuery.removeEventListener("change", handleReducedMotionChange);
        resizeObserver.disconnect();
      };
    }, [enabled]);

    useEffect(() => {
      if (!enabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        animationControlRef.current?.stop();
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, enabled]);

    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            !enabled && "block!",
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                  : `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%),
                radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%),
                radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), 
                radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #dd7bbb 0%,
                  #d79f1e calc(25% / var(--repeating-conic-gradient-times)),
                  #5a922c calc(50% / var(--repeating-conic-gradient-times)), 
                  #4c7894 calc(75% / var(--repeating-conic-gradient-times)),
                  #dd7bbb calc(100% / var(--repeating-conic-gradient-times))
                )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-(--blur)",
            className,
            !enabled && "hidden!",
          )}
        >
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              "after:absolute",
              "after:inset-[calc(-1*var(--glowingeffect-border-width))]",
              "after:rounded-[inherit]",
              'after:content-[""]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:bg-fixed",
              "after:[background:var(--gradient)]",
              "after:opacity-(--active)",
              "after:transition-opacity",
              "after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:mask-intersect",
              "after:mask-[linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]",
            )}
          />
        </div>
      </>
    );
  },
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
