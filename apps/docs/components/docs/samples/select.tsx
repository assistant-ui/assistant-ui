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

// Main sample
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

// Disabled items example
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

// Placeholder example
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

// Disabled select example
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

// Groups example
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
