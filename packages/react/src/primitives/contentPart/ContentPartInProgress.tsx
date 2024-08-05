import { FC, PropsWithChildren } from "react";
import { useContentPartContext } from "../../context";

export type ContentPartPrimitiveInProgressProps = PropsWithChildren;

// TODO should this be renamed to IsRunning?
export const ContentPartPrimitiveInProgress: FC<
  ContentPartPrimitiveInProgressProps
> = ({ children }) => {
  const { useContentPart } = useContentPartContext();
  const isInProgress = useContentPart((c) => c.status.type === "running");

  return isInProgress ? children : null;
};

ContentPartPrimitiveInProgress.displayName = "ContentPartPrimitive.InProgress";
