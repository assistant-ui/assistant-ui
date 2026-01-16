import {
  CircleCheck,
  CircleX,
  Info,
  Lightbulb,
  TriangleAlert,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutType =
  | "info"
  | "warn"
  | "warning"
  | "error"
  | "success"
  | "idea"
  | "tip"
  | "note";

const typeConfig = {
  info: {
    icon: Info,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    iconClassName: "text-blue-500",
  },
  warning: {
    icon: TriangleAlert,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    iconClassName: "text-amber-500",
  },
  error: {
    icon: CircleX,
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    iconClassName: "text-red-500",
  },
  success: {
    icon: CircleCheck,
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
    iconClassName: "text-green-500",
  },
  idea: {
    icon: Lightbulb,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    iconClassName: "text-purple-500",
  },
};

function resolveType(type: CalloutType): keyof typeof typeConfig {
  if (type === "warn") return "warning";
  if (type === "tip" || type === "note") return "info";
  return type as keyof typeof typeConfig;
}

interface CalloutProps extends Omit<ComponentProps<"div">, "title"> {
  type?: CalloutType;
  title?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Callout({
  type: inputType = "info",
  title,
  icon,
  children,
  className,
  ...props
}: CalloutProps) {
  const type = resolveType(inputType);
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "not-prose my-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        config.className,
        className,
      )}
      {...props}
    >
      <div className="mt-0.5 shrink-0">
        {icon ?? <Icon className={cn("size-4", config.iconClassName)} />}
      </div>
      <div className="min-w-0 flex-1 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-current/30 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.8125rem] dark:[&_code]:bg-white/10 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-current/20 [&_kbd]:bg-black/5 [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-mono [&_kbd]:text-[0.8125rem] dark:[&_kbd]:bg-white/5 [&_li]:py-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4">
        {title && <p className="mb-1 font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
