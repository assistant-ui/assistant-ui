export function ModeSelector({
  modeId,
  onChange,
}: {
  modeId?: string | undefined;
  onChange: (modeId: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-muted-foreground text-xs">
      Mode
      <select
        value={modeId ?? "build"}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-foreground outline-none"
      >
        <option value="build">Build</option>
        <option value="plan">Plan</option>
        <option value="fast">Fast</option>
      </select>
    </label>
  );
}
