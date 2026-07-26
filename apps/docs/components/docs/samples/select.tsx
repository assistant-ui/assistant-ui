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

const frameworks = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
];

const backends = [
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
];

const northAmericaTimezones = [
  { value: "est", label: "Eastern Standard Time (EST)" },
  { value: "cst", label: "Central Standard Time (CST)" },
  { value: "mst", label: "Mountain Standard Time (MST)" },
  { value: "pst", label: "Pacific Standard Time (PST)" },
];

const europeTimezones = [
  { value: "gmt", label: "Greenwich Mean Time (GMT)" },
  { value: "cet", label: "Central European Time (CET)" },
  { value: "eet", label: "Eastern European Time (EET)" },
];

const asiaTimezones = [
  { value: "ist", label: "India Standard Time (IST)" },
  { value: "cst_china", label: "China Standard Time (CST)" },
  { value: "jst", label: "Japan Standard Time (JST)" },
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
      <SelectRoot
        value={value}
        onValueChange={(value) => value !== null && setValue(value)}
        items={[...frameworks, ...backends]}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select a framework..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Frontend</SelectLabel>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Backend</SelectLabel>
            {backends.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
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
        <SelectRoot
          value={outlineValue}
          onValueChange={(value) => value !== null && setOutlineValue(value)}
          items={frameworks}
        >
          <SelectTrigger variant="outline" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Ghost</span>
        <SelectRoot
          value={ghostValue}
          onValueChange={(value) => value !== null && setGhostValue(value)}
          items={frameworks}
        >
          <SelectTrigger variant="ghost" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Muted</span>
        <SelectRoot
          value={mutedValue}
          onValueChange={(value) => value !== null && setMutedValue(value)}
          items={frameworks}
        >
          <SelectTrigger variant="muted" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
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
        <SelectRoot
          value={defaultValue}
          onValueChange={(value) => value !== null && setDefaultValue(value)}
          items={frameworks}
        >
          <SelectTrigger size="default" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectRoot>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Small</span>
        <SelectRoot
          value={smValue}
          onValueChange={(value) => value !== null && setSmValue(value)}
          items={frameworks}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {frameworks.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
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
      <SelectRoot
        value={value}
        onValueChange={(value) => value !== null && setValue(value)}
        items={[...northAmericaTimezones, ...europeTimezones, ...asiaTimezones]}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a timezone..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>North America</SelectLabel>
            {northAmericaTimezones.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Europe</SelectLabel>
            {europeTimezones.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Asia</SelectLabel>
            {asiaTimezones.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </SelectRoot>
    </SampleFrame>
  );
}
