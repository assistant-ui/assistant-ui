"use client";

import {
  AgentWorkspaceProvider,
  WorkspacePrimitive,
} from "@assistant-ui/react-agent";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AgentWorkspaceProvider
      apiKey={process.env["NEXT_PUBLIC_ANTHROPIC_API_KEY"] ?? ""}
    >
      <WorkspacePrimitive.Root>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </WorkspacePrimitive.Root>
    </AgentWorkspaceProvider>
  );
}
