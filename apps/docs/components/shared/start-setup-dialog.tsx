"use client";

import { useId, useState, type ReactElement, type ReactNode } from "react";
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

const modes = (
  name: string,
): {
  value: SetupMode;
  title: string;
  detail: string;
  icon: typeof BotIcon;
  recommended?: boolean;
}[] => [
  {
    value: "agent",
    title: "Coding agent",
    detail: `Your agent reads the project and installs ${name} for you.`,
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

const RECOMMENDED_MODE: SetupMode = "agent";

export function StartSetupDialog({
  children,
  location,
  name = "assistant-ui",
  products = ["assistant-ui"],
  instructions,
  manualHref = "/docs/installation",
  trigger = <Button />,
}: {
  children: ReactNode;
  location: string;
  /** The product name in the dialog copy. */
  name?: string;
  /** Catalog slugs the coding-agent path checks out. */
  products?: readonly string[];
  instructions?: string;
  manualHref?: string;
  trigger?: ReactElement;
}) {
  const router = useRouter();
  const beginSetup = useBeginSetup();
  const radioName = useId();
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
    if (mode === "agent") {
      if (instructions) beginSetup(products, instructions);
      else beginSetup(products);
    } else router.push(manualHref);
  };

  return (
    <Dialog open={open} onOpenChange={setOpenAndReset}>
      <DialogTrigger render={trigger}>{children}</DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 motion-reduce:animate-none sm:max-w-[40rem]">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <div className="min-h-0 overflow-y-auto">
            <DialogHeader className="px-6 pt-7 pb-6 sm:px-8 sm:pt-8">
              <span
                role="img"
                aria-label="assistant-ui"
                className="bg-foreground/45 mb-4 block h-[18px] w-[108px] [mask-image:url(/brand/logotype.svg)] [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat]"
              />
              <DialogTitle className={cn(typeSection, "max-w-[22ch] pr-5")}>
                How do you want to set up {name}?
              </DialogTitle>
              <DialogDescription className="mt-1 leading-relaxed">
                Both paths end with the same code in your project.
              </DialogDescription>
            </DialogHeader>
            <fieldset className="grid gap-2 px-6 pb-5 sm:px-8 sm:pb-7">
              <legend className="sr-only">Setup method</legend>
              {modes(name).map((option) => (
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
                    name={radioName}
                    value={option.value}
                    checked={mode === option.value}
                    onChange={() => setMode(option.value)}
                    className="absolute inset-0 cursor-pointer scroll-m-1 appearance-none opacity-0"
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
                      "col-start-3 row-start-1 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
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
          </div>
          <DialogFooter className="border-foreground/10 bg-foreground/[0.025] flex-row items-center justify-end border-t px-6 py-4 sm:px-8">
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
