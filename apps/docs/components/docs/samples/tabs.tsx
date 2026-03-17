"use client";

import { useState } from "react";
import { FileText, Settings, User, Bell, Lock } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/assistant-ui/tabs";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function TabsSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Tabs defaultValue="account" className="w-[400px]">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="p-4">
          <p className="text-muted-foreground text-sm">
            Manage your account settings and preferences.
          </p>
        </TabsContent>
        <TabsContent value="password" className="p-4">
          <p className="text-muted-foreground text-sm">
            Change your password and security settings.
          </p>
        </TabsContent>
        <TabsContent value="settings" className="p-4">
          <p className="text-muted-foreground text-sm">
            Configure your application settings.
          </p>
        </TabsContent>
      </Tabs>
    </SampleFrame>
  );
}

export function TabsVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Default</span>
        <Tabs defaultValue="a">
          <TabsList variant="default">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Line</span>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Ghost</span>
        <Tabs defaultValue="a">
          <TabsList variant="ghost">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Pills</span>
        <Tabs defaultValue="a">
          <TabsList variant="pills">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Outline</span>
        <Tabs defaultValue="a">
          <TabsList variant="outline">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
            <TabsTrigger value="c">Tab C</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </SampleFrame>
  );
}

export function TabsSizesSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Small</span>
        <Tabs defaultValue="a">
          <TabsList size="sm">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Default</span>
        <Tabs defaultValue="a">
          <TabsList size="default">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">Large</span>
        <Tabs defaultValue="a">
          <TabsList size="lg">
            <TabsTrigger value="a">Tab A</TabsTrigger>
            <TabsTrigger value="b">Tab B</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </SampleFrame>
  );
}

export function TabsWithIconsSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Tabs defaultValue="profile" className="w-[400px]">
        <TabsList variant="ghost">
          <TabsTrigger value="profile">
            <User />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock />
            Security
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="p-4">
          <p className="text-muted-foreground text-sm">
            Edit your profile information.
          </p>
        </TabsContent>
        <TabsContent value="notifications" className="p-4">
          <p className="text-muted-foreground text-sm">
            Manage your notification preferences.
          </p>
        </TabsContent>
        <TabsContent value="security" className="p-4">
          <p className="text-muted-foreground text-sm">
            Configure security and privacy settings.
          </p>
        </TabsContent>
      </Tabs>
    </SampleFrame>
  );
}

export function TabsControlledSample() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-4 p-6">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-[400px]"
      >
        <TabsList variant="pills">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="p-4">
          <p className="text-muted-foreground text-sm">Overview content</p>
        </TabsContent>
        <TabsContent value="analytics" className="p-4">
          <p className="text-muted-foreground text-sm">Analytics content</p>
        </TabsContent>
        <TabsContent value="reports" className="p-4">
          <p className="text-muted-foreground text-sm">Reports content</p>
        </TabsContent>
      </Tabs>
      <p className="text-muted-foreground text-sm">
        Current tab: <code className="font-mono">{activeTab}</code>
      </p>
    </SampleFrame>
  );
}

export function TabsAsLinkSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Tabs defaultValue="docs">
        <TabsList variant="line">
          <TabsTrigger value="docs" asChild>
            <a href="#installation">
              <FileText />
              Docs
            </a>
          </TabsTrigger>
          <TabsTrigger value="api" asChild>
            <a href="#api-reference">
              <Settings />
              API
            </a>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </SampleFrame>
  );
}

export function TabsAnimatedIndicatorSample() {
  return (
    <SampleFrame className="flex h-auto flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">
          Default - Sliding background
        </span>
        <Tabs defaultValue="home">
          <TabsList variant="default">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">
          Line - Sliding underline
        </span>
        <Tabs defaultValue="home">
          <TabsList variant="line">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">
          Ghost - Sliding background with hover effect
        </span>
        <Tabs defaultValue="dashboard">
          <TabsList variant="ghost">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">
          Pills - Sliding pill background
        </span>
        <Tabs defaultValue="all">
          <TabsList variant="pills">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs">
          Outline - Sliding border
        </span>
        <Tabs defaultValue="week">
          <TabsList variant="outline">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </SampleFrame>
  );
}
