import {
  createComponent,
  createMemo,
  For,
  type Component,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { isMcpAppUri } from "@assistant-ui/core";
import { getMessagePartKeys } from "@assistant-ui/core/internal";
import {
  resolveToolCallText,
  type PartMethods,
} from "@assistant-ui/core/store";
import { isDevelopment } from "@assistant-ui/core/store/internal";
import type { AssistantState } from "@assistant-ui/store/client";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { PartByIndexProvider } from "./PartByIndexProvider";

const warnedTypes = new Set<string>();

/** The value of the single `tool` prop passed to a Solid tool UI registered in the `tools` scope. The scope types renderers as React components, so Solid renderers require casts at registration and render. A React renderer from a shared toolkit cannot run as a Solid component. Toolkit `renderText` descriptors resolve through the neutral resolver and render string or number results directly; React element results render nothing. */
export type ToolUIProps = {
  part: Extract<AssistantState["part"], { type: "tool-call" }>;
  addResult: PartMethods["addToolResult"];
  resume: PartMethods["resumeToolCall"];
  respondToApproval: PartMethods["respondToToolApproval"];
  /** @deprecated Experimental since 2026-09-23. Not scheduled for removal; the API may change in any release. */
  unstable_recordInteraction?: PartMethods["unstable_recordInteraction"];
};

/** The value of the single `data` prop passed to a Solid data renderer. */
export type DataUIProps<T = unknown> = {
  part: Omit<Extract<AssistantState["part"], { type: "data" }>, "data"> & {
    data: T;
  };
};

/** Renders the current message's parts in order, scoped through {@link PartByIndexProvider}. Registered tool and data renderers receive a single `tool` or `data` prop. Otherwise `components[type]` renders the part, with `components.default` as the fallback. Text always renders its text unless `components.text` overrides it. Components read their part through `useAuiState((s) => s.part)`. */
export const MessagePrimitiveParts = (props: {
  components?: Partial<
    Record<AssistantState["part"]["type"] | "default", Component>
  >;
}): JSX.Element => {
  const partKeys = useAuiState((s) => getMessagePartKeys(s.message.parts));
  const PartView = (): JSX.Element => {
    const aui = useAui();
    const type = useAuiState((s) => s.part.type);
    const text = useAuiState((s) =>
      s.part.type === "text" ? s.part.text : "",
    );
    const toolUI = useAuiState((s) =>
      s.part.type === "tool-call"
        ? (s.optional.tools?.toolUIs[s.part.toolName]?.[0] ?? null)
        : null,
    );
    const mcpAppRender = useAuiState((s) =>
      s.part.type === "tool-call" && isMcpAppUri(s.part.mcp?.app?.resourceUri)
        ? (s.optional.tools?.mcpApp?.render ?? null)
        : null,
    );
    const toolPart = useAuiState((s) =>
      s.part.type === "tool-call" ? s.part : null,
    );
    const dataRenderer = useAuiState((s) => {
      if (s.part.type !== "data") return null;
      const named =
        s.optional.dataRenderers?.renderers[s.part.name]?.[0] ?? null;
      return named ?? s.optional.dataRenderers?.fallbacks[0] ?? null;
    });
    const dataPart = useAuiState((s) =>
      s.part.type === "data" ? s.part : null,
    );
    const component = createMemo(
      () => props.components?.[type()] ?? props.components?.default,
    );
    const textComponent = createMemo(() => props.components?.text);
    return createMemo(() => {
      if (type() === "tool-call") {
        const registration = toolUI();
        const renderText = registration?.renderText;
        if (renderText) {
          return createMemo(() => {
            const resolved = resolveToolCallText(renderText, toolPart()!);
            return typeof resolved === "string" || typeof resolved === "number"
              ? resolved
              : null;
          }) as unknown as JSX.Element;
        }
        const Render = registration?.render ?? mcpAppRender();
        if (Render) {
          return createComponent(
            Render as unknown as Component<{ tool: ToolUIProps }>,
            {
              get tool() {
                return {
                  part: toolPart()!,
                  addResult: aui.part.addToolResult,
                  resume: aui.part.resumeToolCall,
                  respondToApproval: aui.part.respondToToolApproval,
                  ...(aui.part.unstable_recordInteraction && {
                    unstable_recordInteraction:
                      aui.part.unstable_recordInteraction,
                  }),
                } satisfies ToolUIProps;
              },
            },
          );
        }
      }
      if (type() === "data") {
        const Render = dataRenderer();
        if (Render) {
          return createComponent(
            Render as unknown as Component<{ data: DataUIProps }>,
            {
              get data() {
                return { part: dataPart()! } satisfies DataUIProps;
              },
            },
          );
        }
      }
      if (type() === "text") {
        const Text = textComponent();
        return Text
          ? createComponent(Text, {})
          : createComponent(Dynamic, {
              component: "p",
              style: "white-space: pre-line",
              get children() {
                return text();
              },
            });
      }
      const Render = component();
      if (Render) return createComponent(Render, {});
      if (isDevelopment && !warnedTypes.has(type())) {
        warnedTypes.add(type());
        console.warn(
          `MessagePrimitiveParts: no component for part type "${type()}"; the part renders nothing. Add components["${type()}"] or components.default.`,
        );
      }
      return null;
    }) as unknown as JSX.Element;
  };
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return partKeys();
    },
    children: (_key, index) =>
      createComponent(PartByIndexProvider, {
        get index() {
          return index();
        },
        get children() {
          return createComponent(PartView, {});
        },
      }),
  });
};
