import { CopyButton } from "@/components/shared/copy-button";

const COMMANDS = [
  { label: "New project", command: "npx assistant-ui@latest create" },
  { label: "Existing project", command: "npx assistant-ui@latest init" },
] as const;

export function InstallCommands() {
  return (
    <dl className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-w-0 flex-col gap-3 px-4 py-3">
      {COMMANDS.map(({ label, command }) => (
        <div key={command} className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="flex min-w-0 items-center justify-between gap-3">
            <span className="min-w-0 font-mono text-[14px] tracking-[-0.01em] break-all [font-variant-ligatures:none]">
              {command}
            </span>
            <CopyButton
              text={command}
              label={`Copy ${label.toLowerCase()} command`}
              className="shrink-0"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
