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
    <div className="not-prose grid grid-cols-1 gap-x-6 gap-y-1 min-[420px]:grid-cols-2 lg:grid-cols-3">
      {RUNTIMES.map((runtime) => (
        <Link
          key={runtime.href}
          href={runtime.href}
          className="group hover:bg-foreground/[0.025] focus-visible:outline-ring flex min-h-11 items-center gap-3 px-2 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span
            aria-hidden="true"
            className="flex size-5 shrink-0 items-center justify-center"
          >
            {runtime.icon}
          </span>
          <span className="text-foreground/85 group-hover:text-foreground text-sm transition-colors">
            {runtime.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
