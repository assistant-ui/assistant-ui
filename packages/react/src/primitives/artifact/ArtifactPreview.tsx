"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type MutableRefObject,
  type Ref,
} from "react";
import { Primitive } from "../../utils/Primitive";
import { useAui, useAuiState } from "@assistant-ui/store";
import { SafeContentFrame, type SandboxOption } from "safe-content-frame";

export namespace ArtifactPrimitivePreview {
  export type StatusError = {
    message: string;
    stack?: string;
    name?: string;
  };
  export type Element = HTMLDivElement;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    product?: string;
    sandbox?: readonly SandboxOption[];
    /**
     * Called once when the iframe reports successful mount via the
     * `aui:artifact:status` postMessage protocol. The `artifactId` argument
     * is the id of the artifact that just mounted, so consumers can route
     * the status back to the correct tool call.
     */
    onReady?: (artifactId: string) => void;
    /**
     * Called once when the iframe reports a compile / runtime error via the
     * `aui:artifact:status` postMessage protocol.
     */
    onError?: (artifactId: string, error: StatusError) => void;
  };
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const r of refs) {
      if (!r) continue;
      if (typeof r === "function") {
        r(node);
      } else {
        (r as MutableRefObject<T | null>).current = node;
      }
    }
  };
}

export const ArtifactPrimitivePreview = forwardRef<
  ArtifactPrimitivePreview.Element,
  ArtifactPrimitivePreview.Props
>(
  (
    { product = "assistant-ui-artifact", sandbox, onReady, onError, ...rest },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const aui = useAui();
    const artifact = useAuiState((s) => s.artifacts.selected);
    const artifactId = artifact?.id;
    // toolCallId of the latest operation that produced this content. Captured
    // at mount time so the iframe's status report routes to the right tool call,
    // even if a subsequent operation re-mounts the iframe.
    const toolCallId = artifact?.toolCallId;
    const contentHash = artifact?.contentHash;
    const mimeType = artifact?.mimeType;
    const content = artifact?.content;
    const renderToHtml = artifact?.renderToHtml;

    // Keep the latest callbacks in refs so we can call them without retrigger
    // the effect (and without missing them on stale closures).
    const onReadyRef = useRef(onReady);
    const onErrorRef = useRef(onError);
    onReadyRef.current = onReady;
    onErrorRef.current = onError;

    // biome-ignore lint/correctness/useExhaustiveDependencies: contentHash captures (mimeType, content) identity — triggers remount when content changes. renderToHtml is sourced from the same spec/mimeType, so it's stable across renders of the same contentHash.
    useEffect(() => {
      if (!content || !mimeType || !containerRef.current || !artifactId) return;
      const scf = new SafeContentFrame(product, {
        enableBrowserCaching: true,
        sandbox: [...(sandbox ?? ["allow-scripts"])],
      });
      let disposed = false;
      const container = containerRef.current;

      const renderPromise: Promise<{
        dispose(): void;
        iframe?: HTMLIFrameElement;
        origin?: string;
      }> = renderToHtml
        ? Promise.resolve(renderToHtml(content)).then((html) =>
            scf.renderHtml(html, container),
          )
        : scf.renderRaw(content, mimeType, container);

      // Accept `aui:artifact:status` only after the RenderedFrame resolves
      // iframe window + origin, so stale messages cannot complete the wrong op.
      let reported = false;
      let iframeWindow: Window | null = null;
      let iframeOrigin: string | null = null;
      let helloTimer: ReturnType<typeof setInterval> | null = null;
      let messageListenerAdded = false;
      const reportFromMessage = (
        ok: boolean,
        error?: ArtifactPrimitivePreview.StatusError,
      ) => {
        if (reported) return;
        reported = true;
        if (toolCallId) {
          aui
            .artifacts()
            .reportOperationStatus(
              toolCallId,
              ok
                ? { ok: true }
                : { ok: false, error: error ?? { message: "Unknown error" } },
            );
        }
        if (ok) {
          onReadyRef.current?.(artifactId);
        } else {
          onErrorRef.current?.(
            artifactId,
            error ?? { message: "Unknown error" },
          );
        }
      };
      const onMessage = (e: MessageEvent) => {
        if (reported) return;
        if (!e.data || e.data.type !== "aui:artifact:status") return;
        if (!iframeWindow || !iframeOrigin) return;
        if (e.source !== iframeWindow) return;
        if (e.origin !== iframeOrigin) return;
        if (e.data.ok) {
          reportFromMessage(true);
        } else {
          reportFromMessage(
            false,
            e.data.error as ArtifactPrimitivePreview.StatusError | undefined,
          );
        }
      };

      renderPromise
        .then((f) => {
          if (disposed) {
            f.dispose();
            return;
          }
          iframeWindow = f.iframe?.contentWindow ?? null;
          iframeOrigin = f.origin ?? null;

          if (!iframeWindow || !iframeOrigin) {
            f.dispose();
            reportFromMessage(false, {
              message:
                "Failed to resolve iframe window or origin for artifact preview",
            });
            return;
          }

          // renderRaw (HTML/SVG/etc.) has no aui:artifact:status protocol —
          // a successful SCF mount is the terminal signal for tool completion.
          if (!renderToHtml) {
            reportFromMessage(true);
            return;
          }

          window.addEventListener("message", onMessage);
          messageListenerAdded = true;

          const win = iframeWindow;
          const target = iframeOrigin;
          let attempts = 0;
          const sendHello = () => {
            if (disposed || reported) {
              if (helloTimer) clearInterval(helloTimer);
              helloTimer = null;
              return;
            }
            try {
              win.postMessage({ type: "aui:artifact:hello" }, target);
            } catch (_) {}
            if (++attempts >= 30 && helloTimer) {
              clearInterval(helloTimer);
              helloTimer = null;
            }
          };
          sendHello();
          helloTimer = setInterval(sendHello, 100);
        })
        .catch((err: unknown) => {
          if (disposed) return;
          reportFromMessage(false, {
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          });
        });

      return () => {
        disposed = true;
        if (messageListenerAdded) {
          window.removeEventListener("message", onMessage);
        }
        if (helloTimer) clearInterval(helloTimer);
        renderPromise.then((f) => {
          if (disposed) f.dispose();
        });
      };
    }, [contentHash, product, artifactId, toolCallId, aui]);

    return <Primitive.div {...rest} ref={mergeRefs(ref, containerRef)} />;
  },
);

ArtifactPrimitivePreview.displayName = "ArtifactPrimitive.Preview";
