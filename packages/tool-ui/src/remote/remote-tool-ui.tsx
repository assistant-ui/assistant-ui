"use client";

import * as React from "react";
import { cn } from "../utils/cn";

export interface RemoteToolUIProps {
  /** PSL-isolated subdomain URL */
  src: string;
  /** Tool name for identification */
  toolName: string;
  /** Props to pass to remote component */
  props: Record<string, unknown>;
  /** Callback when remote component emits action */
  onAction?: ((actionId: string, payload?: unknown) => void) | undefined;
  /** Callback to add tool result (for human-in-loop) */
  onAddResult?: ((result: unknown) => void) | undefined;
  /** Fallback while loading */
  fallback?: React.ReactNode | undefined;
  /** Error fallback */
  errorFallback?: React.ReactNode | undefined;
  /** Additional class names */
  className?: string | undefined;
}

interface RemoteMessage {
  type: "ready" | "action" | "addResult" | "resize" | "error";
  payload?: unknown;
}

/**
 * Renders a tool UI component from a remote PSL-isolated source.
 *
 * Security model:
 * - Component runs in sandboxed iframe
 * - Only allow-scripts enabled (no same-origin)
 * - Communication via postMessage with origin validation
 * - PSL isolation prevents cross-component data access
 */
export const RemoteToolUI: React.FC<RemoteToolUIProps> = ({
  src,
  toolName,
  props,
  onAction,
  onAddResult,
  fallback,
  errorFallback,
  className,
}) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [height, setHeight] = React.useState(100);
  const [error, setError] = React.useState<string | null>(null);

  // Extract origin for validation
  const expectedOrigin = React.useMemo(() => {
    try {
      return new URL(src).origin;
    } catch {
      return null;
    }
  }, [src]);

  // Handle messages from iframe
  React.useEffect(() => {
    if (!expectedOrigin) return;

    const handleMessage = (event: MessageEvent<RemoteMessage>) => {
      // Validate origin (must be from our PSL-isolated domain)
      if (event.origin !== expectedOrigin) return;
      if (!event.data || typeof event.data.type !== "string") return;

      const { type, payload } = event.data;

      switch (type) {
        case "ready":
          setStatus("ready");
          // Send initial props
          iframeRef.current?.contentWindow?.postMessage(
            { type: "render", toolName, props },
            expectedOrigin,
          );
          break;

        case "action":
          onAction?.(payload as string);
          break;

        case "addResult":
          onAddResult?.(payload);
          break;

        case "resize":
          if (typeof payload === "number" && payload > 0) {
            setHeight(Math.min(payload, 800)); // Cap at 800px
          }
          break;

        case "error":
          setStatus("error");
          setError(payload as string);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [expectedOrigin, toolName, props, onAction, onAddResult]);

  // Send updated props when they change
  React.useEffect(() => {
    if (
      status === "ready" &&
      iframeRef.current?.contentWindow &&
      expectedOrigin
    ) {
      iframeRef.current.contentWindow.postMessage(
        { type: "update", props },
        expectedOrigin,
      );
    }
  }, [status, props, expectedOrigin]);

  if (!expectedOrigin) {
    return (
      errorFallback ?? <div className="tool-ui-error">Invalid source URL</div>
    );
  }

  if (status === "error") {
    return (
      errorFallback ?? (
        <div className="tool-ui-error">
          <p>Failed to load remote component</p>
          {error && <pre>{error}</pre>}
        </div>
      )
    );
  }

  return (
    <div className={cn("tool-ui-remote-container", className)}>
      {status === "loading" &&
        (fallback ?? (
          <div className="tool-ui-remote-loading">
            <div className="bg-muted h-24 animate-pulse rounded-lg" />
          </div>
        ))}

      <iframe
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          height: status === "ready" ? height : 0,
          border: "none",
          display: status === "ready" ? "block" : "none",
        }}
        title={`${toolName} UI`}
      />
    </div>
  );
};
