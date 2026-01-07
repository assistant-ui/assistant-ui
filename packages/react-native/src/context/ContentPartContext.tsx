import { createContext, useContext, FC, PropsWithChildren } from "react";
import type { Unsubscribe } from "@assistant-ui/core";

export type ContentPartRuntimeState = {
  type: string;
  status:
    | { type: "running" }
    | { type: "complete" }
    | { type: "incomplete"; reason: string };
  part: unknown;
};

export type ContentPartRuntime = {
  getState: () => ContentPartRuntimeState;
  subscribe: (callback: () => void) => Unsubscribe;
};

const ContentPartContext = createContext<ContentPartRuntime | null>(null);

export const useContentPartContext = (): ContentPartRuntime => {
  const context = useContext(ContentPartContext);
  if (!context) {
    throw new Error(
      "useContentPartContext must be used within a ContentPartProvider",
    );
  }
  return context;
};

export const useContentPartContextOptional = (): ContentPartRuntime | null => {
  return useContext(ContentPartContext);
};

export type ContentPartProviderProps = PropsWithChildren<{
  runtime: ContentPartRuntime;
}>;

export const ContentPartProvider: FC<ContentPartProviderProps> = ({
  runtime,
  children,
}) => {
  return (
    <ContentPartContext.Provider value={runtime}>
      {children}
    </ContentPartContext.Provider>
  );
};
