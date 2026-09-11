"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix/select";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

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

const timezoneGroups = [
  {
    label: "North America",
    items: [
      { value: "est", label: "Eastern Standard Time (EST)" },
      { value: "cst", label: "Central Standard Time (CST)" },
      { value: "mst", label: "Mountain Standard Time (MST)" },
      { value: "pst", label: "Pacific Standard Time (PST)" },
    ],
  },
  {
    label: "Europe",
    items: [
      { value: "gmt", label: "Greenwich Mean Time (GMT)" },
      { value: "cet", label: "Central European Time (CET)" },
      { value: "eet", label: "Eastern European Time (EET)" },
    ],
  },
  {
    label: "Asia",
    items: [
      { value: "ist", label: "India Standard Time (IST)" },
      { value: "cst_china", label: "China Standard Time (CST)" },
      { value: "jst", label: "Japan Standard Time (JST)" },
    ],
  },
];

export function SelectSample() {
  const [value, setValue] = useState("apple");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select a fruit..." />
        </SelectTrigger>
        <SelectContent>
          {fruits.map((fruit) => (
            <SelectItem key={fruit.value} value={fruit.value}>
              {fruit.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SampleFrame>
  );
}

export function SelectDisabledItemsSample() {
  const [value, setValue] = useState("free");
  const plans = [
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "enterprise", label: "Enterprise", disabled: true },
  ];

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {plans.map((plan) => (
            <SelectItem
              key={plan.value}
              value={plan.value}
              disabled={plan.disabled === true}
            >
              {plan.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SampleFrame>
  );
}

export function SelectPlaceholderSample() {
  const [value, setValue] = useState("");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Choose an option..." />
        </SelectTrigger>
        <SelectContent>
          {fruits.map((fruit) => (
            <SelectItem key={fruit.value} value={fruit.value}>
              {fruit.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SampleFrame>
  );
}

export function SelectDisabledSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value="apple" disabled>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fruits.map((fruit) => (
            <SelectItem key={fruit.value} value={fruit.value}>
              {fruit.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SampleFrame>
  );
}

export function SelectGroupsSample() {
  const [value, setValue] = useState("react");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value={value} onValueChange={setValue}>
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
      </Select>
    </SampleFrame>
  );
}

export function SelectSizesSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center gap-4 p-6">
      <Select defaultValue="react">
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
      </Select>
      <Select defaultValue="vue">
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
      </Select>
    </SampleFrame>
  );
}

export function SelectScrollableSample() {
  const [value, setValue] = useState("est");

  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Select a timezone..." />
        </SelectTrigger>
        <SelectContent>
          {timezoneGroups.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </SampleFrame>
  );
}
