import { FC, PropsWithChildren } from "react";
import { useContentPartContext } from "../../context";

export type ContentPartPrimitiveInProgressProps = PropsWithChildren;

export const ContentPartPrimitiveInProgress: FC<
  ContentPartPrimitiveInProgressProps
> = ({ children }) => {
  const { useContentPart } = useContentPartContext();
  const isInProgress = useContentPart((c) => c.status.type === "running");

  return isInProgress ? children : null;
};

ContentPartPrimitiveInProgress.displayName = "ContentPartPrimitive.InProgress";
