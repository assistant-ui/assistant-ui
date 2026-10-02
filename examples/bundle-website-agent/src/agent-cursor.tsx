"use client";

import {
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";

export type AgentCursorTarget =
  | HTMLElement
  | RefObject<HTMLElement | null>
  | { x: number; y: number };

export type AgentCursorProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  target?: AgentCursorTarget | null;
  phase?: "idle" | "moving" | "clicking";
  label?: string;
  visible?: boolean;
  duration?: number;
};

function resolveTarget(target: AgentCursorTarget) {
  if (!(target instanceof HTMLElement) && "x" in target) return target;
  const element = "current" in target ? target.current : target;
  if (!element?.isConnected) return null;
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

export function AgentCursor({
  target,
  phase = "idle",
  label = "Agent",
  visible = true,
  duration = 520,
  style,
  ...props
}: AgentCursorProps) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      const position = target ? resolveTarget(target) : null;
      cursor.style.opacity = visible && position ? "1" : "0";
      if (!position) return;
      cursor.style.setProperty("--aui-cursor-x", `${position.x}px`);
      cursor.style.setProperty("--aui-cursor-y", `${position.y}px`);
    };
    update();
    if (!target) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    let element: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const rebind = () => {
      const next =
        !(target instanceof HTMLElement) && "x" in target
          ? null
          : "current" in target
            ? target.current
            : target;
      if (next === element) return;
      observer?.disconnect();
      element = next;
      if (element && typeof ResizeObserver !== "undefined") {
        observer ??= new ResizeObserver(update);
        observer.observe(element);
      }
      update();
    };
    rebind();
    let frame: number | undefined;
    if (visible && "current" in target) {
      const trackRef = () => {
        rebind();
        frame = requestAnimationFrame(trackRef);
      };
      frame = requestAnimationFrame(trackRef);
    }
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [target, visible]);

  return (
    <div
      {...props}
      ref={cursorRef}
      aria-hidden="true"
      data-slot="agent-cursor"
      data-phase={phase}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
        pointerEvents: "none",
        opacity: 0,
        transform:
          "translate3d(var(--aui-cursor-x, 0px), var(--aui-cursor-y, 0px), 0)",
        transition: `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms`,
        color: "var(--foreground, oklch(0.22 0.012 106))",
        ...style,
      }}
    >
      <style>{`
        [data-slot="agent-cursor"] .aui-agent-pointer { display: block; transform-origin: 2px 2px; }
        [data-slot="agent-cursor"][data-phase="clicking"] .aui-agent-pointer { animation: aui-agent-click 280ms ease-out; }
        [data-slot="agent-cursor"] .aui-agent-click-ring { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border: 2px solid currentColor; border-radius: 50%; opacity: 0; }
        [data-slot="agent-cursor"][data-phase="clicking"] .aui-agent-click-ring { animation: aui-agent-pulse 440ms ease-out; }
        @keyframes aui-agent-click { 45% { transform: scale(0.78); } 75% { transform: scale(1.09); } 100% { transform: scale(1); } }
        @keyframes aui-agent-pulse { 0% { opacity: 0.5; transform: scale(0.45); } 100% { opacity: 0; transform: scale(1.5); } }
        @media (prefers-reduced-motion: reduce) {
          [data-slot="agent-cursor"] { transition: none !important; }
          [data-slot="agent-cursor"] .aui-agent-pointer, [data-slot="agent-cursor"] .aui-agent-click-ring { animation: none !important; }
          [data-slot="agent-cursor"][data-phase="clicking"] .aui-agent-click-ring { opacity: 0.5; }
        }
      `}</style>
      <span className="aui-agent-click-ring" />
      <svg
        className="aui-agent-pointer"
        width="26"
        height="32"
        viewBox="0 0 26 32"
        fill="none"
      >
        <path
          d="M2 2L2 25L8.6 18.7L13.3 29L17.5 27L12.6 17L22 16L2 2Z"
          fill="currentColor"
          stroke="var(--background, oklch(0.985 0.004 106))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <span
          style={{
            position: "absolute",
            left: 24,
            top: 24,
            padding: "3px 7px",
            borderRadius: 6,
            background: "var(--foreground, oklch(0.22 0.012 106))",
            color: "var(--background, oklch(0.985 0.004 106))",
            fontSize: 11,
            lineHeight: "16px",
            fontFamily: "var(--font-sans, sans-serif)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
