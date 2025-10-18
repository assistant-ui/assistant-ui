export const JSONPreview = ({ value }: { value: unknown }) => (
  <pre className="rounded-lg bg-zinc-100 p-3 text-[11px] leading-relaxed break-words whitespace-pre-wrap text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
    {JSON.stringify(value, null, 2)}
  </pre>
);
