import { createContext, type Accessor } from "solid-js";

type ViewportContext = {
  isAtBottom: Accessor<boolean>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  registerContentInset: (measure?: () => number) => {
    setHeight: (height: number) => void;
    unregister: () => void;
  };
};

export const ViewportContext = createContext<ViewportContext>();
