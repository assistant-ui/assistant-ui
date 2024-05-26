"use client";
import { useEffect, useRef } from "react";
import { useAssistantContext } from "../context/AssistantContext";

export const useOnScrollToBottom = (callback: () => void) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { useThread } = useAssistantContext();
  useEffect(() => {
    return useThread.getState().onScrollToBottom(() => {
      callbackRef.current();
    });
  }, [useThread]);
};
