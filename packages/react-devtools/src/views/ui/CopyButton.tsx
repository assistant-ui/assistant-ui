import clsx from "clsx";
import { useCopyToClipboard } from "./useCopyToClipboard";

const ClipboardIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="9"
      y="9"
      width="11"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.75"
    />
    <path
      d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const CopyButton = ({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  iconOnly = false,
  size = "default",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string | undefined;
  iconOnly?: boolean;
  size?: "default" | "sm";
}) => {
  const { isCopied, copy } = useCopyToClipboard();
  const empty = !value.trim();
  const iconPx = size === "sm" ? 10 : 12;

  return (
    <button
      type="button"
      disabled={empty}
      aria-label={isCopied ? copiedLabel : label}
      title={isCopied ? copiedLabel : label}
      onClick={(event) => {
        event.stopPropagation();
        copy(value);
      }}
      className={clsx(
        "text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-40",
        iconOnly
          ? size === "sm"
            ? "hover:bg-accent/60 size-4"
            : "hover:bg-accent/60 size-6"
          : "hover:bg-accent/60 h-6 gap-1 px-1.5 text-[10px] font-medium",
        className,
      )}
    >
      <ClipboardIcon size={iconPx} />
      {!iconOnly ? <span>{isCopied ? copiedLabel : label}</span> : null}
    </button>
  );
};
