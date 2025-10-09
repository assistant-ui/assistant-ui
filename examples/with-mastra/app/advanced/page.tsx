"use client";

import { useState } from "react";
import { Thread } from "@/components/assistant-ui/thread";
import { ComposerPrimitive } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { ChefHat, Cloud } from "lucide-react";

export default function AdvancedPage() {
  const [selectedAgent, setSelectedAgent] = useState("chefAgent");

  const agents = [
    { id: "chefAgent", name: "Chef Agent", icon: ChefHat, description: "Cooking and recipe assistance" },
    { id: "weatherAgent", name: "Weather Agent", icon: Cloud, description: "Weather information and forecasts" }
  ];

  return (
    <div className="flex h-full">
      {/* Agent Selection Sidebar */}
      <div className="w-64 border-r border-border bg-muted/50 p-4">
        <h2 className="text-lg font-semibold mb-4">Select Agent</h2>
        <div className="space-y-2">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <Button
                key={agent.id}
                variant={selectedAgent === agent.id ? "default" : "ghost"}
                className="w-full justify-start h-auto p-3"
                onClick={() => setSelectedAgent(agent.id)}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {agent.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border p-4">
          <h1 className="text-xl font-semibold">
            {agents.find(a => a.id === selectedAgent)?.name || "Mastra Agent"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.find(a => a.id === selectedAgent)?.description}
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <Thread />
        </div>
      </div>
    </div>
  );
}