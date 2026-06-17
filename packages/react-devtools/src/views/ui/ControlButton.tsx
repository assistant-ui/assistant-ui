import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export const ControlButton = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx(
      "text-muted-foreground hover:bg-accent hover:text-foreground border-border inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium transition-colors",
      className,
    )}
    {...props}
  />
);
