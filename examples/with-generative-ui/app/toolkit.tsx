"use generative";

import { defineToolkit, externalTool, humanTool } from "@assistant-ui/react";
import {
  JSONGenerativeUI,
  defaultGenerativeUILibrary,
  defineGenerativeComponents,
} from "@assistant-ui/react-generative-ui";
import { ChartToolUI } from "@/components/chart-tool-ui";
import { DatePickerToolUI } from "@/components/date-picker-tool-ui";
import { ContactFormToolUI } from "@/components/contact-form-tool-ui";
import { DashboardHeader } from "@/components/dashboard-header";
import { LocationToolUI } from "@/components/location-tool-ui";
import { z } from "zod";

const generative = new JSONGenerativeUI({
  library: {
    ...defaultGenerativeUILibrary,
    ...defineGenerativeComponents({
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
  select_date: {
    description:
      "Ask the user to select a date. Use this when you need to collect a date (e.g. for scheduling, booking, deadlines).",
    parameters: z.object({
      prompt: z.string().describe("Message to display to the user"),
      minDate: z.string().optional().describe("Minimum date (ISO string)"),
      maxDate: z.string().optional().describe("Maximum date (ISO string)"),
    }),
    execute: humanTool(),
    render: DatePickerToolUI,
  },
  collect_contact: {
    description:
      "Collect contact information from the user. Use this when you need the user's name, email, or phone number.",
    parameters: z.object({
      prompt: z.string().describe("Message to display to the user"),
      fields: z
        .array(z.enum(["name", "email", "phone"]))
        .describe("Which fields to collect"),
    }),
    execute: humanTool(),
    render: ContactFormToolUI,
  },
  generate_chart: {
    execute: externalTool(),
    render: ChartToolUI,
  },
  show_location: {
    execute: externalTool(),
    render: LocationToolUI,
  },
});
