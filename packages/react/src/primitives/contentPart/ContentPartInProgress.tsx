import { FC, PropsWithChildren } from "react";
import { useContentPart } from "../../context";

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
