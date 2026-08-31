"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { classNames: userClassNames, ...toastOptionsRest } =
    toastOptions ?? {};
  const { theme = "system" } = useTheme() as {
    theme: "light" | "dark" | "system";
  };

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-green-600 dark:text-green-400" />
        ),
        info: <InfoIcon className="size-4 text-blue-600 dark:text-blue-400" />,
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
        ),
        error: <OctagonXIcon className="text-destructive size-4" />,
        loading: (
          <Loader2Icon className="text-muted-foreground size-4 animate-spin" />
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-popover text-popover-foreground ring-foreground/10 flex w-(--width) items-center gap-2.5 rounded-xl p-3.5 font-sans ring-1 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] data-[type=success]:bg-[color-mix(in_oklab,var(--color-green-500)_8%,var(--popover))] data-[type=success]:ring-green-600/40 dark:data-[type=success]:bg-[color-mix(in_oklab,var(--color-green-500)_14%,var(--popover))] dark:data-[type=success]:ring-green-500/40 data-[type=error]:bg-[color-mix(in_oklab,var(--destructive)_8%,var(--popover))] data-[type=error]:ring-destructive/45 dark:data-[type=error]:bg-[color-mix(in_oklab,var(--destructive)_14%,var(--popover))] data-[type=warning]:bg-[color-mix(in_oklab,var(--color-amber-500)_8%,var(--popover))] data-[type=warning]:ring-amber-600/40 dark:data-[type=warning]:bg-[color-mix(in_oklab,var(--color-amber-500)_14%,var(--popover))] dark:data-[type=warning]:ring-amber-500/40 data-[type=info]:bg-[color-mix(in_oklab,var(--color-blue-500)_8%,var(--popover))] data-[type=info]:ring-blue-500/40 dark:data-[type=info]:bg-[color-mix(in_oklab,var(--color-blue-500)_14%,var(--popover))]",
          content: "flex min-w-0 flex-col gap-0.5",
          title: "text-sm font-medium",
          description: "text-muted-foreground text-xs",
          icon: "relative grid size-4 shrink-0 place-items-center",
          actionButton:
            "bg-background border-foreground/15 hover:border-foreground/30 ms-auto h-6 shrink-0 cursor-pointer rounded-md border px-2 text-xs font-medium transition-colors",
          cancelButton:
            "text-muted-foreground hover:text-foreground ms-auto h-6 shrink-0 cursor-pointer rounded-md px-2 text-xs transition-colors",
          closeButton:
            "text-muted-foreground hover:text-foreground order-last ms-2 grid size-5 shrink-0 cursor-pointer place-items-center rounded-md transition-colors",
          ...userClassNames,
        },
        ...toastOptionsRest,
      }}
      {...props}
    />
  );
};

export { Toaster };
