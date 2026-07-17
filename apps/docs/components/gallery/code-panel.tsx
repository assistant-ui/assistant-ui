"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/assistant-ui/tabs";

export function CodePanel({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return (
    <DynamicCodeBlock
      lang={language}
      code={code.trim()}
      codeblock={{
        className: "my-0",
        viewportProps: { className: "max-h-96" },
      }}
    />
  );
}

export function UsageCodeSwitcher({
  json,
  jsx,
}: {
  json: string;
  jsx: string;
}) {
  return (
    <Tabs defaultValue="json">
      <TabsList variant="ghost" size="sm">
        <TabsTrigger value="json">IR JSON</TabsTrigger>
        <TabsTrigger value="react">React</TabsTrigger>
      </TabsList>
      <TabsContent value="json">
        <CodePanel code={json} language="json" />
      </TabsContent>
      <TabsContent value="react">
        <CodePanel code={jsx} language="tsx" />
      </TabsContent>
    </Tabs>
  );
}
