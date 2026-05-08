"use client";

import {
  type ComponentType,
  type FC,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  GenerativeUIRender,
  type GenerativeUIComponentRegistry,
} from "@assistant-ui/core/react";
import { useAuiState } from "@assistant-ui/store";
import type { GenerativeUISpec } from "@assistant-ui/core";

type Props = {
  components: GenerativeUIComponentRegistry;
  spec?: GenerativeUISpec | undefined;
  Fallback?: ComponentType<{ component: string; props?: unknown }> | undefined;
};

const IFRAME_BASE_STYLE: React.CSSProperties = {
  border: "none",
  width: "100%",
  display: "block",
};

/**
 * Renders a generative-ui spec inside a sandboxed iframe to provide CSS and
 * DOM isolation in addition to the allowlist security boundary.
 *
 * The components themselves still execute in the host realm via
 * `react-dom` portal — this is the lightweight, same-document sandbox path.
 * For full origin isolation backed by `safe-content-frame`'s
 * `scf.auiusercontent.com` shim, see the package's separate iframe shipping
 * helpers.
 */
export const GenerativeUISandboxFrame: FC<Props> = ({
  components,
  spec,
  Fallback,
}) => {
  // Selector reads store state only — see note in
  // `MessagePrimitive.GenerativeUI` for why the prop is combined outside.
  const storeSpec = useAuiState((s) => {
    const part = s.part as { type?: string; spec?: GenerativeUISpec };
    return part?.type === "generative-ui" ? part.spec : undefined;
  });
  const partSpec = spec ?? storeSpec;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc?.body) return;
    setMountTarget(doc.body);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // If the iframe has already loaded (cached) before the effect runs.
    const doc = iframe.contentDocument;
    if (doc?.body && doc.readyState === "complete") {
      setMountTarget(doc.body);
    }
  }, []);

  // Auto-size iframe to its body. Without this the iframe falls back to the
  // browser default (~150px) and any taller generative UI is silently clipped.
  useEffect(() => {
    if (!mountTarget) return;
    const update = () => setContentHeight(mountTarget.scrollHeight);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(mountTarget);
    return () => observer.disconnect();
  }, [mountTarget]);

  if (!partSpec) return null;

  return (
    <iframe
      ref={iframeRef}
      // Portal-based isolation: requires same-origin so the parent realm can
      // mount React into the iframe document. CSS / DOM are isolated; the
      // allowlist remains the security boundary for component resolution.
      // For full origin isolation, use the @assistant-ui/safe-content-frame
      // package's `SafeContentFrame` directly.
      srcDoc='<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"></body></html>'
      style={
        contentHeight !== null
          ? { ...IFRAME_BASE_STYLE, height: contentHeight }
          : IFRAME_BASE_STYLE
      }
      title="Generative UI sandbox"
      onLoad={handleLoad}
    >
      {mountTarget &&
        createPortal(
          <GenerativeUIRender
            spec={partSpec}
            components={components}
            Fallback={Fallback}
            sandbox="same-realm"
          />,
          mountTarget,
        )}
    </iframe>
  );
};

GenerativeUISandboxFrame.displayName = "GenerativeUISandboxFrame";
