# Redesign Agent Dashboard MVP - Implementation Plan

## Objective

Redesign `examples/agent-dashboard-mvp` to match the polished visual quality of other assistant-ui examples (like `with-ai-sdk-v6`). Transform from developer-tool look (logs, monospace) to consumer-facing aesthetic (animations, rounded corners, shadows).

## Target Aesthetic

**Reference Implementation:** `examples/with-ai-sdk-v6/components/assistant-ui/thread.tsx`

### Visual Standards (from ChatGPT/Claude):
- **Animations:** `animate-in`, `fade-in`, `slide-in-from-*` classes
- **Border Radii:** Varied usage (`rounded-2xl` for messages/cards, `rounded-full` for badges/buttons)
- **Icons + Tooltips:** Consistent interactive elements
- **Hover States:** `transition-colors hover:bg-muted/50`, `shadow-sm hover:shadow-md`
- **Rounded Bubbles:** Conversational cards with `rounded-2xl`
- **Visual Feedback:** Copy checkmarks, branching controls, state indicators
- **Typography:** Standard sans-serif fonts, NOT `font-mono` (except for code/JSON)
- **Color Depth:** Proper shadows, not just flat backgrounds

## Phase 1: CSS Animation Utilities & Theme

### 1.1 Update globals.css

**File:** `examples/agent-dashboard-mvp/app/globals.css`

**Current Code:**
```css
@import "tailwindcss";
```

**New Code:**
```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --color-background: 0 0% 100%;
  --color-foreground: 240 10% 3.9%;
  --color-card: 0 0% 100%;
  --color-card-foreground: 240 10% 3.9%;
  --color-popover: 0 0% 100%;
  --color-popover-foreground: 240 10% 3.9%;
  --color-primary: 240 5.9% 10%;
  --color-primary-foreground: 0 0% 98%;
  --color-secondary: 240 4.8% 95.9%;
  --color-secondary-foreground: 240 5.9% 10%;
  --color-muted: 240 4.8% 95.9%;
  --color-muted-foreground: 240 3.8% 46.1%;
  --color-accent: 240 4.8% 95.9%;
  --color-accent-foreground: 240 5.9% 10%;
  --color-destructive: 0 84.2% 60.2%;
  --color-destructive-foreground: 0 0% 98%;
  --color-border: 240 5.9% 90%;
  --color-input: 240 5.9% 90%;
  --color-ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

:root {
  --warning: oklch(0.828 0.189 84.429);
  --success: oklch(0.6 0.118 184.704);
  --info: oklch(0.701 0.163 256.847);
  --danger: oklch(0.577 0.245 27.325);
}
```

**Rationale:** Adding `tw-animate-css` enables all animation classes. Theme variables are already good, just need consistent usage.

**Verification:**
```bash
cd examples/agent-dashboard-mvp && pnpm build
# Expected: Build succeeds without errors
```

---

## Phase 2: Core Component Redesign

### 2.1 TaskCard Component

**File:** `examples/agent-dashboard-mvp/components/TaskCard.tsx`

**Design Requirements:**
- Accordion-style task list
- Show title, agent name, status, timestamp
- Expandable to show detailed info + thread UI
- Polished status badges with icons
- Smooth expansion/collapse animations

**Key Changes:**

1. **Replace Emojis with Lucide Icons**
```tsx
// BEFORE
const statusIcons: Record<TaskStatus, string> = {
  queued: "⏳",
  running: "🔄",
  completed: "✅",
  failed: "❌",
  cancelled: "⏹️",
};

// AFTER
import { Clock, Play, CheckCircle, XCircle, Ban } from "lucide-react";

const statusIcons: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  queued: Clock,
  running: Play,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: Ban,
};
```

2. **Add Animations & Rounded Corners**
```tsx
// BEFORE
<div className="border p-3 rounded-lg">
  <div className="font-mono text-xs">{task.title}</div>
</div>

// AFTER
<div className="fade-in slide-in-from-bottom-2 animate-in duration-200 rounded-2xl border bg-card/50 p-4 shadow-sm hover:shadow-md transition-shadow">
  <h3 className="font-medium text-sm">{task.title}</h3>
</div>
```

