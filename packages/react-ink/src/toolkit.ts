import type {
  Toolkit,
  ToolkitDefinition,
  ProviderToolConfig,
  defineToolkit as CoreDefineToolkit,
} from "@assistant-ui/core/react";

/**
 * Runtime `"use generative"` toolkit helpers for Ink.
 *
 * On the web and React Native a `"use generative"` compiler strips
 * `defineToolkit(...)` and the tool markers, splitting a tool's schema, server
 * `execute`, and client `render` across the client/server boundary. An Ink app
 * is a single Node process with no such boundary, so there is nothing to split
 * and no bundler-level compiler to run. These versions therefore resolve the
 * toolkit at runtime: each marker returns a detectable sentinel, and
 * {@link defineToolkit} reads it to set each tool's `type`, exactly as the
 * compiler would. The authoring API (and its typed args) is identical to the web.
 */

const MARKER = Symbol.for("@assistant-ui/react-ink.tool-marker");

type MarkerKind = "human" | "stub" | "provider";

type ToolMarker = {
  [MARKER]: MarkerKind;
  config?: ProviderToolConfig | undefined;
};

const marker = (kind: MarkerKind, config?: ProviderToolConfig): never =>
  ({ [MARKER]: kind, config }) as ToolMarker as never;

const readMarker = (value: unknown): ToolMarker | undefined => {
  if (typeof value === "object" && value !== null && MARKER in value) {
    return value as ToolMarker;
  }
  return undefined;
};

/** Marks a human-in-the-loop tool (the UI supplies the result). */
export function hitlTool(): never {
  return marker("human");
}

/** @deprecated Use {@link hitlTool}. */
export const hitl = hitlTool;

/** Marks a tool whose executor is supplied at runtime by `useAuiToolOverrides`. */
export function stubTool(): never {
  return marker("stub");
}

/** Marks a tool executed by the model provider (e.g. web search). */
export function providerTool(config: ProviderToolConfig): never {
  return marker("provider", config);
}

const MARKER_TYPE = {
  human: "human",
  stub: "frontend",
  provider: "provider",
} as const;

/**
 * Builds a runtime {@link Toolkit} from a `"use generative"`-style definition.
 *
 * A tool's `type` is resolved from its `execute`: `hitlTool()` -> `human`,
 * `stubTool()` -> `frontend` (executor via `useAuiToolOverrides`),
 * `providerTool(...)` -> `provider`, and a plain `execute` function -> `frontend`
 * (it runs in the Ink process). A tool that already carries an explicit `type`
 * (for example a render-only entry or a factory output) is passed through
 * unchanged.
 */
/**
 * Mirrors the authoring checks the `"use generative"` compiler runs at build
 * time, so a malformed tool fails loudly here instead of quietly producing a
 * broken entry that only misbehaves later.
 */
function assertValid(name: string, tool: Record<string, unknown>): void {
  const hasRender = tool["render"] != null;
  const hasRenderText = tool["renderText"] != null;

  if (tool["type"] === "frontend" && !hasRender && !hasRenderText) {
    throw new Error(
      `[assistant-ui] tool "${name}": a frontend tool must declare a ` +
        `"render" or "renderText".`,
    );
  }
  if (tool["type"] === "human" && !hasRender) {
    throw new Error(
      `[assistant-ui] tool "${name}": a human tool must declare a "render" ` +
        `to collect input.`,
    );
  }
}

function defineToolkitRuntime(definition: ToolkitDefinition): Toolkit {
  const toolkit: Record<string, unknown> = {};

  for (const [name, entry] of Object.entries(definition)) {
    const tool = entry as Record<string, unknown>;

    // Already-typed entry (render-only `{ type, render }`, factory output, ...).
    if (typeof tool["type"] === "string") {
      toolkit[name] = tool;
      continue;
    }

    const mark = readMarker(tool["execute"]);
    let resolved: Record<string, unknown>;
    if (mark) {
      const { execute: _execute, ...rest } = tool;
      const config = mark.config ?? {};
      for (const key of Object.keys(config)) {
        if (key in rest) {
          throw new Error(
            `[assistant-ui] tool "${name}": providerTool() config key ` +
              `"${key}" collides with a tool property.`,
          );
        }
      }
      resolved = { ...rest, type: MARKER_TYPE[mark[MARKER]], ...config };
    } else {
      // Plain function execute (or none): runs in-process, so it is a frontend
      // tool. An inner `"use client"` directive in the body is inert at runtime.
      resolved = { type: "frontend", ...tool };
    }

    assertValid(name, resolved);
    toolkit[name] = resolved;
  }

  return toolkit as Toolkit;
}

/**
 * Reuses core's `defineToolkit` type so callers get the same per-tool typed
 * args (inferred from each `parameters` schema), backed by the Ink runtime
 * implementation above.
 */
export const defineToolkit =
  defineToolkitRuntime as unknown as typeof CoreDefineToolkit;
