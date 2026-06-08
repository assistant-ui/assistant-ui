import clsx from "clsx";
import type { ReactNode } from "react";
import { JSONPreview } from "../ui";
import { StatusBadge } from "./StatusBadge";
import type { ToolCallPartPreview } from "./types";

const Disclosure = ({
  label,
  defaultOpen,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) => (
  <details open={defaultOpen} className="group">
    <summary className="cursor-pointer list-none text-[10px] font-semibold tracking-wide text-zinc-500 uppercase select-none hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
      <span className="mr-1 inline-block transition-transform group-open:rotate-90">
        ›
      </span>
      {label}
    </summary>
    <div className="mt-1">{children}</div>
  </details>
);

export const ToolCallView = ({ part }: { part: ToolCallPartPreview }) => {
  const awaiting =
    part.status?.type === "requires-action" ||
    part.interrupt !== undefined ||
    (part.approval !== undefined && part.approval.approved === undefined);
  const errored = part.isError === true || part.status?.type === "incomplete";

  return (
    <div
      className={clsx(
        "rounded-md border p-3 text-[11px] transition-colors",
        errored
          ? "border-red-300 bg-red-500/5 dark:border-red-500/40 dark:bg-red-500/10"
          : awaiting
            ? "border-amber-300 bg-amber-500/5 dark:border-amber-500/40 dark:bg-amber-500/10"
            : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300">
          tool
        </span>
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          {part.toolName}
        </span>
        {part.status ? (
          <StatusBadge type={part.status.type} reason={part.status.reason} />
        ) : null}
        {part.isError ? <StatusBadge type="incomplete" reason="error" /> : null}
        {part.mcp !== undefined ? (
          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
            mcp
          </span>
        ) : null}
      </div>

      {part.toolCallId ? (
        <div className="mt-1 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
          {part.toolCallId}
        </div>
      ) : null}

      {awaiting ? (
        <div className="mt-2 rounded border border-amber-300 bg-amber-500/10 p-2 text-amber-800 dark:border-amber-500/40 dark:text-amber-200">
          <div className="text-[10px] font-semibold tracking-wide uppercase">
            {part.approval ? "Awaiting approval" : "Awaiting human input"}
          </div>
          {part.approval ? (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
              {part.approval.id ? <span>id: {part.approval.id}</span> : null}
              <span>
                approved:{" "}
                {part.approval.approved === undefined
                  ? "pending"
                  : String(part.approval.approved)}
              </span>
              {part.approval.isAutomatic !== undefined ? (
                <span>automatic: {String(part.approval.isAutomatic)}</span>
              ) : null}
              {part.approval.reason ? (
                <span>reason: {part.approval.reason}</span>
              ) : null}
            </div>
          ) : null}
          {part.interrupt?.payload !== undefined ? (
            <div className="mt-1">
              <JSONPreview value={part.interrupt.payload} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        <Disclosure label="Arguments" defaultOpen>
          <JSONPreview value={part.args} />
        </Disclosure>

        {part.argsText !== undefined ? (
          <Disclosure label="Raw args text">
            <pre className="rounded bg-zinc-100 p-2 text-[10px] break-words whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
              {part.argsText}
            </pre>
          </Disclosure>
        ) : null}

        {part.hasResult ? (
          <Disclosure label={part.isError ? "Result (error)" : "Result"}>
            <JSONPreview value={part.result} />
          </Disclosure>
        ) : null}

        {part.artifact !== undefined ? (
          <Disclosure label="Artifact">
            <JSONPreview value={part.artifact} />
          </Disclosure>
        ) : null}

        {part.modelContent !== undefined ? (
          <Disclosure label="Model content">
            <JSONPreview value={part.modelContent} />
          </Disclosure>
        ) : null}

        {part.mcp !== undefined ? (
          <Disclosure label="MCP metadata">
            <JSONPreview value={part.mcp} />
          </Disclosure>
        ) : null}

        {part.subMessageCount > 0 ? (
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {part.subMessageCount} nested sub-agent message
            {part.subMessageCount === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    </div>
  );
};
