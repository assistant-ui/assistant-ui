import {
  type ComponentType,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import type { PartState } from "../../../store/scopes/part";
import { ChainOfThoughtPartByIndexProvider } from "../../providers/ChainOfThoughtPartByIndexProvider";
import { MessagePartComponent } from "../message/MessageParts";
import type {
  ReasoningMessagePartComponent,
  ToolCallMessagePartComponent,
} from "../../types/MessagePartComponentTypes";

type ChainOfThoughtPartsComponentConfig = {
  /** Component for rendering reasoning parts */
  Reasoning?: ReasoningMessagePartComponent | undefined;
  /** Fallback component for tool-call parts */
  tools?: {
    Fallback?: ToolCallMessagePartComponent | undefined;
  };
  /** Layout component to wrap the rendered parts when expanded */
  Layout?: ComponentType<PropsWithChildren> | undefined;
};

export namespace ChainOfThoughtPrimitiveParts {
  export type Props =
    | {
        /**
         * @deprecated Use the children render function instead.
         */
        components?: ChainOfThoughtPartsComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each part. Receives the part. */
        children: (value: { part: PartState }) => ReactNode;
        components?: never;
      };
}

const ChainOfThoughtPrimitivePartsInner: FC<{
  children: (value: { part: PartState }) => ReactNode;
}> = ({ children }) => {
  const partsLength = useAuiState((s) => s.chainOfThought.parts.length);

  return useMemo(
    () =>
      Array.from({ length: partsLength }, (_, index) => (
        <ChainOfThoughtPartByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) =>
              aui.chainOfThought().part({ index }).getState()
            }
          >
            {(getItem) =>
              children({
                get part() {
                  return getItem();
                },
              })
            }
          </RenderChildrenWithAccessor>
        </ChainOfThoughtPartByIndexProvider>
      )),
    [partsLength, children],
  );
};

/**
 * Renders the parts within a chain of thought, with support for collapsed/expanded states.
 *
 * When collapsed, no parts are shown. When expanded, all parts are rendered
 * using the provided component configuration through the part scope mechanism.
 */
export const ChainOfThoughtPrimitiveParts: FC<
  ChainOfThoughtPrimitiveParts.Props
> = ({ components, children }) => {
  if (children) {
    return (
      <ChainOfThoughtPrimitivePartsInner>
        {children}
      </ChainOfThoughtPrimitivePartsInner>
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
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

  return (
    <ChainOfThoughtPrimitivePartsInner>
      {() =>
        Layout ? (
          <Layout>
            <MessagePartComponent components={messageComponents} />
          </Layout>
        ) : (
          <MessagePartComponent components={messageComponents} />
        )
      }
    </ChainOfThoughtPrimitivePartsInner>
  );
};

ChainOfThoughtPrimitiveParts.displayName = "ChainOfThoughtPrimitive.Parts";
