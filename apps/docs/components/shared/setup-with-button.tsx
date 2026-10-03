"use client";

import { useEffect, useState } from "react";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import {
  SHIPPING_METHODS,
  setShippingMethod,
} from "@/lib/catalog/shipping-store";
import { cn } from "@/lib/utils";

const AGENTS = SHIPPING_METHODS.filter((method) => method.id !== "other");
const ROTATE_MS = 2200;

/** Starts an assistant-ui setup with the coding agent the button is naming when it is pressed. */
export function SetupWithButton({ location }: { location: string }) {
  const beginSetup = useBeginSetup();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % AGENTS.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused]);

  const start = () => {
    analytics.cta.clicked("start_setup_agent", location);
    setShippingMethod(AGENTS[index]!.id);
    beginSetup(["assistant-ui"]);
  };

  return (
    <Button
      aria-label="Set up with your coding agent"
      onClick={start}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      Set up with
      <span aria-hidden className="grid justify-items-start">
        {AGENTS.map((agent, position) => (
          <span
            key={agent.id}
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center gap-1.5 transition-[opacity,translate] duration-300 motion-reduce:transition-none",
              position === index
                ? "translate-y-0 opacity-100"
                : "translate-y-1 opacity-0",
            )}
          >
            <AgentKindIcon kind={agent.id} className="size-4" />
            {agent.name}
          </span>
        ))}
      </span>
    </Button>
  );
}
