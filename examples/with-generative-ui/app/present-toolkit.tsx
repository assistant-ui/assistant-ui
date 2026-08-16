"use generative";

import { defineToolkit } from "@assistant-ui/react";
import {
  JSONGenerativeUI,
  defaultGenerativeUILibrary,
  defineGenerativeComponents,
} from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/assistant-ui/generative-ui";
import { DashboardHeader } from "@/components/dashboard-header";
import { z } from "zod";

const markdown = defaultGenerativeUILibrary.Markdown!;

const generative = new JSONGenerativeUI({
  library: {
    ...defaultGenerativeUILibrary,
    ...defineGenerativeComponents({
      Markdown: {
        properties: markdown.properties,
        streamProperties: markdown.streamProperties,
        description:
          "A markdown string, rendered with GitHub-flavored markdown.",
        render: styledGenerativeUILibrary.Markdown!.render,
      },
      DashboardHeader: {
        description:
          "A heading for a dashboard, with an optional description and reporting period.",
        properties: z.object({
          title: z.string().describe("The dashboard title."),
          description: z
            .string()
            .optional()
            .describe("A short description of the dashboard."),
          period: z
            .string()
            .optional()
            .describe("The reporting period shown beside the title."),
        }),
        render: (props) => <DashboardHeader {...props} />,
      },
    }),
  },
});

export default defineToolkit({
  present: generative.present({ display: "standalone" }),
});
