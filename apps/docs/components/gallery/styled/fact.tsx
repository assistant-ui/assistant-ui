export function StyledFact({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-current/50 uppercase">
        {label}
      </span>
      <span className="text-sm font-medium">
        {value}
        {children}
      </span>
    </div>
  );
}
