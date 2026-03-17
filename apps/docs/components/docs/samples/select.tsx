"use client";

import { useState } from "react";
import {
  Select,
  SelectRoot,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectValue,
  SelectSeparator,
} from "@/components/assistant-ui/select";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "orange", label: "Orange" },
];

export function SelectSample() {
  const [value, setValue] = useState("apple");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select
        value={value}
        onValueChange={setValue}
        options={fruits}
        placeholder="Select a fruit..."
        className="w-fit"
      />
    </SampleFrame>
  );
}

export function SelectDisabledItemsSample() {
  const [value, setValue] = useState("free");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select
        value={value}
        onValueChange={setValue}
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "enterprise", label: "Enterprise", disabled: true },
        ]}
      />
    </SampleFrame>
  );
}

export function SelectPlaceholderSample() {
  const [value, setValue] = useState("");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select
        value={value}
        onValueChange={setValue}
        options={fruits}
        placeholder="Choose an option..."
      />
    </SampleFrame>
  );
}

export function SelectDisabledSample() {
  const [value, setValue] = useState("apple");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select
        value={value}
        onValueChange={setValue}
        options={fruits}
        disabled
      />
    </SampleFrame>
  );
}

export function SelectGroupsSample() {
  const [value, setValue] = useState("react");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <SelectRoot value={value} onValueChange={setValue}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select a framework..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frontend</SelectLabel>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Backend</SelectLabel>
            <SelectItem value="node">Node.js</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectGroup>
        </SelectContent>
      </SelectRoot>
    </SampleFrame>
  );
}

export function SelectVariantsSample() {
  const [outlineValue, setOutlineValue] = useState("react");
  const [ghostValue, setGhostValue] = useState("vue");
  const [mutedValue, setMutedValue] = useState("svelte");

  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Outline (default)</span>
        <SelectRoot value={outlineValue} onValueChange={setOutlineValue}>
          <SelectTrigger variant="outline" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Ghost</span>
        <SelectRoot value={ghostValue} onValueChange={setGhostValue}>
          <SelectTrigger variant="ghost" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Muted</span>
        <SelectRoot value={mutedValue} onValueChange={setMutedValue}>
          <SelectTrigger variant="muted" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </SelectRoot>
      </div>
    </SampleFrame>
  );
}

export function SelectSizesSample() {
  const [defaultValue, setDefaultValue] = useState("react");
  const [smValue, setSmValue] = useState("vue");

  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-4 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Default</span>
        <SelectRoot value={defaultValue} onValueChange={setDefaultValue}>
          <SelectTrigger size="default" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Small</span>
        <SelectRoot value={smValue} onValueChange={setSmValue}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
            <SelectItem value="svelte">Svelte</SelectItem>
          </SelectContent>
        </SelectRoot>
      </div>
    </SampleFrame>
  );
}

export function SelectScrollableSample() {
  const [value, setValue] = useState("est");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <SelectRoot value={value} onValueChange={setValue}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a timezone..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>North America</SelectLabel>
            <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
            <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
            <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
            <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
            <SelectItem value="cet">Central European Time (CET)</SelectItem>
            <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Asia</SelectLabel>
            <SelectItem value="ist">India Standard Time (IST)</SelectItem>
            <SelectItem value="cst_china">China Standard Time (CST)</SelectItem>
            <SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </SelectRoot>
    </SampleFrame>
  );
}
