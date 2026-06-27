export function StyledDatePicker({
  value,
  min,
  max,
  label,
}: {
  value?: string;
  min?: string;
  max?: string;
  label?: string;
  $action?: { type: string; [k: string]: unknown };
  $dispatch?: (a: unknown) => unknown;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      defaultValue={value}
      min={min}
      max={max}
      className="border-border bg-background focus:border-foreground/30 h-9 w-full rounded-lg border px-3 text-sm outline-none"
    />
  );
}
