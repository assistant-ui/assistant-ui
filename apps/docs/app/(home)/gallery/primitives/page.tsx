"use client";

import { defaultGenerativeUILibrary } from "@assistant-ui/react-generative-ui";
import { renderGenerativeUI } from "@assistant-ui/react-generative-ui";
import { styledGenerativeUILibrary } from "@/components/gallery/styled";

const EXAMPLE_SPECS: Record<string, unknown> = {
  Header: { $type: "Header", text: "Hello World", size: "xl" },
  Text: {
    $type: "Text",
    value: "A run of text.",
    size: "md",
    weight: "normal",
  },
  Caption: { $type: "Caption", value: "Secondary, de-emphasized text." },
  Image: {
    $type: "Image",
    src: "https://placehold.co/300x200",
    alt: "Placeholder",
    size: "md",
  },
  Divider: { $type: "Divider" },
  Fact: { $type: "Fact", label: "Status", value: "Open" },
  Button: { $type: "Button", label: "Click me", buttonStyle: "primary" },
  Select: {
    $type: "Select",
    placeholder: "Choose...",
    options: [
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ],
  },
  Input: { $type: "Input", placeholder: "Type here..." },
  DatePicker: { $type: "DatePicker", value: "2026-06-26" },
  Card: {
    $type: "Card",
    title: "A Card",
    children: { $type: "Text", value: "Content inside." },
  },
  Col: {
    $type: "Col",
    gap: 2,
    children: [
      { $type: "Text", value: "First" },
      { $type: "Text", value: "Second" },
    ],
  },
  Row: {
    $type: "Row",
    gap: 2,
    children: [
      { $type: "Badge", value: "A" },
      { $type: "Badge", value: "B" },
    ],
  },
  Spacer: { $type: "Spacer" },
  Badge: { $type: "Badge", value: "New", variant: "secondary" },
  Table: {
    $type: "Table",
    columns: [{ label: "Name" }, { label: "Value" }],
    rows: [["x", "42"]],
  },
  Markdown: { $type: "Markdown", value: "**Bold** and *italic* text." },
  Chart: {
    $type: "Chart",
    variant: "bar",
    data: [
      { label: "A", value: 30 },
      { label: "B", value: 70 },
    ],
  },
  Alert: {
    $type: "Alert",
    title: "Heads up",
    description: "This is an alert.",
    tone: "warning",
  },
  Carousel: {
    $type: "Carousel",
    children: [
      { $type: "Card", title: "Slide 1" },
      { $type: "Card", title: "Slide 2" },
    ],
  },
};

export default function PrimitivesPage() {
  const entries = Object.entries(defaultGenerativeUILibrary);
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-16 md:py-24">
      <header className="mb-12">
        <p className="text-muted-foreground mb-3 text-sm">Generative UI</p>
        <h1 className="text-2xl font-medium tracking-tight">Primitives</h1>
        <p className="text-muted-foreground mt-2">
          The closed vocabulary the model can render. Each primitive has a
          description (shown to the model), a zod schema (drives the tool
          parameters), and an unstyled structural render. The gallery overrides
          each with a styled render; below is the styled preview.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {entries.map(([name, entry]) => {
          const spec = EXAMPLE_SPECS[name];
          if (!spec) return null;
          return (
            <div
              key={name}
              className="border-border/60 bg-card rounded-2xl border p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <code className="text-sm font-semibold">{name}</code>
              </div>
              <p className="text-muted-foreground mb-4 text-xs">
                {entry.description}
              </p>
              <div className="bg-muted/30 flex min-h-[80px] items-center justify-center rounded-lg p-4">
                <div className="w-full max-w-sm">
                  {renderGenerativeUI(spec, styledGenerativeUILibrary, {
                    status: "done",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
