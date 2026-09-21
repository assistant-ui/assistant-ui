"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpenIcon, BotIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBeginSetup } from "@/components/shared/setup-navigation";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type SetupMode = "agent" | "manual";

const MODES: {
  value: SetupMode;
  title: string;
  detail: string;
  icon: typeof BotIcon;
  recommended?: boolean;
}[] = [
  {
    value: "agent",
    title: "Coding agent",
    detail:
      "Your agent reads the project, asks what it needs, and installs while you watch.",
    icon: BotIcon,
    recommended: true,
  },
  {
    value: "manual",
    title: "Manual",
    detail: "Follow the installation guide and run each step yourself.",
    icon: BookOpenIcon,
  },
];

export function StartSetupDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const beginSetup = useBeginSetup();
  const name = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SetupMode | null>(null);

  const confirm = () => {
    if (mode === null) return;
    analytics.cta.clicked(`start_setup_${mode}`, "hero");
    setOpen(false);
    if (mode === "agent") beginSetup(["assistant-ui"]);
    else router.push("/docs/installation");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How do you want to set up assistant-ui?</DialogTitle>
          <DialogDescription>
            Both paths end with the same code in your project.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Setup method</legend>
            {MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "has-focus-visible:ring-ring relative flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors has-focus-visible:ring-2",
                  mode === option.value
                    ? "border-foreground bg-muted/40"
                    : "border-foreground/15 hover:border-foreground/40",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-2">
                  <option.icon aria-hidden className="size-5" />
                  {option.recommended ? (
                    <Badge variant="secondary">Recommended</Badge>
                  ) : null}
                </span>
                <span className="text-[0.9375rem] font-medium">
                  {option.title}
                </span>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  {option.detail}
                </span>
              </label>
            ))}
          </fieldset>
          <DialogFooter className="mt-5">
            <Button type="submit" disabled={mode === null}>
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
