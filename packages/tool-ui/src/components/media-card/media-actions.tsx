"use client";

import * as React from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "../../utils/cn";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared";
import { useMediaCard } from "./context";

type MediaActionId =
  | "open"
  | "copyLink"
  | "download"
  | "playPause"
  | "muteToggle";

const DEFAULT_ACTIONS: Record<string, MediaActionId[]> = {
  image: ["open", "copyLink", "download"],
  video: ["playPause", "muteToggle", "open", "copyLink"],
  audio: ["playPause", "open", "copyLink"],
  link: ["open", "copyLink"],
};

const ACTION_LABELS: Record<MediaActionId, string> = {
  open: "Open",
  copyLink: "Copy link",
  download: "Download",
  playPause: "Play / pause",
  muteToggle: "Mute / unmute",
};

export function Actions() {
  const { card, state, setState, handlers, mediaElement, resolvedHref } =
    useMediaCard();
  const supportsClipboard = useClipboardSupport();

  const [copyStatus, setCopyStatus] = React.useState<
    "idle" | "copied" | "error"
  >("idle");

  React.useEffect(() => {
    if (copyStatus === "idle") return undefined;
    const timer = window.setTimeout(() => setCopyStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const availableHref = resolvedHref ?? card.src;
  const mediaActions = React.useMemo(() => {
    if (card.kind === "link") return [];
    const defaults = DEFAULT_ACTIONS[card.kind] ?? [];
    return defaults.filter((actionId) => {
      switch (actionId) {
        case "open":
          return !!availableHref;
        case "copyLink":
          return (
            supportsClipboard && !!(resolvedHref ?? card.href ?? card.src)
          );
        case "download":
          return !!card.src;
        case "playPause":
        case "muteToggle":
          return card.kind === "audio" || card.kind === "video";
        default:
          return true;
      }
    });
  }, [
    availableHref,
    card.href,
    card.kind,
    card.src,
    resolvedHref,
    supportsClipboard,
  ]);

  if (card.kind === "link") {
    return null;
  }

  if (mediaActions.length === 0) {
    return null;
  }

  async function run(actionId: MediaActionId) {
    const shouldProceed =
      (await handlers.onBeforeMediaAction?.({
        action: actionId,
        card,
      })) ?? true;
    if (!shouldProceed) return;

    switch (actionId) {
      case "open": {
        if (!availableHref) break;
        if (handlers.onNavigate) {
          handlers.onNavigate(availableHref, card);
        } else if (typeof window !== "undefined") {
          window.open(availableHref, "_blank", "noopener,noreferrer");
        }
        break;
      }
      case "copyLink": {
        const target = resolvedHref ?? card.href ?? card.src;
        if (!target || !supportsClipboard) break;
        try {
          if (
            typeof navigator !== "undefined" &&
            navigator.clipboard?.writeText
          ) {
            await navigator.clipboard.writeText(target);
          } else {
            throw new Error("Clipboard API unavailable");
          }
          setCopyStatus("copied");
        } catch (error) {
          console.error("MediaCard: failed to copy link", error);
          setCopyStatus("error");
        }
        break;
      }
      case "download": {
        if (!card.src || typeof document === "undefined") break;
        const anchor = document.createElement("a");
        anchor.href = card.src;
        anchor.download = card.title ?? card.assetId;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        break;
      }
      case "playPause": {
        if (!mediaElement) break;
        if (mediaElement.paused) {
          try {
            await mediaElement.play();
            setState({ playing: true });
            handlers.onMediaEvent?.("play");
          } catch (error) {
            console.error("MediaCard: unable to play media", error);
          }
        } else {
          mediaElement.pause();
          setState({ playing: false });
          handlers.onMediaEvent?.("pause");
        }
        break;
      }
      case "muteToggle": {
        if (!mediaElement) break;
        const nextMuted = !mediaElement.muted;
        mediaElement.muted = nextMuted;
        setState({ muted: nextMuted });
        handlers.onMediaEvent?.(nextMuted ? "mute" : "unmute");
        break;
      }
      default:
        break;
    }

    handlers.onMediaAction?.(actionId, card);
  }

  const playing =
    state.playing ?? (mediaElement ? !mediaElement.paused : false);
  const muted = state.muted ?? (mediaElement ? mediaElement.muted : false);

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex flex-wrap items-center gap-2">
        {mediaActions.map((actionId) => {
          const label =
            actionId === "playPause"
              ? playing
                ? "Pause"
                : "Play"
              : actionId === "muteToggle"
                ? muted
                  ? "Unmute"
                  : "Mute"
                : actionId === "copyLink" && copyStatus === "copied"
                  ? "Link copied"
                  : ACTION_LABELS[actionId];

          const pressed =
            actionId === "playPause"
              ? playing
              : actionId === "muteToggle"
                ? muted
                : undefined;

          const Icon = (() => {
            switch (actionId) {
              case "open":
                return ExternalLink;
              case "copyLink":
                return Copy;
              case "download":
                return Download;
              case "playPause":
                return playing ? Pause : Play;
              case "muteToggle":
                return muted ? VolumeX : Volume2;
              default:
                return ExternalLink;
            }
          })();

          const tooltipContent =
            actionId === "copyLink" && copyStatus !== "idle"
              ? copyStatus === "copied"
                ? "Copied to clipboard"
                : "Unable to copy"
              : label;

          return (
            <Tooltip key={actionId}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "bg-background/60 supports-[backdrop-filter]:bg-background/40 relative z-20 rounded-full backdrop-blur",
                    actionId === "open" && "shadow-sm",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void run(actionId);
                  }}
                  aria-label={label}
                  aria-pressed={
                    typeof pressed === "boolean" ? pressed : undefined
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tooltipContent}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

function useClipboardSupport() {
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        typeof navigator.clipboard?.writeText === "function",
    );
  }, []);

  return supported;
}
