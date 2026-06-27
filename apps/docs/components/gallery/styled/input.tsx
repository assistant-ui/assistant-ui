export function StyledInput({
  placeholder,
  multiline,
  label,
}: {
  placeholder?: string;
  multiline?: boolean;
  label?: string;
  $action?: { type: string; [k: string]: unknown };
  $dispatch?: (a: unknown) => unknown;
}) {
  const cls =
    "border-border bg-background focus:border-foreground/30 w-full rounded-lg border px-3 py-2 text-sm outline-none";
  if (multiline) {
    return (
      <textarea
        aria-label={label}
        placeholder={placeholder}
        className={`${cls} min-h-[80px]`}
      />
    );
  }
  return <input aria-label={label} placeholder={placeholder} className={cls} />;
}
