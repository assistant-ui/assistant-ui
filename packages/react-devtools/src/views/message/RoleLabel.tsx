import clsx from "clsx";

export const RoleLabel = ({
  role,
  compact = false,
}: {
  role: string;
  compact?: boolean;
}) => (
  <span
    className={clsx(
      "shrink-0 leading-none capitalize",
      compact
        ? "text-muted-foreground text-[10px] font-medium"
        : role === "user"
          ? "bg-accent text-foreground rounded px-1.5 py-0.5 text-[11px] font-medium"
          : "text-foreground text-[12px] font-medium",
    )}
  >
    {role}
  </span>
);
