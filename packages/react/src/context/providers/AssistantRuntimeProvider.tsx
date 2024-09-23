import type { FC, PropsWithChildren } from "react";
import { memo } from "react";
import { AssistantProvider } from "./AssistantProvider";
import { AssistantRuntime } from "../../internal";

type AssistantRuntimeProviderProps = {
  runtime: AssistantRuntime;
};

const AssistantRuntimeProviderImpl: FC<
  PropsWithChildren<AssistantRuntimeProviderProps>
> = ({ children, runtime }) => {
  return <AssistantProvider runtime={runtime}>{children}</AssistantProvider>;
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
