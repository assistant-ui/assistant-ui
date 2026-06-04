"use generative";

import { defineToolkit, externalTool } from "@assistant-ui/react";
import { TerminalIcon } from "lucide-react";
import { z } from "zod";

export default defineToolkit({
  render_html: {
    parameters: z.object({
      code: z.string(),
    }),
    execute: externalTool(),
    render: () => {
      return (
        <div className="bg-primary text-primary-foreground my-2 inline-flex items-center gap-2 rounded-full border px-4 py-2">
          <TerminalIcon className="size-4" />
          render_html(&#123; code: &quot;...&quot; &#125;)
        </div>
      );
    },
  },
});
