"use client";

import * as React from "react";
import { Field as FieldPrimitive } from "@base-ui/react/field";

import { cn } from "@/lib/utils";

/*
 * shadcn's Field look on Base UI's Field, so a field takes part in a Base UI
 * Form: its `name` picks up the Form's `errors`, and a FieldError with no
 * `errors` of its own shows the browser's message for a value that fails.
 */

function Field({
  className,
  ...props
}: Omit<FieldPrimitive.Root.Props, "className"> & { className?: string }) {
  return (
    <FieldPrimitive.Root
      data-slot="field"
      className={cn("group/field flex w-full flex-col gap-2", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: Omit<FieldPrimitive.Label.Props, "className"> & { className?: string }) {
  return (
    <FieldPrimitive.Label
      data-slot="field-label"
      className={cn(
        "flex w-fit gap-2 text-sm leading-snug font-medium group-data-disabled/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function FieldDescription({
  className,
  ...props
}: Omit<FieldPrimitive.Description.Props, "className"> & {
  className?: string;
}) {
  return (
    <FieldPrimitive.Description
      data-slot="field-description"
      className={cn(
        "text-muted-foreground text-[0.8125rem] leading-normal",
        className,
      )}
      {...props}
    />
  );
}

const errorClass = "text-destructive text-[0.8125rem] leading-normal";

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  if (children === undefined && errors === undefined)
    return (
      <FieldPrimitive.Error
        data-slot="field-error"
        className={cn(errorClass, className)}
        {...props}
      />
    );

  const messages = [
    ...new Set(errors?.map((error) => error?.message).filter(Boolean)),
  ];
  if (children === undefined && messages.length === 0) return null;

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(errorClass, className)}
      {...props}
    >
      {children ??
        (messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className="ms-4 flex list-disc flex-col gap-1">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export { Field, FieldDescription, FieldError, FieldLabel };
