"use client";

import { Collapsible } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TypeTableRow = {
  name: string;
  type: ReactNode;
  typeFull?: ReactNode | undefined;
  typeRaw: string;
  description?: ReactNode | undefined;
  default?: string | undefined;
  required: boolean;
  deprecated: boolean;
  deprecatedMessage?: string | undefined;
  children?: { type?: string | undefined; rows: TypeTableRow[] }[] | undefined;
};

function PropName({ row }: { row: TypeTableRow }) {
  return (
    <code
      className={cn(
        "text-fd-primary w-1/4 min-w-0 overflow-x-auto whitespace-nowrap font-mono font-medium pe-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-12px),transparent)] bg-transparent! p-0!",
        row.deprecated && "line-through text-fd-primary/50",
      )}
    >
      {row.name}
      {!row.required && "?"}
    </code>
  );
}

function TypeCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 overflow-hidden [&>figure]:!my-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!text-[0.8125rem] [&_code]:!bg-transparent [&_code]:!border-0 [&_code]:!p-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Item({
  row,
  parentId,
}: {
  row: TypeTableRow;
  parentId?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const mounted = useRef(false);
  const id = parentId ? `${parentId}-${row.name}` : undefined;

  const hasContent =
    row.description || row.default || row.children?.length || row.typeFull;

  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (id && window.location.hash === `#${id}`) {
      setOpen(true);
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  }, [id]);

  // Non-expandable row: render as plain div
  if (!hasContent) {
    return (
      <div
        id={id}
        className="flex flex-row items-center w-full px-3 py-2 not-prose rounded-xl"
      >
        <PropName row={row} />
        <TypeCell className="@max-xl:hidden">{row.type}</TypeCell>
      </div>
    );
  }

  return (
    <Collapsible.Root
      id={id}
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && id) window.history.replaceState(null, "", `#${id}`);
      }}
      className={cn(
        "group rounded-xl border overflow-hidden scroll-m-20 transition-all",
        open
          ? "shadow-sm bg-fd-background not-last:mb-2"
          : "border-transparent",
      )}
    >
      <Collapsible.Trigger className="relative flex flex-row items-center w-full group text-start px-3 py-2 not-prose hover:bg-fd-accent">
        <PropName row={row} />
        <TypeCell className="@max-xl:hidden">{row.type}</TypeCell>
        <ChevronDown className="absolute end-2 size-4 text-fd-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>

      <Collapsible.Content
        className={cn(
          "overflow-hidden",
          mounted.current &&
            "data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down",
        )}
      >
        <div className="grid grid-cols-[1fr_3fr] gap-y-4 text-sm p-3 overflow-auto fd-scroll-container border-t">
          <div className="text-sm prose col-span-full prose-no-margin empty:hidden">
            {row.description}
          </div>
          {row.typeFull && (
            <>
              <span className="text-fd-muted-foreground not-prose pe-2">
                Type
              </span>
              <TypeCell>
                <span className="[&_pre]:inline">{row.typeFull}</span>
              </TypeCell>
            </>
          )}
          {row.default && (
            <>
              <span className="text-fd-muted-foreground not-prose pe-2">
                Default
              </span>
              <span className="my-auto not-prose pl-4">
                <code>{row.default}</code>
              </span>
            </>
          )}
          {row.children?.map((child, i) => (
            <div key={child.type ?? i} className="col-span-full my-1">
              <TypeTableClient id={child.type} rows={child.rows} nested />
            </div>
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function TypeTableClient({
  id,
  rows,
  nested,
}: {
  id?: string | undefined;
  rows: TypeTableRow[];
  nested?: boolean | undefined;
}) {
  return (
    <div
      id={id}
      className={cn(
        "@container flex flex-col p-1 bg-fd-card text-fd-card-foreground rounded-2xl border text-sm overflow-hidden",
        nested ? "bg-fd-secondary/50" : "my-6",
      )}
    >
      <div className="flex font-medium items-center px-3 py-1 not-prose text-fd-muted-foreground">
        <p className="w-1/4 shrink-0 pe-2">Prop</p>
        <p className="flex-1 min-w-0 pl-4 @max-xl:hidden">Type</p>
      </div>
      {rows.map((row) => (
        <Item key={row.name} row={row} parentId={id} />
      ))}
    </div>
  );
}
