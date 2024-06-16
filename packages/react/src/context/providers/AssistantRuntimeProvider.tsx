import type { FC, PropsWithChildren } from "react";
import { memo } from "react";
import type { AssistantRuntime } from "../../runtime/core/AssistantRuntime";
import { AssistantProvider } from "./AssistantProvider";

type AssistantRuntimeProviderProps = {
  runtime: AssistantRuntime;
};

const AssistantRuntimeProviderImpl: FC<
  PropsWithChildren<AssistantRuntimeProviderProps>
> = ({ children, runtime }) => {
  return <AssistantProvider runtime={runtime}>{children}</AssistantProvider>;
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
