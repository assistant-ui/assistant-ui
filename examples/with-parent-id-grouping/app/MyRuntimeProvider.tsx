"use client";

import {
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { useState } from "react";

const convertMessage = (message: ThreadMessageLike) => {
  return message;
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [messages, setMessages] = useState<readonly ThreadMessageLike[]>([
    {
      id: "msg-1",
      createdAt: new Date("2024-01-01T10:00:00"),
      role: "user",
      content: [
        {
          type: "text",
          text: "Tell me about climate change and its effects",
        },
      ],
    },
    {
      id: "msg-2",
      createdAt: new Date("2024-01-01T10:00:05"),
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Climate change refers to long-term shifts in global temperatures and weather patterns. Let me provide you with information about its causes and effects.",
        },
        {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "search_research",
          args: { query: "climate change causes" },
          argsText: '{"query": "climate change causes"}',
          result: {
            sources: [
              "https://climate.nasa.gov/causes/",
              "https://www.ipcc.ch/report/ar6/wg1/",
            ],
          },
          parentId: "research-climate-causes",
        },
        {
          type: "source",
          sourceType: "url",
          id: "source-1",
          url: "https://climate.nasa.gov/causes/",
          title: "NASA: Climate Change Causes",
          parentId: "research-climate-causes",
        },
        {
          type: "source",
          sourceType: "url",
          id: "source-2",
          url: "https://www.ipcc.ch/report/ar6/wg1/",
          title: "IPCC Sixth Assessment Report",
          parentId: "research-climate-causes",
        },
        {
          type: "text",
          text: "The main causes of climate change include:",
          parentId: "research-climate-causes",
        },
        {
          type: "text",
          text: "1. **Greenhouse Gas Emissions**: The burning of fossil fuels releases CO2 and other greenhouse gases that trap heat in the atmosphere.",
          parentId: "research-climate-causes",
        },
        {
          type: "text",
          text: "2. **Deforestation**: Removing forests reduces the Earth's capacity to absorb CO2.",
          parentId: "research-climate-causes",
        },
        {
          type: "text",
          text: "Now, let me search for information about the effects of climate change:",
        },
        {
          type: "tool-call",
          toolCallId: "call-2",
          toolName: "search_research",
          args: { query: "climate change effects impacts" },
          argsText: '{"query": "climate change effects impacts"}',
          result: {
            sources: [
              "https://www.who.int/health-topics/climate-change",
              "https://www.unep.org/facts-about-climate-emergency",
            ],
          },
          parentId: "research-climate-effects",
        },
        {
          type: "source",
          sourceType: "url",
          id: "source-3",
          url: "https://www.who.int/health-topics/climate-change",
          title: "WHO: Climate Change and Health",
          parentId: "research-climate-effects",
        },
        {
          type: "source",
          sourceType: "url",
          id: "source-4",
          url: "https://www.unep.org/facts-about-climate-emergency",
          title: "UNEP: Climate Emergency Facts",
          parentId: "research-climate-effects",
        },
        {
          type: "text",
          text: "The major effects of climate change include:",
          parentId: "research-climate-effects",
        },
        {
          type: "text",
          text: "• **Rising Sea Levels**: Melting ice caps and thermal expansion of oceans threaten coastal communities.",
          parentId: "research-climate-effects",
        },
        {
          type: "text",
          text: "• **Extreme Weather Events**: More frequent and intense hurricanes, droughts, and heatwaves.",
          parentId: "research-climate-effects",
        },
        {
          type: "text",
          text: "• **Ecosystem Disruption**: Changes in temperature and precipitation patterns affect biodiversity and agriculture.",
          parentId: "research-climate-effects",
        },
        {
          type: "text",
          text: "In conclusion, climate change is one of the most pressing challenges facing humanity, requiring immediate action on both mitigation and adaptation strategies.",
        },
      ] as any, // Using any to bypass strict typing for demo purposes
      status: { type: "complete", reason: "stop" },
    },
  ]);

  const onNew = async (message: AppendMessage) => {
    if (message.content.length !== 1 || message.content[0]?.type !== "text")
      throw new Error("Only text content is supported");

    const userMessage: ThreadMessageLike = {
      id: `msg-user-${Date.now()}`,
      createdAt: new Date(),
      role: "user",
      content: [{ type: "text", text: message.content[0].text }],
    };
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    // Simulate assistant response with parent IDs
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const assistantMessage: ThreadMessageLike = {
      id: `msg-assistant-${Date.now()}`,
      createdAt: new Date(),
      role: "assistant",
      content: [
        {
          type: "text",
          text: "I understand you want to know more. Let me research that for you.",
        },
        {
          type: "tool-call",
          toolCallId: `call-${Date.now()}`,
          toolName: "search",
          args: { query: "recent developments" },
          argsText: '{"query": "recent developments"}',
          result: { data: "Latest information found" },
          parentId: "new-research",
        },
        {
          type: "text",
          text: "Based on my research:",
          parentId: "new-research",
        },
        {
          type: "text",
          text: "Here's what I found about your query...",
          parentId: "new-research",
        },
        {
          type: "text",
          text: "I hope this information helps!",
        },
      ] as any, // Using any to bypass strict typing for demo purposes
      status: { type: "complete", reason: "stop" },
    };
    setMessages((currentMessages) => [...currentMessages, assistantMessage]);
  };

  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages,
    setMessages,
    onNew,
    convertMessage,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
