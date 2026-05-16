import type { FC } from "react";
import { Text as InkText } from "ink";
import {
  MessagePrimitiveParts as MessagePrimitivePartsBase,
  MessagePrimitivePartByIndex as MessagePrimitivePartByIndexBase,
  messagePartsDefaultComponents,
} from "@assistant-ui/core/react";
import * as MessagePartPrimitive from "../messagePart";

const inkDefaultComponents = {
  ...messagePartsDefaultComponents,
  Text: () => (
    <>
      <MessagePartPrimitive.Text />
      <MessagePartPrimitive.InProgress>
        <InkText color="yellow"> ...</InkText>
      </MessagePartPrimitive.InProgress>
    </>
  ),
  Image: () => <MessagePartPrimitive.Image />,
  Reasoning: () => <MessagePartPrimitive.Reasoning />,
  Source: () => <MessagePartPrimitive.Source />,
  File: () => <MessagePartPrimitive.File />,
  data: {
    Fallback: () => <MessagePartPrimitive.Data />,
  },
} satisfies MessagePrimitiveParts.Props["components"];

export namespace MessagePrimitiveParts {
  export type Props = MessagePrimitivePartsBase.Props;
}

const mergeWithInkDefaults = (
  components: NonNullable<MessagePrimitiveParts.Props["components"]>,
): NonNullable<MessagePrimitiveParts.Props["components"]> => {
  const shared = {
    Text: components.Text ?? inkDefaultComponents.Text,
    Image: components.Image ?? inkDefaultComponents.Image,
    Source: components.Source ?? inkDefaultComponents.Source,
    File: components.File ?? inkDefaultComponents.File,
    Unstable_Audio:
      components.Unstable_Audio ?? messagePartsDefaultComponents.Unstable_Audio,
    data: components.data
      ? {
          by_name: components.data.by_name,
          Fallback:
            components.data.Fallback ?? inkDefaultComponents.data.Fallback,
        }
      : inkDefaultComponents.data,
    Quote: components.Quote,
    Empty: components.Empty,
  };

  if ("ChainOfThought" in components) {
    return { ...shared, ChainOfThought: components.ChainOfThought };
  }

  return {
    ...shared,
    Reasoning: components.Reasoning ?? inkDefaultComponents.Reasoning,
    tools: components.tools,
    ToolGroup: components.ToolGroup ?? messagePartsDefaultComponents.ToolGroup,
    ReasoningGroup:
      components.ReasoningGroup ?? messagePartsDefaultComponents.ReasoningGroup,
  };
};

/**
 * Renders the parts of a message with Ink-specific default components.
 *
 * Diverges from `@assistant-ui/react` / `@assistant-ui/react-native` by
 * injecting a terminal-safe `data.Fallback` when callers pass `data` without
 * one, so unknown data parts render `[data: name]` instead of nothing.
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = (
  props,
) => {
  if ("children" in props) {
    return (
      <MessagePrimitivePartsBase>{props.children}</MessagePrimitivePartsBase>
    );
  }

  const { components, ...rest } = props;
  return (
    <MessagePrimitivePartsBase
      components={
        components ? mergeWithInkDefaults(components) : inkDefaultComponents
      }
      {...rest}
    />
  );
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

export { MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex };
