"use client";

import { WelcomeCard } from "@/components/examples/welcome-card";
import {
  useTheme,
  useDisplayMode,
  useRequestDisplayMode,
} from "@/lib/workbench/openai-context";

interface WelcomeCardInput {
  title?: string;
  message?: string;
}

export function WelcomeCardSDK(props: Record<string, unknown>) {
  const input = props as WelcomeCardInput;
  const theme = useTheme();
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();

  const title = input.title ?? "Welcome!";
  const message =
    input.message ??
    "This is your ChatGPT App. Edit this component to build something amazing.";

  const handleExpand = () => {
    requestDisplayMode({ mode: "fullscreen" });
  };

  const handleCollapse = () => {
    requestDisplayMode({ mode: "inline" });
  };

  return (
    <WelcomeCard
      title={title}
      message={message}
      theme={theme}
      isFullscreen={displayMode === "fullscreen"}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
    />
  );
}
