import type { FC, PropsWithChildren } from "react";
import { memo } from "react";
import type { AssistantRuntime } from "../../runtime/core/AssistantRuntime";
import { ThreadProvider } from "./ThreadProvider";

type AssistantRuntimeProviderProps = {
  runtime: AssistantRuntime;
};

const AssistantRuntimeProviderImpl: FC<
  PropsWithChildren<AssistantRuntimeProviderProps>
> = ({ children, runtime }) => {
  return <ThreadProvider runtime={runtime}>{children}</ThreadProvider>;
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
