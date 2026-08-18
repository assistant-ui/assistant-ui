"use client";

import { useState, type ComponentType } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/assistant-ui/accordion";
import { Badge } from "@/components/assistant-ui/badge";
import { DiffViewer } from "@/components/assistant-ui/diff-viewer";
import {
  DotMatrix,
  dotMatrixStates,
} from "@/components/assistant-ui/dot-matrix";
import { NumberRoll } from "@/components/assistant-ui/number-roll";
import { Select } from "@/components/assistant-ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/assistant-ui/tabs";
import { useStoryPhases } from "@/components/elements/use-demo";
import type { StandaloneComponent } from "@/lib/standalone";

const FRUITS = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "orange", label: "Orange" },
];

const DIFF_PATCH = `--- a/example.ts
+++ b/example.ts
@@ -1,5 +1,7 @@
-function greet(name) {
-  console.log("Hello, " + name);
+function greet(name: string): void {
+  console.log(\`Hello, \${name}!\`);
 }

-greet("World");
+// Call the function
+greet("World");
+greet("TypeScript");`;

export function AccordionPreview() {
  return (
    <Accordion className="w-full max-w-sm" defaultValue={["item-1"]}>
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It follows the WAI-ARIA accordion pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Does it need the runtime?</AccordionTrigger>
        <AccordionContent>No. Drop it into any React tree.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Can I restyle it?</AccordionTrigger>
        <AccordionContent>
          Yes. The source lands in your project and stays yours.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function BadgePreview() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="outline">Outline</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="muted">Muted</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  );
}

export function DiffViewerPreview() {
  return <DiffViewer patch={DIFF_PATCH} className="w-full max-w-2xl" />;
}

export function DotMatrixPreview() {
  return (
    <div className="grid grid-cols-5 gap-x-5 gap-y-6">
      {dotMatrixStates.map((state) => (
        <div key={state} className="flex flex-col items-center gap-2">
          <DotMatrix state={state} className="size-7" />
          <span className="text-foreground/40 font-mono text-[10px]">
            {state}
          </span>
        </div>
      ))}
    </div>
  );
}

const NUMBER_ROLL_VALUES = [128, 1_284, 4_812, 12_847, 18_402] as const;
const NUMBER_ROLL_PHASES = [800, 1000, 1000, 1000, 0] as const;

export function NumberRollPreview() {
  const { phase } = useStoryPhases(NUMBER_ROLL_PHASES);

  return (
    <NumberRoll
      value={NUMBER_ROLL_VALUES[phase] ?? NUMBER_ROLL_VALUES[0]}
      locales="en-US"
      className="text-5xl font-semibold tracking-tight"
    />
  );
}

export function SelectPreview() {
  const [value, setValue] = useState("apple");

  return (
    <Select
      value={value}
      onValueChange={setValue}
      options={FRUITS}
      placeholder="Select a fruit"
      className="w-fit"
    />
  );
}

export function TabsPreview() {
  return (
    <Tabs defaultValue="account" className="w-full max-w-sm">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="p-4">
        <p className="text-foreground/55 text-sm">
          Manage your account settings and preferences.
        </p>
      </TabsContent>
      <TabsContent value="password" className="p-4">
        <p className="text-foreground/55 text-sm">
          Change your password and security settings.
        </p>
      </TabsContent>
      <TabsContent value="settings" className="p-4">
        <p className="text-foreground/55 text-sm">
          Configure your application settings.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export const STANDALONE_PREVIEW: Record<
  StandaloneComponent["slug"],
  ComponentType
> = {
  accordion: AccordionPreview,
  badge: BadgePreview,
  "diff-viewer": DiffViewerPreview,
  "dot-matrix": DotMatrixPreview,
  "number-roll": NumberRollPreview,
  select: SelectPreview,
  tabs: TabsPreview,
};

export function StandalonePreview({
  slug,
}: {
  slug: StandaloneComponent["slug"];
}) {
  const Preview = STANDALONE_PREVIEW[slug];
  if (!Preview) return null;
  return <Preview />;
}
