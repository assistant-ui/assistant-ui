"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, Wand2, Database } from "lucide-react";

const ONBOARDING_KEY = "chatgpt-app-studio-workbench-onboarded";
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    icon: <Layers className="size-5 text-blue-500" />,
    title: "Component Props",
    description:
      "Data the model passes to your widget via tool calls. Edit these to test different inputs.",
  },
  {
    icon: <Wand2 className="size-5 text-purple-500" />,
    title: "Response Scenarios",
    description:
      "Simulate different server responses: success, error, slow network. Test edge cases without a backend.",
  },
  {
    icon: <Database className="size-5 text-green-500" />,
    title: "Widget State",
    description:
      "State your widget persists between interactions. The model sees this in follow-up turns.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isDemoMode) return;
    const hasOnboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!hasOnboarded) {
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = (markComplete: boolean) => {
    if (markComplete) {
      localStorage.setItem(ONBOARDING_KEY, "true");
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && handleDismiss(false)}
    >
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to Tool UI Workbench
          </DialogTitle>
          <DialogDescription className="text-sm">
            Test how your widget behaves inside ChatGPT—without deploying.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {STEPS.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                {step.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{step.title}</div>
                <div className="text-muted-foreground text-xs leading-relaxed">
                  {step.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleDismiss(true)}>
            Skip
          </Button>
          <Button size="sm" onClick={() => handleDismiss(true)}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
