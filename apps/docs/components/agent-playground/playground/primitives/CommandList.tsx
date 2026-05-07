export function CommandList({ commands }: { commands: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {commands.map((command, index) => (
        <div key={command} className={`px-4 py-3 font-mono text-sm text-foreground ${index > 0 ? 'border-t' : ''}`}>
          {command}
        </div>
      ))}
    </div>
  );
}
