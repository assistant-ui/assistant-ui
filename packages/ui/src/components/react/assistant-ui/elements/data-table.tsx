"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { mono, paper } from "./surfaces";

export interface ModelUsage {
  name: string;
  context: string;
  cost: string;
}

export interface DataTableProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  rows: readonly ModelUsage[];
  cycle: number;
}

export function DataTable({
  rows,
  cycle,
  className,
  ...props
}: DataTableProps) {
  return (
    <div
      data-slot="data-table"
      className={cn(
        paper,
        "w-full max-w-sm overflow-hidden rounded-2xl text-[13px]",
        className,
      )}

      {...props}
    >
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Model usage</caption>
        <thead className="border-foreground/[0.06] border-b">
          <tr>
            <th
              scope="col"
              className={cn(
                mono,
                "text-foreground/35 px-4 pt-3 pb-2 text-start font-normal",
              )}
            >
              Model
            </th>
            <th
              scope="col"
              className={cn(
                mono,
                "text-foreground/35 w-16 px-4 pt-3 pb-2 text-end font-normal",
              )}
            >
              Context
            </th>
            <th
              scope="col"
              className={cn(
                mono,
                "text-foreground/35 w-16 px-4 pt-3 pb-2 text-end font-normal",
              )}
            >
              Cost
            </th>
          </tr>
        </thead>
        <tbody key={cycle}>
          {rows.map((row, index) => (
            <tr
              key={row.name}
              className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both hover:bg-foreground/[0.03] transition-colors duration-300"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <td className="px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="bg-foreground/[0.06] text-foreground/45 flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-medium"
                  >
                    {row.name[0]!}
                  </span>
                  <span className="text-foreground/90 min-w-0 flex-1 truncate">
                    {row.name}
                  </span>
                </div>
              </td>
              <td
                className={cn(
                  mono,
                  "text-foreground/55 w-16 px-4 py-2.5 text-end tabular-nums",
                )}
              >
                {row.context}
              </td>
              <td
                className={cn(
                  mono,
                  "text-foreground/55 w-16 px-4 py-2.5 text-end tabular-nums",
                )}
              >
                {row.cost}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
