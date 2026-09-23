"use client";

import { useEffect } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetupNavigation } from "@/components/shared/setup-navigation";
import { useCheckoutSession } from "@/lib/checkout/session-store";

export function SetupBackButton({ className }: { className?: string }) {
  const { leaveSetup } = useSetupNavigation();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Back, setup keeps running"
      title="Setup keeps running"
      className={className}
      onClick={leaveSetup}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Back
    </Button>
  );
}

export function SetupBackdropButton() {
  const { leaveSetup } = useSetupNavigation();
  const active = useCheckoutSession() !== null;
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[role="dialog"]') !== null) return;
      leaveSetup();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, leaveSetup]);
  if (!active) return null;
  return (
    <div className="absolute top-4 left-4 hidden items-center gap-2 sm:top-8 sm:left-8 sm:flex">
      <SetupBackButton />
      <span aria-hidden="true" className="text-muted-foreground text-xs">
        Setup keeps running
      </span>
    </div>
  );
}
