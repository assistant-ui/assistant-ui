import { useContentPartContext, useMessageContext } from "@assistant-ui/react";
import { TooltipIconButton } from "./tooltip-icon-button";
import { CircleXIcon } from "lucide-react";
import { FC } from "react";
import { useGetPlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";

export const RemoveContentPartButton: FC = () => {
  const getPlaygroundRuntime = useGetPlaygroundRuntime();
  const { useMessage } = useMessageContext();
  const { useContentPart } = useContentPartContext();
  const handleRemove = () => {
    getPlaygroundRuntime().deleteContentPart(
      useMessage.getState().message.id,
      useContentPart.getState().part,
    );
  };

  return (
    <TooltipIconButton tooltip="Remove" side="top" onClick={handleRemove}>
      <CircleXIcon className="size-4" />
    </TooltipIconButton>
  );
};
