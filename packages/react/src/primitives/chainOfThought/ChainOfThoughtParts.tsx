"use client";

import {
  type ComponentType,
  type FC,
  type PropsWithChildren,
  useMemo,
} from "react";
import { useAuiState } from "@assistant-ui/store";
import { ChainOfThoughtPartByIndexProvider } from "../../context/providers/ChainOfThoughtPartByIndexProvider";
import { MessagePartComponent } from "../message/MessageParts";
import type {
  ReasoningMessagePartComponent,
  ToolCallMessagePartComponent,
} from "../../types/MessagePartComponentTypes";

export namespace ChainOfThoughtPrimitiveParts {
  export type Props = {
    /**
     * Component configuration for rendering chain of thought parts.
     */
    components?: {
      /** Component for rendering reasoning parts */
      Reasoning?: ReasoningMessagePartComponent | undefined;
      /** Fallback component for tool-call parts */
      tools?: {
        Fallback?: ToolCallMessagePartComponent | undefined;
      };
      /** Layout component to wrap the rendered parts when expanded */
      Layout?: ComponentType<PropsWithChildren> | undefined;
    };
  };
}

/**
 * Renders the parts within a chain of thought, with support for collapsed/expanded states.
 *
 * When collapsed, no parts are shown. When expanded, all parts are rendered
 * using the provided component configuration through the part scope mechanism.
 *
 * @example
 * ```tsx
 * <ChainOfThoughtPrimitive.Parts
 *   components={{
 *     Reasoning: ({ text }) => <p className="reasoning">{text}</p>,
 *     tools: {
 *       Fallback: ({ toolName }) => <div>Tool: {toolName}</div>
 *     }
 *   }}
 * />
 * ```
 */
export const ChainOfThoughtPrimitiveParts: FC<
  ChainOfThoughtPrimitiveParts.Props
> = ({ components }) => {
  const partsLength = useAuiState((s) => s.chainOfThought.parts.length);

  const messageComponents = useMemo(
    () => ({
      Reasoning: components?.Reasoning,
      tools: {
        Fallback: components?.tools?.Fallback,
      },
    }),
    [components?.Reasoning, components?.tools?.Fallback],
  );

  const Layout = components?.Layout;

  const elements = useMemo(() => {
    return Array.from({ length: partsLength }, (_, index) => (
      <ChainOfThoughtPartByIndexProvider key={index} index={index}>
        {Layout ? (
          <Layout>
            <MessagePartComponent components={messageComponents} />
          </Layout>
        ) : (
          <MessagePartComponent components={messageComponents} />
        )}
      </ChainOfThoughtPartByIndexProvider>
    ));
  }, [partsLength, messageComponents, Layout]);

  return <>{elements}</>;
};

ChainOfThoughtPrimitiveParts.displayName = "ChainOfThoughtPrimitive.Parts";
