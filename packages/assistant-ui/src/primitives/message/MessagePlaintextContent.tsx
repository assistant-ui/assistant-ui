import { useMessageContext } from "../../utils/context/Context";
import { FC } from "react";

export const MessagePlaintextContent: FC = () => {
  const message = useMessageContext();
  return <>{message.content}</>;
};
