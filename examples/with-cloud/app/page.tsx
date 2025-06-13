"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { toolbox } from "./MyRuntimeProvider";
import { useEffect, useState } from "react";

export default function Home() {
  const [mode, setMode] = useState<"weather" | "hi">("weather");
  const hiTool = toolbox.useTool("hi");
  const weatherTool = toolbox.useTool("weather");
  useEffect(() => {
    if (mode === "weather") {
      hiTool.setUI(({ result }) => <div>Hi: {result}</div>);
      weatherTool.setUI(({ result }) => (
        <div>Weather bye: {result?.weather}</div>
      ));
    } else {
      hiTool.setUI(({ result }) => <div>bye!: {result}</div>);
      weatherTool.setUI(({ result }) => (
        <div>Weather hi: {result?.weather}</div>
      ));
    }
  }, [hiTool, mode, weatherTool]);

  return (
    <main className="grid h-dvh grid-cols-[200px,1fr] gap-4 p-4">
      <button
        onClick={() => {
          setMode(mode === "weather" ? "hi" : "weather");
          if (mode === "weather") {
            hiTool.enable();
            // weatherTool.disable();
          } else {
            hiTool.disable();
            // weatherTool.enable();
          }
        }}
      >
        Switch UI ${mode}
      </button>
      <ThreadList />
      <Thread />
    </main>
  );
}
