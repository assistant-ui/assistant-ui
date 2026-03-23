"use client";

import { Collapsible } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TypeTableRow = {
  name: string;
  type: ReactNode;
  typeFull?: ReactNode | undefined;
  description?: ReactNode | undefined;
  default?: string | undefined;
  required: boolean;
  deprecated: boolean;
  children?: { type?: string | undefined; rows: TypeTableRow[] }[] | undefined;
};

function PropName({ row }: { row: TypeTableRow }) {
  return (
    <code
      className={cn(
        "w-1/4 min-w-0 overflow-x-auto whitespace-nowrap bg-transparent! p-0! pe-2 font-medium font-mono text-fd-primary [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,black_calc(100%-12px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        row.deprecated && "text-fd-primary/50 line-through",
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
        "[&>figure]:!my-0 [&_pre]:!bg-transparent [&_pre]:!p-0 [&_code]:!text-[0.8125rem] [&_code]:!bg-transparent [&_code]:!border-0 [&_code]:!p-0 min-w-0 flex-1 overflow-hidden",
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
  const [mounted, setMounted] = useState(false);
  const id = parentId ? `${parentId}-${row.name}` : undefined;

  const hasContent =
    row.description || row.default || row.children?.length || row.typeFull;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const expand = () => {
      if (id && window.location.hash === `#${id}`) {
        setOpen(true);
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    };

    expand();
    window.addEventListener("hashchange", expand);
    return () => window.removeEventListener("hashchange", expand);
  }, [id]);

  // Non-expandable row: render as plain div
  if (!hasContent) {
    return (
      <div
        id={id}
        className="not-prose flex w-full flex-row items-center rounded-xl px-3 py-2"
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
        "group scroll-m-20 overflow-hidden rounded-xl border transition-all",
        open
          ? "not-last:mb-2 bg-fd-background shadow-sm"
          : "border-transparent",
      )}
    >
      <Collapsible.Trigger className="group not-prose relative flex w-full flex-row items-center px-3 py-2 text-start hover:bg-fd-accent">
        <PropName row={row} />
        <TypeCell className="@max-xl:hidden">{row.type}</TypeCell>
        <ChevronDown className="absolute end-2 size-4 text-fd-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>

      <Collapsible.Content
        className={cn(
          "overflow-hidden",
          mounted &&
            "data-[state=closed]:animate-fd-collapsible-up data-[state=open]:animate-fd-collapsible-down",
        )}
      >
        <div className="fd-scroll-container grid grid-cols-[1fr_3fr] gap-y-4 overflow-auto border-t p-3 text-sm">
          <div className="prose prose-no-margin col-span-full text-sm empty:hidden">
            {row.description}
          </div>
          {row.typeFull && (
            <>
              <span className="not-prose pe-2 text-fd-muted-foreground">
                Type
              </span>
              <TypeCell>
                <span className="[&_pre]:inline">{row.typeFull}</span>
              </TypeCell>
            </>
          )}
          {row.default && (
            <>
              <span className="not-prose pe-2 text-fd-muted-foreground">
                Default
              </span>
              <span className="not-prose my-auto pl-4">
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
        "@container flex flex-col overflow-hidden rounded-2xl border bg-fd-card p-1 text-fd-card-foreground text-sm",
        nested ? "bg-fd-secondary/50" : "my-6",
      )}
    >
      <div className="not-prose flex items-center px-3 py-1 font-medium text-fd-muted-foreground">
        <p className="w-1/4 shrink-0 pe-2">Prop</p>
        <p className="@max-xl:hidden min-w-0 flex-1 pl-4">Type</p>
      </div>
      {rows.map((row) => (
        <Item key={row.name} row={row} parentId={id} />
      ))}
    </div>
  );
}
