import type { ReactNode } from "react";

/** Label-only row; put payload in children. */
export const PartDisclosure = ({
  label,
  defaultOpen = false,
  trailing,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}) => (
  <details open={defaultOpen} className="group">
    <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 py-0.5 text-[10px] font-medium select-none">
      <span className="inline-block shrink-0 transition-transform group-open:rotate-90">
        ›
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      {trailing ? (
        <span
          className="flex shrink-0 items-center gap-px"
          onClick={(event) => event.stopPropagation()}
        >
          {trailing}
        </span>
      ) : null}
    </summary>
    <div className="min-w-0 ps-3 pb-0.5">{children}</div>
  </details>
);
