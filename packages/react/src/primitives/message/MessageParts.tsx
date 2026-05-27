"use client";

import type { FC } from "react";
import type { Library } from "@openuidev/react-lang";
import {
  MessagePrimitiveParts as MessagePrimitivePartsBase,
  MessagePartComponent as MessagePartComponentBase,
  MessagePrimitivePartByIndex as MessagePrimitivePartByIndexBase,
  messagePartsDefaultComponents,
} from "@assistant-ui/core/react";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress";
import { MessagePrimitiveGenerativeUI } from "../generativeUI/GenerativeUI";

const webDefaultComponents = {
  ...messagePartsDefaultComponents,
  Text: () => (
    <p style={{ whiteSpace: "pre-line" }}>
      <MessagePartPrimitiveText />
      <MessagePartPrimitiveInProgress>
        <span style={{ fontFamily: "revert" }}>{" \u25CF"}</span>
      </MessagePartPrimitiveInProgress>
    </p>
  ),
  Image: () => <MessagePartPrimitiveImage />,
} satisfies MessagePrimitivePartsBase.Props["components"];

export namespace MessagePrimitiveParts {
  export type Props = MessagePrimitivePartsBase.Props & {
    /** When set, merges a default OpenUI generative-ui slot. */
    library?: Library;
  };
}

/**
 * Renders the parts of a message with web-specific default components.
 */
export const MessagePrimitiveParts: FC<MessagePrimitiveParts.Props> = (
  props,
) => {
  if ("children" in props) {
    return (
      <MessagePrimitivePartsBase>{props.children}</MessagePrimitivePartsBase>
    );
  }

  const { components, library, ...rest } = props;
  const defaultGenerativeUI = library
    ? () => <MessagePrimitiveGenerativeUI library={library} />
    : undefined;

  const merged = components
    ? {
        Text: components.Text ?? webDefaultComponents.Text,
        Image: components.Image ?? webDefaultComponents.Image,
        Reasoning:
          components.Reasoning ?? messagePartsDefaultComponents.Reasoning,
        Source: components.Source ?? messagePartsDefaultComponents.Source,
        File: components.File ?? messagePartsDefaultComponents.File,
        Unstable_Audio:
          components.Unstable_Audio ??
          messagePartsDefaultComponents.Unstable_Audio,
        ...("ChainOfThought" in components
          ? { ChainOfThought: components.ChainOfThought }
          : {
              tools: components.tools,
              data: components.data,
              ToolGroup:
                components.ToolGroup ?? messagePartsDefaultComponents.ToolGroup,
              ReasoningGroup:
                components.ReasoningGroup ??
                messagePartsDefaultComponents.ReasoningGroup,
            }),
        Empty: components.Empty,
        Quote: components.Quote,
        generativeUI: components.generativeUI ?? defaultGenerativeUI,
      }
    : library
      ? { ...webDefaultComponents, generativeUI: defaultGenerativeUI }
      : webDefaultComponents;

  return <MessagePrimitivePartsBase components={merged as any} {...rest} />;
};

MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";

// Re-export everything else unchanged
export {
  MessagePartComponentBase as MessagePartComponent,
  MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex,
};
