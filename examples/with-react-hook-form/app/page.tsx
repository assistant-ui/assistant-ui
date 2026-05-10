"use client";

import { SignupForm } from "@/components/SignupForm";
import { Thread } from "@/components/assistant-ui/thread";
import { Form } from "@/components/ui/form";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useAssistantForm } from "@assistant-ui/react-hook-form";
import {
  useAssistantInstructions,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";

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

const panelStyle = { overflow: "hidden" } as const;

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
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={60} minSize={40} style={panelStyle}>
          <div className="h-full overflow-y-auto bg-muted/30">
            <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
              <header className="mb-8 space-y-2">
                <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
                  Simon&apos;s Hackathon
                </p>
                <h1 className="font-semibold text-3xl tracking-tight">
                  Apply to join
                </h1>
                <p className="text-muted-foreground">
                  A weekend hackathon on AI UX. Be the first to get an invite.
                </p>
              </header>

              <Form {...form}>
                <SignupForm />
              </Form>
            </main>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40} minSize={30} style={panelStyle}>
          <Thread />
        </ResizablePanel>
      </ResizablePanelGroup>
    </AuiProvider>
  );
}
