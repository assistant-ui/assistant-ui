"use client";

import type * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch focus-visible:border-ring focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-foreground/20 data-[state=unchecked]:hover:border-foreground/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative inline-flex shrink-0 items-center rounded-full border transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-1 data-[size=default]:h-[18px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=unchecked]:bg-transparent",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "data-[state=checked]:bg-primary-foreground data-[state=unchecked]:bg-muted-foreground pointer-events-none block rounded-full ring-0 transition-transform duration-200 group-data-[size=default]/switch:size-3 group-data-[size=sm]/switch:size-2 group-data-[size=default]/switch:data-[state=checked]:translate-x-4 group-data-[size=sm]/switch:data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0.5 rtl:group-data-[size=default]/switch:data-[state=checked]:-translate-x-4 rtl:group-data-[size=sm]/switch:data-[state=checked]:-translate-x-3 rtl:data-[state=unchecked]:-translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
