import { getExternalStoreMessage, useMessage } from "@assistant-ui/react";
import { ComponentType, FC } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import {
  CitationHoverContentProps,
  TrieveCitationHoverContent,
} from "./TrieveCitationHoverContent";
import { TrieveMessage } from "../trieve/TrieveMessage";

export type TrieveCitationProps = {
  node?: any;
  CitationHoverContent?: ComponentType<CitationHoverContentProps> | undefined;
};

export const TrieveCitation: FC<TrieveCitationProps> = ({
  node,
  CitationHoverContent = TrieveCitationHoverContent,
  ...rest
}) => {
  const assistantUiMessage = useMessage();

  const indexString = node.children[0].children[0].value;
  let index;
  try {
    index = parseInt(indexString.replace(/[^0-9]/g, ""), 10);
  } catch {
    return <sup {...rest} />;
  }

  const message = getExternalStoreMessage<TrieveMessage>(assistantUiMessage);
  const citation = message?.citations?.[index];

  if (citation === undefined) return <sup {...rest} />;

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <sup {...rest} />
      </HoverCardTrigger>
      <HoverCardContent>
        <CitationHoverContent citation={citation} position={index} />
      </HoverCardContent>
    </HoverCard>
  );
};
