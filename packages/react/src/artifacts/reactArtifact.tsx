"use client";

import { useRef } from "react";
import { z } from "zod";
import type {
  ToolCallMessagePartProps,
  ToolDefinition,
} from "@assistant-ui/core/react";
import {
  SandboxHost,
  type SandboxHostConfig,
} from "../sandbox-host/SandboxHost";
import { isRecord } from "../utils/json/is-json";
import { buildReactArtifactHtml } from "./buildReactArtifactHtml";

const reactArtifactParameters = z.object({
  title: z
    .string()
    .describe("A short human-readable title for the artifact.")
    .optional(),
  code: z
    .string()
    .describe(
      "A single-file React component as TSX/JSX with a default export. It may " +
        "import react, react-dom, and the libraries the host allows; it is " +
        "compiled and rendered in a sandboxed iframe.",
    ),
});

export type ReactArtifactArgs = z.infer<typeof reactArtifactParameters>;

export type ReactArtifactResult = { ok: boolean; error?: string };

export type ReactArtifactOptions = {
  /** Sandbox + container styling, forwarded to the underlying SafeContentFrame host. */
  sandbox?: SandboxHostConfig;
  /** Upper bound (px) the auto-resize height is clamped to. Defaults to 800. */
  maxHeight?: number;
  /** Import map injected into the iframe. Defaults to the minimal React map. */
  importMap?: Record<string, string>;
  /** Load the Tailwind Play CDN in the iframe. Defaults to `true`. */
  tailwind?: boolean;
};

function createReactArtifactRender(options: ReactArtifactOptions) {
  const ReactArtifact = ({
    args,
    status,
    result,
    toolCallId,
    addResult,
  }: ToolCallMessagePartProps<ReactArtifactArgs, ReactArtifactResult>) => {
    const settledRef = useRef(false);

    // Compile once the source has fully arrived. A human tool sits at
    // "requires-action" (input complete, awaiting the render's result) before
    // it ever reaches "complete", so gating on "complete" alone would deadlock:
    // the iframe would never mount, never report status, and never call
    // addResult. Render at both, but not while the args are still streaming.
    if (
      (status.type !== "requires-action" && status.type !== "complete") ||
      typeof args.code !== "string"
    )
      return null;

    const settle = (r: ReactArtifactResult) => {
      if (settledRef.current || result !== undefined) return;
      settledRef.current = true;
      addResult(r);
    };

    return (
      <SandboxHost
        content={{
          html: buildReactArtifactHtml(args.code, {
            ...(options.importMap !== undefined && {
              importMap: options.importMap,
            }),
            ...(options.tailwind !== undefined && {
              tailwind: options.tailwind,
            }),
          }),
        }}
        contentKey={toolCallId}
        sandbox={options.sandbox}
        maxHeight={options.maxHeight}
        containerProps={{ "data-artifact-title": args.title }}
        onError={(err) => settle({ ok: false, error: err.message })}
        createBridge={(_frame, host) => ({
          onMessage: (event) => {
            const data = event.data;
            if (!isRecord(data)) return;
            if (
              data.type === "aui-artifact:size" &&
              typeof data.height === "number"
            ) {
              host.setHeight(data.height);
            } else if (data.type === "aui-artifact:status") {
              if (data.ok === true) {
                settle({ ok: true });
              } else {
                const message =
                  isRecord(data.error) && typeof data.error.message === "string"
                    ? data.error.message
                    : "React artifact failed to render";
                settle({ ok: false, error: message });
              }
            }
          },
          dispose: () => {},
        })}
      />
    );
  };
  ReactArtifact.displayName = "ReactArtifact";
  return ReactArtifact;
}

/**
 * Generative-UI tool that renders a model-authored single-file React component
 * as an artifact, compiled (Babel-in-iframe) and shown on its own surface in a
 * sandboxed iframe (the shared SafeContentFrame host).
 *
 * Unlike {@link htmlArtifact} (a frontend tool that resolves immediately), this
 * is a human-in-the-loop tool whose render is the source of the result: the
 * iframe reports whether it mounted cleanly, and the render calls `addResult`
 * with `{ ok: true }` or `{ ok: false, error }`, so a compile/runtime error
 * feeds back to the model. Human tools render standalone by default. Compose it
 * into a `defineToolkit`:
 *
 * ```tsx
 * defineToolkit({ create_react_artifact: reactArtifact() });
 * ```
 */
export function reactArtifact(
  options: ReactArtifactOptions = {},
): ToolDefinition<ReactArtifactArgs, ReactArtifactResult> {
  return {
    type: "human",
    description:
      "Render a React artifact: a single-file React component (TSX/JSX with a " +
      "default export) compiled and shown on its own surface in a sandboxed " +
      "iframe. The render reports whether it mounted cleanly or hit a " +
      "compile/runtime error.",
    parameters: reactArtifactParameters,
    render: createReactArtifactRender(options),
  };
}
