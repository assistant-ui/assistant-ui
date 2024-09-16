import { useContentPartStore, useMessageStore } from "@assistant-ui/react";
import { TooltipIconButton } from "./tooltip-icon-button";
import { CircleXIcon } from "lucide-react";
import { FC } from "react";
import { useGetPlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";

export const RemoveContentPartButton: FC = () => {
  const getPlaygroundRuntime = useGetPlaygroundRuntime();

  const messageStore = useMessageStore();
  const contentPartStore = useContentPartStore();
  const handleRemove = () => {
    getPlaygroundRuntime().deleteContentPart(
      messageStore.getState().message.id,
      contentPartStore.getState().part,
    );
  };

  return (
    <TooltipIconButton tooltip="Remove" side="top" onClick={handleRemove}>
      <CircleXIcon className="size-4" />
    </TooltipIconButton>
  );
};
