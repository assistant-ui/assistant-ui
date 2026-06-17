import clsx from "clsx";
import { formatWhen, formatWhenLabel } from "../../utils/common";

/** Compact timestamp for narrow rails; full value goes in the tooltip. */
export const RailTime = ({
  value,
  className,
}: {
  value: string | undefined;
  className?: string | undefined;
}) => {
  const when = formatWhen(value);
  if (!when) return null;

  return (
    <time
      dateTime={value}
      title={formatWhenLabel(value)}
      className={clsx(
        "text-muted-foreground font-mono text-[10px] leading-none whitespace-nowrap tabular-nums",
        className,
      )}
    >
      {when}
    </time>
  );
};
