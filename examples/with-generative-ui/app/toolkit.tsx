"use generative";

import { defineToolkit, externalTool, hitlTool } from "@assistant-ui/react";
import { ChartToolUI } from "@/components/chart-tool-ui";
import { DatePickerToolUI } from "@/components/date-picker-tool-ui";
import { ContactFormToolUI } from "@/components/contact-form-tool-ui";
import { LocationToolUI } from "@/components/location-tool-ui";
import { z } from "zod";

export default defineToolkit({
  select_date: {
    description:
      "Ask the user to select a date. Use this when you need to collect a date (e.g. for scheduling, booking, deadlines).",
    parameters: z.object({
      prompt: z.string().describe("Message to display to the user"),
      minDate: z.string().optional().describe("Minimum date (ISO string)"),
      maxDate: z.string().optional().describe("Maximum date (ISO string)"),
    }),
    execute: hitlTool(),
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
    execute: hitlTool(),
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
