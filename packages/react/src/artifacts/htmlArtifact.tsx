"use client";

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

const htmlArtifactParameters = z.object({
  title: z
    .string()
    .describe("A short human-readable title for the artifact.")
    .optional(),
  html: z
    .string()
    .describe(
      "A complete, self-contained HTML document to render in a sandboxed iframe.",
    ),
});

export type HtmlArtifactArgs = z.infer<typeof htmlArtifactParameters>;

export type HtmlArtifactOptions = {
  /** Sandbox + container styling, forwarded to the underlying SafeContentFrame host. */
  sandbox?: SandboxHostConfig;
  /** Upper bound (px) the auto-resize height is clamped to. Defaults to 800. */
  maxHeight?: number;
};

const RESIZE_MESSAGE_TYPE = "aui-artifact:size";

// A self-contained HTML document has no other way to drive auto-resize, so we
// append a reporter that posts its content height to the host on every change.
const RESIZE_REPORTER = `<script>(function(){function r(){try{parent.postMessage({type:"${RESIZE_MESSAGE_TYPE}",height:Math.ceil(document.documentElement.scrollHeight)},"*")}catch(e){}}if(typeof ResizeObserver!=="undefined"){new ResizeObserver(r).observe(document.documentElement)}addEventListener("load",r);r()})();</script>`;

function createHtmlArtifactRender(options: HtmlArtifactOptions) {
  const HtmlArtifact = ({
    args,
    status,
    toolCallId,
  }: ToolCallMessagePartProps<HtmlArtifactArgs, Record<string, never>>) => {
    // Render only once the args have fully arrived, so the iframe mounts once
    // with the complete document rather than reloading on every streamed token.
    if (status.type !== "complete" || typeof args.html !== "string")
      return null;

    return (
      <SandboxHost
        content={{ html: args.html + RESIZE_REPORTER }}
        contentKey={toolCallId}
        sandbox={options.sandbox}
        maxHeight={options.maxHeight}
        containerProps={{ "data-artifact-title": args.title }}
        createBridge={(_frame, host) => ({
          onMessage: (event) => {
            const data = event.data;
            if (
              isRecord(data) &&
              data.type === RESIZE_MESSAGE_TYPE &&
              typeof data.height === "number"
            ) {
              host.setHeight(data.height);
            }
          },
          dispose: () => {},
        })}
      />
    );
  };
  HtmlArtifact.displayName = "HtmlArtifact";
  return HtmlArtifact;
}

/**
 * Generative-UI tool that renders a model-authored HTML document as an
 * artifact: a self-contained page shown on its own surface in a sandboxed
 * iframe (the same SafeContentFrame host the MCP app frame uses).
 *
 * It mirrors the `present` tool from `@assistant-ui/react-generative-ui`: a
 * frontend tool that resolves immediately and whose render is pure display,
 * opted into `display: "standalone"` so the artifact renders outside the
 * chain-of-thought trace. The injected reporter lets the iframe report its
 * height so the frame auto-resizes (clamped to `maxHeight`). Compose it into a
 * `defineToolkit`:
 *
 * ```tsx
 * defineToolkit({ create_html_artifact: htmlArtifact() });
 * ```
 */
export function htmlArtifact(
  options: HtmlArtifactOptions = {},
): ToolDefinition<HtmlArtifactArgs, Record<string, never>> {
  return {
    type: "frontend",
    description:
      "Render an HTML artifact: a complete, self-contained HTML document shown on its own surface in a sandboxed iframe.",
    parameters: htmlArtifactParameters,
    display: "standalone",
    execute: async () => ({}),
    render: createHtmlArtifactRender(options),
  };
}
