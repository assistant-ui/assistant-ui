"use generative";

import { z } from "zod";
import { defineToolkit } from "@assistant-ui/react";
import { UsageToolUI } from "@/components/shared/usage";

// The budget is charged per surface, and only the landing demo opts in, so this
// rides apart from the toolkit every docs surface mounts: an assistant that is
// not counted must not answer for a budget that is.
export default defineToolkit({
  get_usage: {
    description:
      "Report how many conversations the visitor has used today on this demo and how many are left. Call it whenever they ask about their usage, quota, limits, or when the count resets, and answer from what it returns rather than from the transcript.",
    parameters: z.object({}),
    execute: async () => {
      "use client";
      const { readDemoUsage } = await import("@/lib/demo-usage-client");
      const usage = await readDemoUsage();
      if (!usage) throw new Error("The usage budget is not readable here.");
      return {
        conversationsUsedToday: usage.used,
        conversationsAllowedPerDay: usage.limit,
        conversationsRemaining: usage.remaining,
        resetsAt: new Date(usage.resetAt).toISOString(),
        signedIn: usage.signedIn,
        // The cap counts conversations rather than messages, and the model
        // otherwise reports whichever the visitor happened to ask about.
        countedUnit: "conversations, not messages",
      };
    },
    render: UsageToolUI,
  },
});
