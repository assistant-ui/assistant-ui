import type { FC } from "react";
import { Text as InkText } from "ink";
import {
  MessagePrimitiveParts as MessagePrimitivePartsBase,
  MessagePartComponent as MessagePartComponentBase,
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

/**
 * Renders the parts of a message with Ink-specific default components.
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
  const merged = components
    ? {
        Text: components.Text ?? inkDefaultComponents.Text,
        Image: components.Image ?? inkDefaultComponents.Image,
        Reasoning: components.Reasoning ?? inkDefaultComponents.Reasoning,
        Source: components.Source ?? inkDefaultComponents.Source,
        File: components.File ?? inkDefaultComponents.File,
        Unstable_Audio:
          components.Unstable_Audio ??
          messagePartsDefaultComponents.Unstable_Audio,
        // Ink injects a terminal-safe `Fallback` when callers pass `data` without
        // one; intentional divergence from @assistant-ui/react and @assistant-ui/react-native.
        data: components.data
          ? {
              by_name: components.data.by_name,
              Fallback:
                components.data.Fallback ?? inkDefaultComponents.data.Fallback,
            }
          : inkDefaultComponents.data,
        Quote: components.Quote,
        ...("ChainOfThought" in components
          ? { ChainOfThought: components.ChainOfThought }
          : {
              tools: components.tools,
              ToolGroup:
                components.ToolGroup ?? messagePartsDefaultComponents.ToolGroup,
              ReasoningGroup:
                components.ReasoningGroup ??
                messagePartsDefaultComponents.ReasoningGroup,
            }),
        Empty: components.Empty,
      }
    : inkDefaultComponents;

  return <MessagePrimitivePartsBase components={merged as any} {...rest} />;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

export {
  MessagePartComponentBase as MessagePartComponent,
  MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex,
};
