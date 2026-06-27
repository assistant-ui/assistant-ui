export function StyledSelect({
  options,
  placeholder,
  label,
}: {
  options: { label: string; value: string }[];
  placeholder?: string;
  label?: string;
  $action?: { type: string; [k: string]: unknown };
  $dispatch?: (a: unknown) => unknown;
}) {
  return (
    <select
      aria-label={label}
      defaultValue=""
      className="border-border bg-background focus:border-foreground/30 h-9 w-full rounded-lg border px-3 text-sm outline-none"
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
