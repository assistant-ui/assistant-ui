"use client";

import { ArrowUp, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/radix/toggle-group";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import { VARIANTS_DEMO_PATH } from "@/lib/embedded-paths";
import { cn } from "@/lib/utils";

const SHOWN_ORIGIN = "localhost:3000/pricing";

const AGENT_COMMAND = "/variants";
const AGENT_REQUEST = "improve my pricing page";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: null, Icon: Monitor },
  { id: "tablet", label: "Tablet", width: 768, Icon: Tablet },
  { id: "mobile", label: "Mobile", width: 390, Icon: Smartphone },
] as const;

const MIN_WIDTH = 360;

type Device = (typeof DEVICES)[number]["id"];

const AGENTS = [
  { kind: "claude", name: "Claude Code" },
  { kind: "codex", name: "Codex" },
  { kind: "cursor", name: "Cursor" },
  { kind: "gemini", name: "Gemini CLI" },
  { kind: "opencode", name: "OpenCode" },
] as const;

function AgentPrompt({ onSend }: { onSend: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col items-center gap-3">
      <div className="text-muted-foreground flex items-center gap-3">
        <span className="text-xs">In your coding agent</span>
        <ul className="flex items-center gap-2.5">
          {AGENTS.map(({ kind, name }) => (
            <li key={kind} title={name} className="flex">
              <AgentKindIcon kind={kind} className="size-4" />
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-foreground/15 bg-background rounded-capsule flex w-full items-center gap-3 border py-2 pr-2 pl-5">
        <p className="min-w-0 flex-1 truncate font-mono text-[14px] [font-variant-ligatures:none]">
          <span className="font-medium">{AGENT_COMMAND}</span>{" "}
          <span className="text-foreground/80">{AGENT_REQUEST}</span>
          <span
            aria-hidden
            className="bg-foreground/70 ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em]"
          />
        </p>
        <button
          type="button"
          onClick={onSend}
          aria-label="Show the result"
          className="bg-foreground text-background rounded-capsule hover:bg-foreground/85 focus-visible:ring-ring grid size-7 shrink-0 place-items-center transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ArrowUp className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Handoff({
  device,
  onDeviceChange,
}: {
  device: Device | "";
  onDeviceChange: (device: Device) => void;
}) {
  return (
    <div className="relative flex h-24 items-center justify-center">
      <svg
        aria-hidden
        viewBox="0 0 12 80"
        className="text-foreground/30 h-20 w-3 fill-none stroke-current [stroke-width:1.25] [stroke-linecap:round] [stroke-linejoin:round]"
      >
        <path d="M6 1V78M1.5 73.5 6 78l4.5-4.5" />
      </svg>
      <ToggleGroup
        type="single"
        size="sm"
        value={device}
        onValueChange={(value) => {
          if (value) onDeviceChange(value as Device);
        }}
        aria-label="Preview width"
        className="bg-foreground/[0.05] dark:bg-foreground/[0.07] absolute right-0 bottom-2 hidden gap-0.5 rounded-lg p-0.5 md:flex"
      >
        {DEVICES.map(({ id, label, Icon }) => (
          <ToggleGroupItem
            key={id}
            value={id}
            aria-label={label}
            title={label}
            className="text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground rounded-md! hover:bg-transparent"
          >
            <Icon />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function ResizeGrip({
  side,
  value,
  max,
  onPointerDown,
  onKeyDown,
}: {
  side: "left" | "right";
  value: number;
  max: number;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the preview"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={cn(
        "group/grip focus-visible:ring-ring rounded-capsule absolute top-1/2 hidden h-16 w-3 -translate-y-1/2 cursor-ew-resize touch-none place-items-center focus-visible:ring-2 focus-visible:outline-none md:grid",
        side === "left" ? "-left-4" : "-right-4",
      )}
    >
      <span className="bg-foreground/20 group-hover/grip:bg-foreground/45 rounded-capsule h-10 w-1 transition-colors" />
    </div>
  );
}

export function VariantsBrowserFrame() {
  const iframe = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [width, setWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const stageWidth = () => stage.current?.clientWidth ?? MIN_WIDTH;
  const currentWidth = width ?? stageWidth();
  const device: Device | "" =
    DEVICES.find((entry) => entry.width === width)?.id ?? "";

  const fit = (next: number) =>
    next >= stageWidth() ? null : Math.max(MIN_WIDTH, Math.round(next));

  const showResult = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    stage.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const showDevice = (next: Device) => {
    setWidth(DEVICES.find((entry) => entry.id === next)!.width);
  };

  // The preview stays centered, so an edge moves by half the width change.
  // Capturing the pointer keeps the drag alive over the iframe.
  const startDrag =
    (direction: 1 | -1) => (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      const startX = event.clientX;
      const startWidth = currentWidth;
      setDragging(true);
      const move = (moved: globalThis.PointerEvent) => {
        setWidth(fit(startWidth + direction * 2 * (moved.clientX - startX)));
      };
      const end = () => {
        setDragging(false);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    };

  const nudge =
    (direction: 1 | -1) => (event: KeyboardEvent<HTMLDivElement>) => {
      const step =
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      const amount = event.shiftKey ? 64 : 16;
      setWidth(fit(currentWidth + direction * step * 2 * amount));
    };
  // The package rewrites the frame's URL with history.replaceState, which fires
  // no event the parent can observe, so the address bar reads it on an interval.
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const next = iframe.current?.contentWindow?.location.search ?? "";
        setSearch((current) => (current === next ? current : next));
      } catch {
        setSearch("");
      }
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <figure className="m-0">
      <AgentPrompt onSend={showResult} />
      <Handoff device={device} onDeviceChange={showDevice} />
      <div ref={stage} className="scroll-mt-20">
        <div
          className={cn(
            "relative mx-auto",
            !dragging &&
              "transition-[max-width] duration-300 ease-out motion-reduce:transition-none",
          )}
          style={{ maxWidth: width ?? "100%" }}
        >
          <ResizeGrip
            side="left"
            value={currentWidth}
            max={stageWidth()}
            onPointerDown={startDrag(-1)}
            onKeyDown={nudge(-1)}
          />
          <div className="border-foreground/10 rounded-document overflow-hidden border">
            <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex h-10 items-center border-b px-3">
              <p className="bg-background text-muted-foreground min-w-0 flex-1 truncate rounded-sm px-3 py-1 font-mono text-xs [font-variant-ligatures:none]">
                {SHOWN_ORIGIN}
                <span className="text-foreground">
                  {decodeURIComponent(search)}
                </span>
              </p>
            </div>
            <iframe
              ref={iframe}
              src={VARIANTS_DEMO_PATH}
              title="A pricing page with two undecided regions"
              className={cn(
                "bg-background block h-[44rem] w-full border-0",
                dragging && "pointer-events-none",
              )}
            />
          </div>
          <ResizeGrip
            side="right"
            value={currentWidth}
            max={stageWidth()}
            onPointerDown={startDrag(1)}
            onKeyDown={nudge(1)}
          />
        </div>
      </div>
    </figure>
  );
}
