import { CopyButton, PaneHeader, RailTime } from "../ui";
import { MessageItem } from "./MessageItem";
import { messagePlainText } from "./messagePlainText";
import type { MessagePreview } from "./types";

export const messageDetailHeader = (message: MessagePreview) => (
  <PaneHeader
    trailing={
      <>
        <CopyButton
          value={messagePlainText(message)}
          label="Copy message"
          iconOnly
          size="sm"
        />
        <RailTime value={message.createdAt} />
      </>
    }
  >
    <span className="text-foreground capitalize">{message.role}</span>
  </PaneHeader>
);

export const MessageDetailBody = ({ message }: { message: MessagePreview }) => (
  <MessageItem message={message} showHeader={false} />
);
