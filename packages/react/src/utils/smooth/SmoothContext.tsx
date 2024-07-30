import {
  createContext,
  FC,
  forwardRef,
  PropsWithChildren,
  useContext,
  useState,
} from "react";
import { useContentPartContext } from "../../context";
import { ReadonlyStore } from "../../context/ReadonlyStore";
import { create } from "zustand";
import {
  ContentPartStatus,
  ToolCallContentPartStatus,
} from "../../types/AssistantTypes";

type SmoothContextValue = {
  useSmoothStatus: ReadonlyStore<ToolCallContentPartStatus | ContentPartStatus>;
};

const SmoothContext = createContext<SmoothContextValue | null>(null);

const makeSmoothContext = (
  initialState: ContentPartStatus | ToolCallContentPartStatus,
) => {
  const useSmoothStatus = create(() => initialState);
  return { useSmoothStatus };
};

export const SmoothContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const outer = useSmoothContext({ optional: true });
  const { useContentPart } = useContentPartContext();

  const [context] = useState(() =>
    makeSmoothContext(useContentPart.getState().status),
  );

  // do not wrap if there is an outer SmoothContextProvider
  if (outer) return children;

  return (
    <SmoothContext.Provider value={context}>{children}</SmoothContext.Provider>
  );
};

export const withSmoothContextProvider = <C extends React.ComponentType<any>>(
  Component: C,
): C => {
  const Wrapped = forwardRef((props, ref) => {
    return (
      <SmoothContextProvider>
        <Component {...(props as any)} ref={ref} />
      </SmoothContextProvider>
    );
  });
  Wrapped.displayName = Component.displayName;
  return Wrapped as any;
};

export function useSmoothContext(): SmoothContextValue;
export function useSmoothContext(options: {
  optional: true;
}): SmoothContextValue | null;
export function useSmoothContext(options?: { optional: true }) {
  const context = useContext(SmoothContext);
  if (!options?.optional && !context)
    throw new Error(
      "This component must be used within a SmoothContextProvider.",
    );
  return context;
}

export const useSmoothStatus = () => {
  const { useSmoothStatus } = useSmoothContext();
  return useSmoothStatus();
};
