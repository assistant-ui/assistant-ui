"use client";

import { SignupForm } from "@/components/SignupForm";
import { AssistantSidebar } from "@/components/ui/assistant-ui/assistant-sidebar";
import { Form } from "@/components/ui/form";
import { useAssistantForm, useAssistantInstructions } from "@assistant-ui/react-hook-form";

export default function Home() {
  useAssistantInstructions(
    "Help users sign up for Simon's hackathon."
  )
  const form = useAssistantForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      cityAndCountry: "",
      projectIdea: "",
      proficientTechnologies: "",
    },
  });

  return (
    <AssistantSidebar>
      <div className="h-full overflow-y-scroll">
        <main className="container py-8">
          <h1 className="mb-2 font-extrabold text-2xl">Simon's Hackathon</h1>
          <p>
            I'm hosting a Hackathon on AI UX. Be the first to get an invite!
          </p>

          <Form {...form}>
            <SignupForm />
          </Form>
        </main>
      </div>
    </AssistantSidebar>
  );
}
