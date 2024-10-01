import { TooltipIconButton } from "./tooltip-icon-button";
import { CircleXIcon } from "lucide-react";
import { FC } from "react";
import { usePlaygroundRuntime } from "../../../lib/usePlaygroundRuntime";
import { useContentPartRuntime, useMessageRuntime } from "@assistant-ui/react";

export const RemoveContentPartButton: FC = () => {
  const runtime = usePlaygroundRuntime();

  const messageRuntime = useMessageRuntime();
  const contentPartRuntime = useContentPartRuntime();
  const handleRemove = () => {
    runtime.deleteContentPart(
      messageRuntime.getState().id,
      contentPartRuntime.getState(),
    );
  };

  return (
    <TooltipIconButton tooltip="Remove" side="top" onClick={handleRemove}>
      <CircleXIcon className="size-4" />
    </TooltipIconButton>
  );
};
