import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export const ControlButton = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx(
      "text-foreground hover:bg-accent inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
      className,
    )}
    {...props}
  />
);
