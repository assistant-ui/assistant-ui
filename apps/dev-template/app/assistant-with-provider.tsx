"use client";

import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
// Import directly from registry via aliases
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ProviderSwitcher } from "@/components/provider-switcher";
import { useProviderContext } from "@/contexts/provider-context";
import { useMemo } from "react";

// Initialize cloud instance if needed
const cloud = new AssistantCloud({
  baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"] || "https://api.assistant-ui.com",
  anonymous: true,
});

export const AssistantWithProvider = () => {
  const { currentProvider, setCurrentProvider } = useProviderContext();

  // Create all runtimes (hooks must be called unconditionally)
  // Vercel AI SDK - explicitly no cloud persistence
  const vercelRuntime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/vercel-ai-sdk",
    })
  });
  
  // Assistant Cloud - with cloud persistence
  const cloudRuntime = useChatRuntime({
    cloud,
    transport: new AssistantChatTransport({
      api: "/api/assistant-cloud",
    }),
  });
  
  // LangGraph - no cloud persistence
  const langGraphRuntime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/langgraph",
    }),
    cloud: undefined,
  });
  
  // MCP - no cloud persistence
  const mcpRuntime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/mcp",
    }),
    cloud: undefined,
  });

  // Select the appropriate runtime based on provider
  const runtime = useMemo(() => {
    switch (currentProvider) {
      case "assistant-cloud":
        return cloudRuntime;
      case "langgraph":
        return langGraphRuntime;
      case "mcp":
        return mcpRuntime;
      case "vercel-ai-sdk":
      default:
        return vercelRuntime;
    }
  }, [currentProvider, vercelRuntime, cloudRuntime, langGraphRuntime, mcpRuntime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {/* Floating Provider Switcher */}
      <ProviderSwitcher
        currentProvider={currentProvider}
        onProviderChange={setCurrentProvider}
      />
      
      <SidebarProvider>
        <div className="flex h-dvh w-full">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="border-border mr-2 h-4"
              />
              <Breadcrumb className="flex-1">
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="https://www.assistant-ui.com/docs/getting-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Dev Template
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Provider Testing</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
