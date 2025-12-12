import { FC, PropsWithChildren } from "react";
import { useMessage } from "../../hooks/useMessage";

export type MessageIfProps = PropsWithChildren<{
  user?: boolean;
  assistant?: boolean;
  running?: boolean;
  last?: boolean;
}>;

export const MessageIf: FC<MessageIfProps> = ({
  user,
  assistant,
  running,
  last,
  children,
}) => {
  const message = useMessage((state) => state.message);
  const isLast = useMessage((state) => state.isLast);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isRunning =
    message.role === "assistant" && message.status?.type === "running";

  const shouldRender =
    (user === undefined || user === isUser) &&
    (assistant === undefined || assistant === isAssistant) &&
    (running === undefined || running === isRunning) &&
    (last === undefined || last === isLast);

  if (!shouldRender) {
    return null;
  }

  return <>{children}</>;
};
