"use client";

import { SignupForm } from "@/components/SignupForm";
import { AssistantSidebar } from "@/components/assistant-ui/assistant-sidebar";
import { Form } from "@/components/ui/form";
import { useAssistantForm } from "@assistant-ui/react-hook-form";
import {
  useAssistantInstructions,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import Link from "next/link";

const SetFormFieldTool = () => {
  return (
    <p className="text-center font-bold font-mono text-blue-500 text-sm">
      set_form_field(...)
    </p>
  );
};

const SubmitFormTool = () => {
  return (
    <p className="text-center font-bold font-mono text-blue-500 text-sm">
      submit_form(...)
    </p>
  );
};

export default function Home() {
  useAssistantInstructions("Help users sign up for Simon's hackathon.");
  const form = useAssistantForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      cityAndCountry: "",
      projectIdea: "",
      proficientTechnologies: "",
    },
    assistant: {
      tools: {
        set_form_field: {
          render: SetFormFieldTool,
        },
        submit_form: {
          render: SubmitFormTool,
        },
      },
    },
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Fill out the form",
        label: "with sample data",
        prompt: "Please fill out the signup form with sample data for me.",
      },
      {
        title: "Help me register",
        label: "for the hackathon",
        prompt:
          "I'd like to sign up for the hackathon. My name is Jane Doe and my email is jane@example.com.",
      },
    ]),
  });

  return (
    <AuiProvider value={aui}>
      <AssistantSidebar>
        <div className="h-full overflow-y-scroll">
          <main className="container py-8">
            <h1 className="mb-2 font-semibold text-2xl">
              Simon&apos;s Hackathon
            </h1>
            <p>
              I&apos;m hosting a Hackathon on AI UX. Be the first to get an
              invite!
            </p>

            <div className="my-4 font-bold">
              Built with{" "}
              <Link
                href="https://github.com/assistant-ui/assistant-ui"
                className="text-blue-600 underline"
              >
                assistant-ui
              </Link>
              .
            </div>

            <Form {...form}>
              <SignupForm />
            </Form>
          </main>
        </div>
      </AssistantSidebar>
    </AuiProvider>
  );
}
