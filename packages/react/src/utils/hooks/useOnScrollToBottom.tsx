"use client";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useAssistantContext } from "../../context/AssistantContext";

export const useOnScrollToBottom = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const { useViewport } = useAssistantContext();
  useEffect(() => {
    return useViewport.getState().onScrollToBottom(() => {
      callbackRef();
    });
  }, [useViewport, callbackRef]);
};
