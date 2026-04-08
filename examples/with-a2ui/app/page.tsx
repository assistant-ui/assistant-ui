"use client";

import dynamic from "next/dynamic";
import { Thread } from "@/components/assistant-ui/thread";
import { useAui, AuiProvider, Suggestions } from "@assistant-ui/react";
import { RestaurantToolUI } from "@/components/a2ui/tools/RestaurantToolUI";
import { QuizToolUI } from "@/components/a2ui/tools/QuizToolUI";
import { RecipeToolUI } from "@/components/a2ui/tools/RecipeToolUI";
import { TaskBoardToolUI } from "@/components/a2ui/tools/TaskBoardToolUI";
import { DismissToolUI } from "@/components/a2ui/tools/DismissToolUI";

const Sidebar = dynamic(
  () => import("@/components/a2ui/Sidebar").then((m) => m.Sidebar),
  { ssr: false },
);

function ToolRegistrations() {
  return (
    <>
      <RestaurantToolUI />
      <QuizToolUI />
      <RecipeToolUI />
      <TaskBoardToolUI />
      <DismissToolUI />
    </>
  );
}

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Find restaurants",
        label: "Italian food nearby",
        prompt: "Find me some Italian restaurants nearby",
      },
      {
        title: "Start a quiz",
        label: "test my science knowledge",
        prompt: "Start a science trivia quiz",
      },
      {
        title: "Show me a recipe",
        label: "for pasta carbonara",
        prompt: "Show me a recipe for pasta carbonara",
      },
      {
        title: "Plan my tasks",
        label: "for a weekend project",
        prompt:
          "Help me plan tasks for a weekend home renovation: paint the walls, fix the fence, clean the garage, organize the shed",
      },
    ]),
  });

  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="flex h-dvh">
      <div className="min-w-0 flex-1">
        <ThreadWithSuggestions />
        <ToolRegistrations />
      </div>
      <Sidebar />
    </main>
  );
}
