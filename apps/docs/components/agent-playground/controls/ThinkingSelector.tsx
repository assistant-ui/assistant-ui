import type { ThinkingLevel } from '@/components/agent-playground/augment/commands';

const thinkingOptions: Array<{ value: ThinkingLevel; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
];

export function ThinkingSelector({
  value,
  onChange,
}: {
  value?: string | undefined;
  onChange: (level: ThinkingLevel) => void;
}) {
  const selected = thinkingOptions.some((option) => option.value === value) ? (value as ThinkingLevel) : 'medium';

  return (
    <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
      Thinking
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value as ThinkingLevel)}
        className="bg-transparent text-foreground outline-none"
      >
        {thinkingOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
