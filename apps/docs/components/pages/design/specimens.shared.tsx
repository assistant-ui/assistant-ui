"use client";

import type { ReactNode } from "react";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import {
  Definition,
  DefinitionAnnotation,
  DefinitionDetails,
  DefinitionList,
  DefinitionName,
  DefinitionTerm,
} from "@/components/ui/definition-list";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Step, Steps } from "@/components/ui/steps";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const frameClass =
  "flex h-auto flex-wrap items-center justify-center gap-4 p-10";

export function KbdSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Search
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Ask AI
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>I</Kbd>
        </KbdGroup>
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        Send
        <Kbd>⏎</Kbd>
      </span>
    </SampleFrame>
  );
}

export function SkeletonSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="flex w-full max-w-72 items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      </div>
    </SampleFrame>
  );
}

export function SkeletonCardSpecimen(): ReactNode {
  return (
    <SampleFrame className={frameClass}>
      <div className="border-foreground/10 rounded-surface flex w-full max-w-72 flex-col gap-3 border p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
    </SampleFrame>
  );
}

export function CalloutSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center gap-1 p-10">
      <Callout type="info">
        Streaming starts after the first token arrives.
      </Callout>
      <Callout type="warning">
        This adapter needs an API key at build time.
      </Callout>
      <Callout type="success">The thread was exported as markdown.</Callout>
    </SampleFrame>
  );
}

export function CalloutTitledSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center gap-1 p-10">
      <Callout type="idea" title="Tip">
        Press <Kbd>⌘</Kbd> <Kbd>I</Kbd> anywhere on the site to ask the docs.
      </Callout>
      <Callout type="error" title="Build failed">
        The registry item names a file that does not exist.
      </Callout>
    </SampleFrame>
  );
}

export function StepsSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto justify-center p-10">
      <Steps className="w-full max-w-96">
        <Step>
          <p className="text-sm font-medium">Install the package</p>
          <p className="text-muted-foreground mt-1 text-sm">
            One command adds the runtime and the styles.
          </p>
        </Step>
        <Step>
          <p className="text-sm font-medium">Wrap your app</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The provider carries the thread state.
          </p>
        </Step>
        <Step>
          <p className="text-sm font-medium">Send a message</p>
          <p className="text-muted-foreground mt-1 text-sm">
            The thread streams from your backend.
          </p>
        </Step>
      </Steps>
    </SampleFrame>
  );
}

export function CodeBlockSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <CodeBlock title="debounce.ts" className="my-0 w-full">
        <pre>
          <code className="text-foreground/80 block text-[12.5px]">
            <span className="line">
              {"export function debounce(fn, wait) {"}
            </span>
            <span className="line">{"  let timer;"}</span>
            <span className="line">{"  return (...args) => {"}</span>
            <span className="line">{"    clearTimeout(timer);"}</span>
            <span className="line">
              {"    timer = setTimeout(() => fn(...args), wait);"}
            </span>
            <span className="line">{"  };"}</span>
            <span className="line">{"}"}</span>
          </code>
        </pre>
      </CodeBlock>
    </SampleFrame>
  );
}

export function CodeBlockBareSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <CodeBlock className="my-0 w-full">
        <pre>
          <code className="text-foreground/80 block text-[12.5px]">
            <span className="line">{"npx assistant-ui init"}</span>
          </code>
        </pre>
      </CodeBlock>
    </SampleFrame>
  );
}

export function TableSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <Table>
        <TableCaption>Radius scale of the design system.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Applies to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>
              <code>--radius-control</code>
            </TableCell>
            <TableCell>8px</TableCell>
            <TableCell>Buttons, inputs, menu items</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-surface</code>
            </TableCell>
            <TableCell>10px</TableCell>
            <TableCell>Cards, popovers, panels</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-xl</code>
            </TableCell>
            <TableCell>12px</TableCell>
            <TableCell>Dialogs, large surfaces</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              <code>--radius-thread</code>
            </TableCell>
            <TableCell>16px</TableCell>
            <TableCell>The chat viewport</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </SampleFrame>
  );
}

export function DefinitionListSpecimen(): ReactNode {
  return (
    <SampleFrame className="flex h-auto flex-col justify-center p-10">
      <DefinitionList>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>commands</DefinitionName>
            <DefinitionAnnotation>
              {"Record<string, string>"}
            </DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Tab label to command line, in display order.
          </DefinitionDetails>
        </Definition>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>storageKey?</DefinitionName>
            <DefinitionAnnotation>string</DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Persists the selected tab and keeps every instance with the same key
            in sync.
          </DefinitionDetails>
        </Definition>
        <Definition>
          <DefinitionTerm>
            <DefinitionName>onValueChange?</DefinitionName>
            <DefinitionAnnotation>
              {"(value: string) => void"}
            </DefinitionAnnotation>
          </DefinitionTerm>
          <DefinitionDetails>
            Called when the user picks a tab.
          </DefinitionDetails>
        </Definition>
      </DefinitionList>
    </SampleFrame>
  );
}
