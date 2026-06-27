export function StyledButton({
  label,
  buttonStyle,
  block,
  children,
}: {
  label: string;
  buttonStyle?: string;
  block?: boolean;
  $action?: { type: string; [k: string]: unknown };
  $dispatch?: (a: unknown) => unknown;
  children?: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors select-none";
  const styles: Record<string, string> = {
    primary: "bg-foreground text-background",
    secondary: "bg-muted text-foreground",
    outline: "border border-border text-foreground",
    ghost: "text-foreground",
    danger: "bg-red-500 text-white",
  };
  return (
    <button
      className={`${base} ${styles[buttonStyle ?? "primary"]!} ${block ? "w-full" : ""}`}
      onClick={() => {}}
    >
      {label}
      {children}
    </button>
  );
}
