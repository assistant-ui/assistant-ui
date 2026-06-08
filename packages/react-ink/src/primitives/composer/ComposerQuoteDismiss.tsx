import { type ReactNode, useCallback } from "react";

import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ComposerQuoteDismissProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ComposerQuoteDismiss = ({
  children,
  ...pressableProps
}: ComposerQuoteDismissProps) => {
  const aui = useAui();

  const handleDismiss = useCallback(() => {
    aui.composer().setQuote(undefined);
  }, [aui]);

  return (
    <Pressable onPress={handleDismiss} {...pressableProps}>
      {children}
    </Pressable>
  );
};
