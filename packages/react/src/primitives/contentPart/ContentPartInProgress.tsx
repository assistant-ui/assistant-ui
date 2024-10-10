import { FC, PropsWithChildren } from "react";
import { useContentPart } from "../../context";

/**
 * @deprecated Use `ContentPartPrimitive.InProgress.Props` instead. This will be removed in 0.6.
 */
export type ContentPartPrimitiveInProgressProps =
  ContentPartPrimitiveInProgress.Props;

export namespace ContentPartPrimitiveInProgress {
  export type Props = PropsWithChildren;
}

// TODO should this be renamed to IsRunning?
export const ContentPartPrimitiveInProgress: FC<
  ContentPartPrimitiveInProgress.Props
> = ({ children }) => {
  const isInProgress = useContentPart((c) => c.status.type === "running");

  return isInProgress ? children : null;
};

ContentPartPrimitiveInProgress.displayName = "ContentPartPrimitive.InProgress";
