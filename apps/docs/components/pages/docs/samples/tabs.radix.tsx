"use client";

import { useState } from "react";
import { Bell, FileText, Lock, Settings, User } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/radix/tabs";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

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
          <TabsList>
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
    </SampleFrame>
  );
}

export function TabsWithIconsSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-6">
      <Tabs defaultValue="profile" className="w-[400px]">
        <TabsList>
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
        <TabsList variant="line">
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