3. **Badge Design**
```tsx
// Status Badge with smooth colors
<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[task.status]} transition-colors`}>
  <Icon className="h-3.5 w-3.5" />
  {task.status}
</span>
```

4. **Accordion Animation**
```tsx
// Collapsible content with animation
{isExpanded && (
  <div className="fade-in slide-in-from-top-2 animate-in duration-200 mt-4 border-t pt-4">
    {/* Task details and thread UI */}
  </div>
)}
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { CheckCircle, XCircle, Play, Clock, Ban, ChevronRight, ChevronDown } from "lucide-react";
import { useAssistantRuntime } from "@assistant-ui/react";
import { ThreadPrimitive } from "@assistant-ui/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function TaskCard({ task }: { task: Task }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const StatusIcon = statusIcons[task.status];
  const statusColors: Record<TaskStatus, string> = {
    queued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="fade-in slide-in-from-bottom-2 animate-in duration-200 rounded-2xl border bg-card/50 p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[task.status]}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {task.status}
        </span>

        {/* Task Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-base mb-1">{task.title}</h3>
          <p className="text-sm text-muted-foreground">
            Agent: <span className="font-medium">{task.agentName}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(task.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-full p-2 hover:bg-muted transition-colors"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="fade-in slide-in-from-top-2 animate-in duration-200 mt-4 border-t pt-4">
          {/* Thread UI Component */}
          <Card className="rounded-2xl border bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Thread</CardTitle>
            </CardHeader>
            <CardContent>
              <ThreadPrimitive.Root>
                {/* Thread messages */}
              </ThreadPrimitive.Root>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

### 2.2 EventStream Component

**File:** `examples/agent-dashboard-mvp/components/EventStream.tsx`

**Design Requirements:**
- Display events with different types (log, message, tool_call, error)
- Timestamp on left, content right
- Status icons with color coding
- Smooth animations for new events
- Expandable for detailed logs

**Key Changes:**

1. **Remove `font-mono` from UI text**
```tsx
// BEFORE
<div className="font-mono text-xs">
  {event.type}
</div>

// AFTER
<div className="text-sm font-medium">
  {formatEventType(event.type)}
</div>
```

2. **Add Animations**
```tsx
<div className="fade-in slide-in-from-left-2 animate-in duration-200 rounded-2xl border bg-card/50 p-3 shadow-sm hover:shadow-md transition-shadow">
  {/* Event content */}
</div>
```

3. **Status Icons with Tooltips**
```tsx
import { Info, MessageSquare, Code, AlertCircle } from "lucide-react";

const eventIcons = {
  log: Info,
  message: MessageSquare,
  tool_call: Code,
  error: AlertCircle,
};

// Usage with tooltip
<TooltipPrimitive.Root>
  <TooltipPrimitive.Trigger asChild>
    <Icon className="h-4 w-4 text-muted-foreground" />
  </TooltipPrimitive.Trigger>
  <TooltipPrimitive.Content>
    {event.type}
  </TooltipPrimitive.Content>
</TooltipPrimitive.Root>
```

4. **Timestamp Display**
```tsx
<p className="text-xs text-muted-foreground font-mono">
  {formatTime(event.timestamp)}
</p>
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { Info, MessageSquare, Code, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function EventStream({ events }: { events: Event[] }) {
  const [expandedEvent, setExpandedEvent] = React.useState<string | null>(null);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {events.map((event, idx) => {
          const isExpanded = expandedEvent === event.id;
          const Icon = eventIcons[event.type];

          return (
            <div
              key={event.id}
              className="fade-in slide-in-from-left-2 animate-in duration-200 rounded-2xl border bg-card/50 p-3 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Event Type Icon with Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{formatEventType(event.type)}</p>
                  </TooltipContent>
                </Tooltip>

                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <button
                      onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                      className="rounded-full p-1 hover:bg-muted transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatTime(event.timestamp)}
                  </p>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="fade-in slide-in-from-top-2 animate-in duration-150 mt-2 p-3 rounded-xl bg-muted/50">
                      <pre className="text-xs font-mono whitespace-pre-wrap">
                        {event.details}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
```

---

### 2.3 EnhancedApproval Component

**File:** `examples/agent-dashboard-mvp/components/EnhancedApproval.tsx`

**Design Requirements:**
- Card-based layout with clear action buttons
- Approve/Reject buttons with icons and hover states
- Status indicator with smooth animations
- Reason field with rounded input

**Key Changes:**

1. **Card Design**
```tsx
// BEFORE
<div className="border p-4 rounded-lg bg-warning/10">
  <h2 className="font-mono text-sm">Approval Required</h2>
</div>

// AFTER
<div className="fade-in slide-in-from-bottom-3 animate-in duration-300 rounded-2xl border-2 border-warning/50 bg-warning/5 p-5 shadow-md">
  <div className="flex items-center gap-3 mb-4">
    <div className="rounded-full bg-warning/20 p-2">
      <AlertTriangle className="h-5 w-5 text-warning" />
    </div>
    <h2 className="text-base font-semibold">Approval Required</h2>
  </div>
</div>
```

2. **Action Buttons with Icons**
```tsx
import { Check, X } from "lucide-react";
import { Button } from "./ui/button";

<div className="flex gap-3 mt-4">
  <Button
    onClick={onApprove}
    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-colors"
  >
    <Check className="h-4 w-4" />
    Approve
  </Button>
  <Button
    variant="outline"
    onClick={onReject}
    className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
  >
    <X className="h-4 w-4" />
    Reject
  </Button>
</div>
```

3. **Reason Field**
```tsx
<Textarea
  placeholder="Enter your reason..."
  className="rounded-xl resize-none min-h-[80px] mt-3"
/>
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export function EnhancedApproval({
  request,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [reason, setReason] = React.useState("");

  return (
    <Card className="fade-in slide-in-from-bottom-3 animate-in duration-300 rounded-2xl border-2 border-warning/50 bg-warning/5 shadow-md">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full bg-warning/20 p-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Approval Required</h2>
            <p className="text-xs text-muted-foreground">{request.agentName}</p>
          </div>
        </div>

        {/* Request Details */}
        <div className="p-3 rounded-xl bg-muted/50 mb-4">
          <p className="text-sm">{request.message}</p>
        </div>

        {/* Reason Field */}
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter your reason (optional)..."
          className="rounded-xl resize-none min-h-[80px]"
        />

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={() => onApprove(reason)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => onReject(reason)}
            className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 3: Supporting Component Polish

### 3.1 AgentHierarchyView Component

**File:** `examples/agent-dashboard-mvp/components/AgentHierarchyView.tsx`

**Design Requirements:**
- Tree view of agent hierarchy
- Expandable nodes with smooth animations
- Status indicators for each agent
- Active agent highlighting

**Key Changes:**

1. **Add Animations**
```tsx
<div className="fade-in slide-in-from-left-1 animate-in duration-150">
  {/* Agent node */}
</div>
```

2. **Node Design with Status**
```tsx
<div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'} transition-colors cursor-pointer`}>
  {agent.status === "active" && (
    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
  )}
  <span className="text-sm font-medium">{agent.name}</span>
</div>
```

3. **Expand/Collapse Animation**
```tsx
{isExpanded && (
  <div className="fade-in slide-in-from-top-2 animate-in duration-150 ml-4 mt-2 border-l-2 border-muted pl-3">
    {children}
  </div>
)}
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { ChevronRight, ChevronDown, Activity, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AgentNode {
  id: string;
  name: string;
  status: "active" | "idle" | "error";
  children?: AgentNode[];
}

export function AgentHierarchyView({ agents }: { agents: AgentNode[] }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Agent Hierarchy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {agents.map((agent) => (
          <AgentNode key={agent.id} node={agent} level={0} />
        ))}
      </CardContent>
    </Card>
  );
}

function AgentNode({ node, level }: { node: AgentNode; level: number }) {
  const [isExpanded, setIsExpanded] = React.useState(level === 0);

  return (
    <div>
      {/* Node */}
      <div className="fade-in slide-in-from-left-1 animate-in duration-150 flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer group">
        {node.children && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-0.5 hover:bg-muted transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <div className={`h-2 w-2 rounded-full ${getStatusColor(node.status)}`} />
        <span className="text-sm font-medium flex-1">{node.name}</span>
        <Activity className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Children */}
      {isExpanded && node.children && (
        <div className="fade-in slide-in-from-top-2 animate-in duration-150 ml-4 mt-1 border-l-2 border-muted pl-3">
          {node.children.map((child) => (
            <AgentNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500 animate-pulse";
    case "idle":
      return "bg-gray-400";
    case "error":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}
```

---

### 3.2 ThinkingDisplay Component

**File:** `examples/agent-dashboard-mvp/components/ThinkingDisplay.tsx`

**Design Requirements:**
- Display agent reasoning steps
- Progress indicator
- Expandable for detailed steps
- Smooth animations

**Key Changes:**

1. **Add Animations**
```tsx
<div className="fade-in slide-in-from-bottom-1 animate-in duration-200 rounded-2xl border bg-muted/50 p-4 shadow-sm">
  {/* Thinking content */}
</div>
```

2. **Progress Bar**
```tsx
import { TrendingUp } from "lucide-react";

<div className="flex items-center gap-3 mb-3">
  <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
  <h3 className="text-sm font-semibold">Thinking Process</h3>
  <span className="text-xs text-muted-foreground ml-auto">
    {currentStep} / {totalSteps}
  </span>
</div>

<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
  <div
    className="h-full bg-primary transition-all duration-500 ease-out"
    style={{ width: `${progress}%` }}
  />
</div>
```

3. **Step Display**
```tsx
{steps.map((step, idx) => (
  <div
    key={idx}
    className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
      idx === currentStepIndex ? "bg-primary/10" : idx < currentStepIndex ? "bg-muted/30" : "bg-transparent opacity-50"
    }`}
  >
    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
      idx < currentStepIndex ? "bg-green-500 text-white" :
      idx === currentStepIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground"
    }`}>
      {idx < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : idx + 1}
    </div>
    <div className="flex-1">
      <p className="text-sm">{step.description}</p>
      {step.details && (
        <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
      )}
    </div>
  </div>
))}
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { TrendingUp, Check } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface ThinkingStep {
  description: string;
  details?: string;
  status: "pending" | "active" | "completed";
}

export function ThinkingDisplay({ steps }: { steps: ThinkingStep[] }) {
  const activeStepIndex = steps.findIndex((s) => s.status === "active");
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <CardContent className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="text-sm font-semibold">Thinking Process</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {completedCount} / {steps.length} completed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`fade-in slide-in-from-left-1 animate-in duration-150 flex items-start gap-3 p-3 rounded-xl transition-all ${
              step.status === "active" ? "bg-primary/10" :
              step.status === "completed" ? "bg-muted/30" : "bg-transparent opacity-50"
            }`}
          >
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step.status === "completed" ? "bg-green-500 text-white" :
              step.status === "active" ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"
            }`}>
              {step.status === "completed" ? <Check className="h-3.5 w-3.5" /> : idx + 1}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{step.description}</p>
              {step.details && (
                <p className="text-xs text-muted-foreground mt-1">{step.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  );
}
```

---

### 3.3 DemoPresets Component

**File:** `examples/agent-dashboard-mvp/components/DemoPresets.tsx`

**Design Requirements:**
- Grid of preset task cards
- Clickable with hover states
- Icons for each preset
- Smooth animations

**Key Changes:**

1. **Card Design**
```tsx
import { Zap, Code, MessageSquare, PenTool } from "lucide-react";

<div className="group relative rounded-2xl border bg-card/50 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer hover:-translate-y-0.5">
  <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
    <Icon className="h-5 w-5 text-primary" />
  </div>
  <h3 className="font-semibold text-base mb-1">{preset.title}</h3>
  <p className="text-sm text-muted-foreground">{preset.description}</p>
</div>
```

2. **Grid Layout**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {presets.map((preset, idx) => (
    <div
      key={preset.id}
      onClick={() => onSelect(preset)}
      className={`fade-in slide-in-from-bottom-${(idx % 4) + 2} animate-in duration-300`}
    >
      {/* Card content */}
    </div>
  ))}
</div>
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { Zap, Code, MessageSquare, PenTool, ArrowRight } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface Preset {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  agent: string;
}

const presets: Preset[] = [
  {
    id: "code-review",
    title: "Code Review",
    description: "Analyze code for improvements and potential issues",
    icon: Code,
    agent: "code-reviewer",
  },
  {
    id: "task-planning",
    title: "Task Planning",
    description: "Break down complex tasks into actionable steps",
    icon: Zap,
    agent: "planner",
  },
  {
    id: "chat-assistant",
    title: "Chat Assistant",
    description: "Natural language conversation with context",
    icon: MessageSquare,
    agent: "chat-agent",
  },
  {
    id: "content-writing",
    title: "Content Writing",
    description: "Generate high-quality written content",
    icon: PenTool,
    agent: "writer",
  },
];

export function DemoPresets({ onSelect }: { onSelect: (preset: Preset) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Start with a preset</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {presets.map((preset, idx) => {
          const Icon = preset.icon;

          return (
            <Card
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={`fade-in slide-in-from-bottom-${(idx % 4) + 2} animate-in duration-300 group cursor-pointer hover:-translate-y-0.5 transition-all border hover:shadow-lg`}
            >
              <CardContent className="p-6">
                <div className="mb-3 inline-flex rounded-full bg-primary/10 p-2.5 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-1">{preset.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{preset.description}</p>
                <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                  <span>{preset.agent}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Phase 4: Page Layout Update

### 4.1 Main Page

**File:** `examples/agent-dashboard-mvp/app/page.tsx`

**Design Requirements:**
- Hero section with welcome message and presets
- Two-column layout (tasks list + detail view)
- Consistent spacing and animations
- Responsive design

**Key Changes:**

1. **Hero Section**
```tsx
// BEFORE
<div className="mb-6">
  <h1 className="font-mono text-xl mb-2">Agent Dashboard</h1>
</div>

// AFTER
<div className="fade-in slide-in-from-bottom-1 animate-in duration-200 mb-8">
  <h1 className="text-2xl font-semibold mb-2">Agent Dashboard</h1>
  <p className="text-muted-foreground">
    Monitor and manage your AI agents in real-time
  </p>
</div>
```

2. **Two-Column Layout**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Tasks List */}
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">Active Tasks</h2>
      <Badge variant="outline">{tasks.length} tasks</Badge>
    </div>
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  </div>

  {/* Detail View */}
  <div className="lg:sticky lg:top-6 h-fit">
    {selectedTask ? (
      <TaskDetailView task={selectedTask} />
    ) : (
      <div className="text-center py-12 text-muted-foreground">
        Select a task to view details
      </div>
    )}
  </div>
</div>
```

3. **Status Summary Cards**
```tsx
<div className="fade-in slide-in-from-bottom-2 animate-in duration-300 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
      <p className="text-2xl font-semibold">{tasks.length}</p>
    </CardContent>
  </Card>
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">Running</p>
      <p className="text-2xl font-semibold text-blue-600">{runningTasks}</p>
    </CardContent>
  </Card>
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">Completed</p>
      <p className="text-2xl font-semibold text-green-600">{completedTasks}</p>
    </CardContent>
  </Card>
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground mb-1">Failed</p>
      <p className="text-2xl font-semibold text-red-600">{failedTasks}</p>
    </CardContent>
  </Card>
</div>
```

**Complete Component Structure:**
```tsx
import * as React from "react";
import { useAssistantRuntime } from "@assistant-ui/react";
import { TaskCard } from "./components/TaskCard";
import { TaskDetailView } from "./components/TaskDetailView";
import { DemoPresets } from "./components/DemoPresets";
import { AgentHierarchyView } from "./components/AgentHierarchyView";
import { EventStream } from "./components/EventStream";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";

export default function Page() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [events, setEvents] = React.useState<Event[]>([]);

  const runningTasks = tasks.filter((t) => t.status === "running").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const failedTasks = tasks.filter((t) => t.status === "failed").length;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="fade-in slide-in-from-bottom-1 animate-in duration-200 mb-8">
          <h1 className="text-2xl font-semibold mb-2">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage your AI agents in real-time
          </p>
        </div>

        {/* Welcome / Presets (if no tasks) */}
        {tasks.length === 0 ? (
          <DemoPresets onSelect={(preset) => startTask(preset)} />
        ) : null}

        {/* Status Summary */}
        {tasks.length > 0 && (
          <div className="fade-in slide-in-from-bottom-2 animate-in duration-300 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
                <p className="text-2xl font-semibold">{tasks.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Running</p>
                <p className="text-2xl font-semibold text-blue-600">{runningTasks}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-semibold text-green-600">{completedTasks}</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Failed</p>
                <p className="text-2xl font-semibold text-red-600">{failedTasks}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        {tasks.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
            {/* Left Column: Agent Hierarchy + Tasks */}
            <div className="space-y-6">
              {/* Agent Hierarchy */}
              <AgentHierarchyView agents={agents} />

              {/* Tasks List */}
              <Card className="rounded-2xl shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Tasks</h2>
                    <Badge variant="outline">{tasks.length}</Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isSelected={selectedTask?.id === task.id}
                      onSelect={setSelectedTask}
                    />
                  ))}
                </div>
              </Card>

              {/* Event Stream */}
              <Card className="rounded-2xl shadow-sm">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Event Stream</h2>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  <EventStream events={events} />
                </div>
              </Card>
            </div>

            {/* Right Column: Task Detail View */}
            <div className="lg:sticky lg:top-6 h-fit">
              {selectedTask ? (
                <TaskDetailView task={selectedTask} />
              ) : (
                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">Select a task to view details</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Verification Steps

### Automated Checks

After each phase, run:

```bash
cd examples/agent-dashboard-mvp

# Lint check
pnpm lint

# Build check
pnpm build

# Type check (if using TypeScript)
pnpm tsc --noEmit
```

**Expected Results:**
- No lint errors
- Build succeeds with exit code 0
- No type errors

---

### Manual Visual Checks

Start dev server and verify:

```bash
cd examples/agent-dashboard-mvp
pnpm dev
```

Open http://localhost:3000 and verify:

#### Phase 1 - CSS & Theme:
- [ ] Animations are working (fade, slide effects)
- [ ] Theme colors are consistent across all components

#### Phase 2 - Core Components:

**TaskCard:**
- [ ] Cards have smooth animations on mount
- [ ] Status badges use icons (not emojis)
- [ ] Hover states with shadow transitions
- [ ] Expand/collapse animation is smooth
- [ ] `font-mono` only used for timestamps

**EventStream:**
- [ ] Events animate in from left
- [ ] Type icons with tooltips on hover
- [ ] Expand/collapse for detailed logs
- [ ] Smooth color transitions

**EnhancedApproval:**
- [ ] Card has warning border and background
- [ ] Approve/Reject buttons have icons
- [ ] Buttons have hover state transitions
- [ ] Reason field has rounded corners

#### Phase 3 - Supporting Components:

**AgentHierarchyView:**
- [ ] Nodes animate in smoothly
- [ ] Status indicators (pulsing green for active)
- [ ] Expand/collapse animations
- [ ] Hover states on nodes

**ThinkingDisplay:**
- [ ] Progress bar animates smoothly
- [ ] Steps have checkmarks when completed
- [ ] Active step is highlighted
- [ ] Icons are Lucide-based

**DemoPresets:**
- [ ] Cards lift on hover (`-translate-y-0.5`)
- [ ] Icons have hover background transition
- [ ] Staggered animations (slide-in-from-bottom-2, 3, 4, 5)

#### Phase 4 - Page Layout:
- [ ] Hero section with welcome message
- [ ] Status summary cards with proper spacing
- [ ] Two-column layout on large screens
- [ ] Sticky detail view on scroll
- [ ] Responsive grid on mobile

**Overall:**
- [ ] No `font-mono` outside of code/timestamps
- [ ] Consistent border-radius (`rounded-2xl` for cards, `rounded-full` for badges)
- [ ] All interactive elements have hover states
- [ ] Shadows are consistent (`shadow-sm`, `shadow-md`, `shadow-lg`)
- [ ] Color usage matches reference implementation
- [ ] No flat backgrounds for depth elements

---

## Component Dependencies

These components need to be created or updated:

### New UI Components (if not already present):
- `components/ui/card.tsx` - Radix-style Card component
- `components/ui/button.tsx` - Button component with variants
- `components/ui/textarea.tsx` - Textarea component
- `components/ui/tooltip.tsx` - Tooltip component
- `components/ui/badge.tsx` - Badge component

These can be copied from `examples/with-ai-sdk-v6/components/ui/` if they don't exist.

---

## Success Criteria

The redesign is complete when:

1. **Visual Parity:** `agent-dashboard-mvp` matches `with-ai-sdk-v6` in polish level
2. **No Developer-Tool Look:** No `font-mono` (except code), no flat backgrounds
3. **Animations Everywhere:** All components have animate-in classes
4. **Hover Feedback:** All interactive elements have hover states
5. **Icon Consistency:** All icons use Lucide React, no emojis
6. **Build Passes:** `pnpm build` succeeds without errors
7. **Lint Clean:** `pnpm lint` passes
8. **Copy-Paste Friendly:** Components are easy to customize

---

## Reference Patterns

### Animation Classes (Priority Order):
1. `fade-in slide-in-from-bottom-2 animate-in duration-200` - Most cards
2. `fade-in slide-in-from-left-2 animate-in duration-200` - List items
3. `fade-in slide-in-from-top-2 animate-in duration-150` - Expanded content
4. `fade-in slide-in-from-bottom-1 animate-in duration-200` - Headers

### Border Radius Hierarchy:
- `rounded-2xl` - Cards, main containers
- `rounded-xl` - Inner sections, step items
- `rounded-full` - Badges, status indicators, buttons
- `rounded-lg` - Input fields (fallback)

### Shadow Hierarchy:
- `shadow-sm` - Default cards
- `shadow-md` - Hover cards
- `shadow-lg` - Elevated presets on hover
- No shadow - Inline elements, badges

### Color Depth Patterns:
- `bg-card/50` - Subtle card backgrounds
- `bg-muted/50` - Secondary sections
- `bg-primary/10` - Highlights
- `bg-warning/5` - Warning sections
- `bg-muted/30` - Completed steps

---

## Implementation Notes

1. **Standalone Development:** Each component can be modified independently
2. **Incremental Verification:** Test each phase before proceeding
3. **Reference First:** Always check `with-ai-sdk-v6` for patterns before implementing
4. **No Breaking Changes:** Keep component APIs the same, only update styling
5. **Icon Installation:** Ensure Lucide React is installed:
   ```bash
   pnpm add lucide-react
   ```

---

## Timeline Estimate

- Phase 1: 15 minutes (CSS + build verification)
- Phase 2: 1 hour (3 core components)
- Phase 3: 45 minutes (3 supporting components)
- Phase 4: 30 minutes (page layout)
- Verification: 15 minutes

**Total:** 2.5 - 3 hours

---

## Questions?

If any component seems unclear or needs clarification before implementation, ask now.