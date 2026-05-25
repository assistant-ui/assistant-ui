"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

type MessageProps = {
  message: UIMessage;
};

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm break-words whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <p key={i}>{part.text}</p>;
          }
          return null;
        })}
      </div>
    </div>
  );
}
