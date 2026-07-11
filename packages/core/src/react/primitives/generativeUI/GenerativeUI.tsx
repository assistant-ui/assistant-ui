"use client";

import {
  type ComponentType,
  type FC,
  type ReactNode,
  createElement,
  useMemo,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import type {
  GenerativeUINode,
  GenerativeUISpec,
} from "../../../types/message";
import type {
  GenerativeUIComponentRegistry,
  GenerativeUIRenderProps,
} from "../../types/MessagePartComponentTypes";

/**
 * Thrown when a generative-ui spec references a component name that is not
 * present in the consumer-provided allowlist. The allowlist is the security
 * boundary in the same-realm rendering path — there is no fallback by
 * default. Pass `Fallback` to opt into a soft-fail UX.
 */
export class GenerativeUIRenderError extends Error {
  public readonly componentName: string;

  constructor(
    componentName: string,
    message = `Component "${componentName}" is not in the generative-ui allowlist.`,
  ) {
    super(message);
    this.name = "GenerativeUIRenderError";
    this.componentName = componentName;
  }
}

const isObjectNode = (
  node: GenerativeUINode,
): node is Exclude<GenerativeUINode, string> =>
  typeof node === "object" && node !== null;

const renderNode = (
  node: GenerativeUINode | undefined,
  components: GenerativeUIComponentRegistry,
  Fallback: GenerativeUIRenderProps["Fallback"],
  path: string,
): ReactNode => {
  if (node === undefined || node === null) return null;

  if (typeof node === "string") return node;

  if (
    !isObjectNode(node) ||
    !("component" in node) ||
    typeof node.component !== "string"
  ) {
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV !== "production"
    ) {
      console.warn(`[generative-ui] Skipping malformed node at ${path}:`, node);
    }
    return null;
  }

  const { component, props, children, key } = node;

  const Resolved = components[component];
  if (!Resolved) {
    if (Fallback) {
      return <Fallback key={key ?? path} component={component} props={props} />;
    }
    throw new GenerativeUIRenderError(component);
  }

  const renderedChildren = children?.length
    ? children.map((child, i) =>
        renderNode(child, components, Fallback, `${path}/${i}`),
      )
    : undefined;

  return createElement(
    Resolved,
    { ...(props ?? {}), key: key ?? path },
    ...(renderedChildren ?? []),
  );
};

const normalizeRoot = (
  spec: GenerativeUISpec | undefined,
): readonly GenerativeUINode[] => {
  if (!spec || spec.root === undefined || spec.root === null) return [];
  const root = spec.root;
  return Array.isArray(root)
    ? (root as readonly GenerativeUINode[])
    : [root as GenerativeUINode];
};

/**
 * Internal renderer. Resolves a {@link GenerativeUISpec} against the consumer
 * allowlist. Used by `MessagePrimitive.GenerativeUI` and by
 * `MessagePrimitive.Parts` when handling a `generative-ui` part.
 */
export const GenerativeUIRender: FC<GenerativeUIRenderProps> = ({
  spec,
  components,
  Fallback,
}) => {
  const nodes = useMemo(() => normalizeRoot(spec), [spec]);

  return (
    <>
      {nodes.map((node, i) => renderNode(node, components, Fallback, `${i}`))}
    </>
  );
};

GenerativeUIRender.displayName = "GenerativeUIRender";

export namespace MessagePrimitiveGenerativeUI {
  export type Props = {
    /**
     * The component allowlist. Keys are the names referenced in the spec
     * (e.g. `"Card"`, `"Button"`), values are the React components.
     *
     * This is the security boundary — any name not in the allowlist is
     * rejected with {@link GenerativeUIRenderError}.
     */
    components: GenerativeUIComponentRegistry;
    /**
     * Optional override spec. If omitted, the primitive reads the
     * `generative-ui` part from the surrounding `MessagePartProvider` /
     * `PartByIndexProvider` context.
     */
    spec?: GenerativeUISpec | undefined;
    /** Optional fallback for unknown component names. */
    Fallback?:
      | ComponentType<{ component: string; props?: unknown }>
      | undefined;
  };
}

/**
 * Renders a generative-ui message part using a consumer-provided allowlist.
 *
 * The agent emits a `generative-ui` message part containing a JSON spec
 * (see {@link GenerativeUISpec}). This primitive walks the spec and resolves
 * each `component` name against the allowlist. Names not in the allowlist
 * throw {@link GenerativeUIRenderError} unless a `Fallback` is provided.
 *
 * Stream-friendly: a partial spec renders progressively as it is filled in.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.GenerativeUI
 *   components={{ Card: MyCard, Button: MyButton }}
 * />
 * ```
 */
export const MessagePrimitiveGenerativeUI: FC<
  MessagePrimitiveGenerativeUI.Props
> = ({ components, spec, Fallback }) => {
  // Selector reads store state only — combining with the `spec` prop inside
  // the selector closes over a value that may change identity per render and
  // would trigger spurious tearing-detection re-renders in
  // `useSyncExternalStore`.
  const storeSpec = useAuiState((s) => {
    const part = s.part as { type?: string; spec?: GenerativeUISpec };
    return part?.type === "generative-ui" ? part.spec : undefined;
  });
  const partSpec = spec ?? storeSpec;

  if (!partSpec) return null;

  return (
    <GenerativeUIRender
      spec={partSpec}
      components={components}
      Fallback={Fallback}
    />
  );
};

MessagePrimitiveGenerativeUI.displayName = "MessagePrimitive.GenerativeUI";
