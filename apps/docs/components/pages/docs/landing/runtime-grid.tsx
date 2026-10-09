import Link from "next/link";
import { MoreHorizontal, Server } from "lucide-react";
import type { ReactNode } from "react";
import { A2AIcon } from "@/components/icons/a2a";
import { AdkIcon } from "@/components/icons/adk";
import { AguiIcon } from "@/components/icons/agui";
import { LangChainIcon } from "@/components/icons/langchain";
import { LangGraphIcon } from "@/components/icons/langgraph";
import { OpenCodeIcon } from "@/components/icons/opencode";
import { VercelIcon } from "@/components/icons/vercel";

export const RUNTIMES: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "Vercel AI SDK",
    href: "/docs/runtimes/ai-sdk/overview",
    icon: <VercelIcon width={20} height={20} />,
  },
  {
    label: "LangGraph",
    href: "/docs/runtimes/langgraph/overview",
    icon: (
      <LangGraphIcon
        width={20}
        height={20}
        className="text-[#1C3C3C] dark:text-[#5b9595]"
      />
    ),
  },
  {
    label: "LangChain",
    href: "/docs/runtimes/langchain",
    icon: <LangChainIcon width={20} height={20} className="text-[#7FC8FF]" />,
  },
  {
    label: "Eve",
    href: "/docs/runtimes/eve/overview",
    icon: <VercelIcon width={20} height={20} />,
  },
  {
    label: "Google ADK",
    href: "/docs/runtimes/google-adk/overview",
    icon: <AdkIcon width={20} height={20} />,
  },
  {
    label: "AG-UI",
    href: "/docs/runtimes/ag-ui/overview",
    icon: <AguiIcon width={20} height={20} />,
  },
  {
    label: "A2A",
    href: "/docs/runtimes/a2a/overview",
    icon: <A2AIcon width={20} height={20} />,
  },
  {
    label: "OpenCode",
    href: "/docs/runtimes/opencode/overview",
    icon: <OpenCodeIcon width={20} height={20} />,
  },
  {
    label: "Your own server",
    href: "/docs/runtimes/custom/overview",
    icon: <Server className="size-5" />,
  },
  {
    label: "Compare all",
    href: "/docs/runtimes/pick-a-runtime",
    icon: <MoreHorizontal className="size-5" />,
  },
];

export function RuntimeGrid() {
  return (
    <div className="not-prose grid grid-cols-3 gap-2 sm:grid-cols-5">
      {RUNTIMES.map((runtime) => (
        <Link
          key={runtime.href}
          href={runtime.href}
          className="group border-border/60 hover:border-foreground/15 hover:bg-muted/50 flex flex-col items-center justify-center gap-2.5 rounded-xl border px-2 py-5 transition-colors"
        >
          <span className="flex size-5 items-center justify-center">
            {runtime.icon}
          </span>
          <span className="text-muted-foreground group-hover:text-foreground text-center text-xs transition-colors">
            {runtime.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
