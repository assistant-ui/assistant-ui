import type { ReactNode } from "react";

/** One labelled state in a section that shows several side by side. */
export function State({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground font-mono text-[11px]">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Stacks labelled states; each keeps the component's own max width. */
export function States({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export const noop = () => {};
