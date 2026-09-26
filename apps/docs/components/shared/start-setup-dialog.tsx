"use client";

import { useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, BookOpenIcon, BotIcon, CheckIcon } from "lucide-react";
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
import { typeSection } from "@/components/shared/type";
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
    detail: "Your agent reads the project and installs assistant-ui for you.",
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

const RECOMMENDED_MODE =
  MODES.find((option) => option.recommended)?.value ?? null;

export function StartSetupDialog({
  children,
  location,
}: {
  children: ReactNode;
  location: string;
}) {
  const router = useRouter();
  const beginSetup = useBeginSetup();
  const name = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SetupMode | null>(RECOMMENDED_MODE);
  const setOpenAndReset = (next: boolean) => {
    setOpen(next);
    if (next) setMode(RECOMMENDED_MODE);
  };

  const confirm = () => {
    if (mode === null) return;
    analytics.cta.clicked(`start_setup_${mode}`, location);
    setOpen(false);
    if (mode === "agent") beginSetup(["assistant-ui"]);
    else router.push("/docs/installation");
  };

  return (
    <Dialog open={open} onOpenChange={setOpenAndReset}>
      <DialogTrigger render={<Button />}>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 motion-reduce:animate-none sm:max-w-[40rem]">
        <DialogHeader className="px-6 pt-7 pb-6 sm:px-8 sm:pt-8">
          <span
            role="img"
            aria-label="assistant-ui"
            className="bg-foreground/45 mb-4 block h-[18px] w-[108px] [mask-image:url(/brand/logotype.svg)] [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat]"
          />
          <DialogTitle className={cn(typeSection, "max-w-[22ch] pr-5")}>
            How do you want to set up assistant-ui?
          </DialogTitle>
          <DialogDescription className="mt-1 leading-relaxed">
            Both paths end with the same code in your project.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <fieldset className="grid min-h-0 gap-2 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-7">
            <legend className="sr-only">Setup method</legend>
            {MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "has-focus-visible:ring-ring relative grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-start gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors duration-150 has-focus-visible:ring-2 motion-reduce:transition-none sm:flex sm:gap-4 sm:p-5",
                  mode === option.value
                    ? "border-foreground/60 bg-foreground/[0.04]"
                    : "border-foreground/10 hover:bg-foreground/[0.025]",
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
                <option.icon
                  aria-hidden
                  className="text-muted-foreground mt-0.5 size-5 shrink-0"
                />
                <span className="contents sm:block sm:min-w-0 sm:flex-1">
                  <span className="col-start-2 col-end-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-medium">
                    {option.title}
                    {option.recommended ? (
                      <span className="text-muted-foreground text-xs font-normal">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground col-span-full block text-sm leading-relaxed sm:mt-1.5 sm:whitespace-nowrap">
                    {option.detail}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-3 right-3 flex size-5 shrink-0 items-center justify-center rounded-full sm:static sm:mt-0.5",
                    mode === option.value
                      ? "bg-foreground text-background"
                      : "border-foreground/20 border",
                  )}
                >
                  {mode === option.value ? (
                    <CheckIcon className="size-3" />
                  ) : null}
                </span>
              </label>
            ))}
          </fieldset>
          <DialogFooter className="border-foreground/10 bg-foreground/[0.025] flex-row items-center justify-between border-t px-6 py-4 sm:justify-between sm:px-8">
            <span className="text-muted-foreground text-xs">
              Your project. Your choice.
            </span>
            <Button type="submit" disabled={mode === null}>
              Continue
              <ArrowRightIcon aria-hidden data-icon="inline-end" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
