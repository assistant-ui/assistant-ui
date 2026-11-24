"use client";

import { Form as FormPrimitive } from "@base-ui/react/form";

import { cn } from "@/lib/utils";

function Form({
  className,
  ...props
}: Omit<FormPrimitive.Props, "className"> & { className?: string }) {
  return (
    <FormPrimitive
      data-slot="form"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

export { Form };
