export const JSONPreview = ({ value }: { value: unknown }) => (
  <pre className="bg-muted text-foreground rounded-lg p-3 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
    {JSON.stringify(value, null, 2)}
  </pre>
);
