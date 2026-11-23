"use client";

import { useState } from "react";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import {
  GenerativeUIInstructions,
  generativeUI,
} from "./components/generative-ui";
import { DemoShell, type DemoView } from "./components/shell";

export default function Page() {
  const [view, setView] = useState<DemoView>("thread");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <DocsRuntimeProvider
      devtools={false}
      followUps
      countConversations
      toolkit={generativeUI.toolkit}
    >
      <GenerativeUIInstructions />
      <DemoShell
        view={view}
        onViewChange={setView}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarCollapsedChange={setSidebarCollapsed}
      />
    </DocsRuntimeProvider>
  );
}
