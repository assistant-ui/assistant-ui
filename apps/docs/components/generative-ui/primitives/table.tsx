import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  Table as UITable,
  TableBody,
  TableCell as UITableCell,
  TableHead,
  TableRow as UITableRow,
} from "@/components/ui/table";
import type { Common } from "./tokens";

export function Table({ children }: Common) {
  const rows = Children.map(children, (child) =>
    isValidElement(child) && child.type === TableRow ? (
      child
    ) : (
      <TableRow>
        <TableCell>{child}</TableCell>
      </TableRow>
    ),
  );
  return (
    <UITable>
      <TableBody>{rows}</TableBody>
    </UITable>
  );
}

export function TableRow({
  header = false,
  children,
}: Common & { header?: boolean }) {
  const cells = Children.map(children, (child) =>
    isValidElement(child) && child.type === TableCell ? (
      cloneElement(child as ReactElement<{ header?: boolean }>, { header })
    ) : (
      <TableCell header={header}>{child}</TableCell>
    ),
  );
  return <UITableRow>{cells}</UITableRow>;
}

const ALIGN_CLASS = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const;

export function TableCell({
  header = false,
  value,
  align,
  colSpan,
  rowSpan,
  width,
  children,
}: Common & {
  header?: boolean;
  value?: string;
  align?: keyof typeof ALIGN_CLASS;
  colSpan?: number;
  rowSpan?: number;
  width?: number | string;
}) {
  const Cell = header ? TableHead : UITableCell;
  const style: CSSProperties | undefined =
    width !== undefined ? { width } : undefined;
  return (
    <Cell
      colSpan={colSpan}
      rowSpan={rowSpan}
      style={style}
      className={align ? ALIGN_CLASS[align] : undefined}
    >
      {value ?? children}
    </Cell>
  );
}
