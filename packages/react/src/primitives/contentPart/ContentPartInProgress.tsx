import { FC, PropsWithChildren } from "react";
import { useContentPart } from "../../context";

export type ContentPartPrimitiveInProgressProps = PropsWithChildren;

export const ContentPartPrimitiveInProgress: FC<
  ContentPartPrimitiveInProgressProps
> = ({ children }) => {
  const isInProgress = useContentPart(
    (c) => c.status.type === "running" || c.status.type === "requires-action",
  );

  return isInProgress ? children : null;
};

ContentPartPrimitiveInProgress.displayName = "ContentPartPrimitive.InProgress";
