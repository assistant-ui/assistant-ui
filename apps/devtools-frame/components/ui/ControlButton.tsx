import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

export const ControlButton = ({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={clsx(
      "inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 font-medium text-xs text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:focus-visible:ring-offset-zinc-900 dark:hover:bg-zinc-800",
      className,
    )}
    {...props}
  />
);
