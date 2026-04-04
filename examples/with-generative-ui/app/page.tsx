"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAui,
  useAssistantTool,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { z } from "zod";
import { ChartToolUI } from "@/components/chart-tool-ui";
import { DatePickerToolUI } from "@/components/date-picker-tool-ui";
import { ContactFormToolUI } from "@/components/contact-form-tool-ui";
import { LocationToolUI } from "@/components/location-tool-ui";

// Register frontend tool schemas (no execute — resolved via addResult in the UI)
function FrontendTools() {
  useAssistantTool({
    toolName: "select_date",
    description:
      "Ask the user to select a date. Use this when you need to collect a date (e.g. for scheduling, booking, deadlines).",
    parameters: z.object({
      prompt: z.string().describe("Message to display to the user"),
      minDate: z.string().optional().describe("Minimum date (ISO string)"),
      maxDate: z.string().optional().describe("Maximum date (ISO string)"),
    }),
  });

  useAssistantTool({
    toolName: "collect_contact",
    description:
      "Collect contact information from the user. Use this when you need the user's name, email, or phone number.",
    parameters: z.object({
      prompt: z.string().describe("Message to display to the user"),
      fields: z
        .array(z.enum(["name", "email", "phone"]))
        .describe("Which fields to collect"),
    }),
  });

  return null;
}

export default function Home() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Show a bar chart",
        label: "of quarterly revenue",
        prompt:
          "Create a bar chart showing quarterly revenue: Q1 $45k, Q2 $52k, Q3 $61k, Q4 $58k",
      },
      {
        title: "Pick a date",
        label: "for a meeting",
        prompt: "I need to schedule a meeting. Ask me to pick a date.",
      },
      {
        title: "Collect my contact info",
        label: "name, email, phone",
        prompt:
          "I want to sign up for the newsletter. Ask for my name, email, and phone number.",
      },
      {
        title: "Show me on the map",
        label: "the Eiffel Tower",
        prompt: "Show me the Eiffel Tower on a map",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {/* Frontend tools: register schemas, resolved via addResult in UI */}
      <FrontendTools />
      {/* Tool UIs: render components for each tool call */}
      <ChartToolUI />
      <LocationToolUI />
      <DatePickerToolUI />
      <ContactFormToolUI />
      <main className="h-full">
        <Thread />
      </main>
    </AssistantRuntimeProvider>
  );
}
