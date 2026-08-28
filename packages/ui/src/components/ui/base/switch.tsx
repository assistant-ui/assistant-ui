"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch focus-visible:border-ring focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-unchecked:border-foreground/20 data-unchecked:hover:border-foreground/35 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 relative inline-flex shrink-0 items-center rounded-full border transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-1 aria-invalid:ring-1 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:bg-transparent data-[size=default]:h-[18px] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="data-checked:bg-primary-foreground data-unchecked:bg-muted-foreground pointer-events-none block rounded-full ring-0 transition-transform duration-200 group-data-[size=default]/switch:size-3 group-data-[size=sm]/switch:size-2 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-3 data-unchecked:translate-x-0.5 rtl:group-data-[size=default]/switch:data-checked:-translate-x-4 rtl:group-data-[size=sm]/switch:data-checked:-translate-x-3 rtl:data-unchecked:-translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
