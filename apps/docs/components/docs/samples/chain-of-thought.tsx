"use client";

import { useEffect, useState, useCallback } from "react";
import type { VariantProps } from "class-variance-authority";
import { PlayIcon, RotateCcwIcon, EyeOffIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import {
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtText,
  ChainOfThoughtPlaceholder,
  ChainOfThoughtTimeline,
  ChainOfThoughtStep,
  ChainOfThoughtStepHeader,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepBadges,
  ChainOfThoughtStepImage,
  ChainOfThoughtBadge,
  chainOfThoughtVariants,
} from "@/components/assistant-ui/chain-of-thought";

// ============================================================================
// Basic Variant Demo
// ============================================================================

function ChainOfThoughtDemo({
  variant,
}: VariantProps<typeof chainOfThoughtVariants>) {
  return (
    <ChainOfThoughtRoot variant={variant} className="mb-0">
      <ChainOfThoughtTrigger />
      <ChainOfThoughtContent>
        <ChainOfThoughtText>
          <p>Let me think about this step by step...</p>
          <p>
            First, I need to consider the main factors involved in this problem.
          </p>
        </ChainOfThoughtText>
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ChainOfThoughtDemo variant={variant} />
    </div>
  );
}

export function ChainOfThoughtVariantsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <VariantRow label="Outline (default)" variant="outline" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}

// ============================================================================
// Streaming Demo (simulates active reasoning)
// ============================================================================

const REASONING_SAMPLES = {
  short: "Let me think about this step by step...\n\nThe answer is 42.",
  medium:
    "Let me think about this step by step...\n\nFirst, I need to analyze the problem carefully. The key factors to consider are the constraints and requirements.\n\nAfter evaluating all options, the best approach would be to implement a solution that balances performance and maintainability.",
  long: `Let me think about this step by step...

First, I need to break down this complex problem into manageable parts:

1. **Understanding the requirements**
   - We need a solution that handles edge cases gracefully
   - Performance is critical for the main use case
   - The API should be intuitive for developers

2. **Evaluating the options**
   - Option A: Simple but limited
   - Option B: Flexible but complex
   - Option C: Balanced approach with trade-offs

3. **Implementation considerations**
   - We should use TypeScript for type safety
   - React hooks will help manage state
   - CSS-in-JS for styling flexibility

4. **Testing strategy**
   - Unit tests for core logic
   - Integration tests for component interactions
   - E2E tests for critical user flows

After careful consideration, I recommend Option C with some modifications to address the edge cases we identified. This provides the best balance of simplicity and flexibility while maintaining good performance characteristics.

The key insight here is that we don't need to solve everything at once - we can iterate on the implementation as we learn more about the real-world usage patterns.`,
};

function StreamingDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [streamSpeed, setStreamSpeed] = useState(20);
  const [textLength, setTextLength] = useState<"short" | "medium" | "long">(
    "medium",
  );

  const fullText = REASONING_SAMPLES[textLength];

  useEffect(() => {
    if (!isStreaming) return;

    setIsOpen(true);
    setStreamedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setStreamedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, streamSpeed);
    return () => clearInterval(interval);
  }, [isStreaming, fullText, streamSpeed]);

  const handleStart = () => {
    setStreamedText("");
    setIsStreaming(true);
  };

  const handleReset = () => {
    setIsStreaming(false);
    setStreamedText("");
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Streaming..." : "Start Reasoning"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={!streamedText && !isStreaming}
          className="gap-1.5"
        >
          <RotateCcwIcon className="size-3" />
          Reset
        </Button>

        <div className="ml-auto flex items-center gap-2 text-xs">
          <label htmlFor="cot-stream-speed" className="text-muted-foreground">
            Speed:
          </label>
          <select
            id="cot-stream-speed"
            value={streamSpeed}
            onChange={(e) => setStreamSpeed(Number(e.target.value))}
            className="rounded border bg-background px-2 py-1"
            disabled={isStreaming}
          >
            <option value={5}>Fast (5ms)</option>
            <option value={20}>Normal (20ms)</option>
            <option value={50}>Slow (50ms)</option>
          </select>

          <label
            htmlFor="cot-text-length"
            className="ml-2 text-muted-foreground"
          >
            Length:
          </label>
          <select
            id="cot-text-length"
            value={textLength}
            onChange={(e) =>
              setTextLength(e.target.value as "short" | "medium" | "long")
            }
            className="rounded border bg-background px-2 py-1"
            disabled={isStreaming}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </div>
      </div>

      <ChainOfThoughtRoot
        variant="muted"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mb-0"
      >
        <ChainOfThoughtTrigger active={isStreaming} />
        <ChainOfThoughtContent aria-busy={isStreaming}>
          <ChainOfThoughtText className="whitespace-pre-wrap">
            {streamedText || (
              <span className="text-muted-foreground/50 italic">
                Click &quot;Start Reasoning&quot; to see the streaming effect
              </span>
            )}
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtStreamingSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <StreamingDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Label Customization Demo
// ============================================================================

export function ChainOfThoughtLabelsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Default label
        </span>
        <ChainOfThoughtRoot className="mb-0">
          <ChainOfThoughtTrigger />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>
              Default &quot;Reasoning&quot; label
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Summary label
        </span>
        <ChainOfThoughtRoot className="mb-0">
          <ChainOfThoughtTrigger label="Reasoning (summary)" />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>
              Indicates this is a summary, not raw chain-of-thought
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Thinking label
        </span>
        <ChainOfThoughtRoot className="mb-0">
          <ChainOfThoughtTrigger label="Thinking" />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>
              Alternative &quot;Thinking&quot; label
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          With duration
        </span>
        <ChainOfThoughtRoot className="mb-0">
          <ChainOfThoughtTrigger duration={3.2} />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>Shows duration in seconds</ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>
    </SampleFrame>
  );
}

// ============================================================================
// Placeholder/Redaction Demo
// ============================================================================

export function ChainOfThoughtPlaceholderSample() {
  const [showPlaceholder, setShowPlaceholder] = useState(true);

  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={showPlaceholder ? "default" : "outline"}
          onClick={() => setShowPlaceholder(!showPlaceholder)}
          className="gap-1.5"
        >
          <EyeOffIcon className="size-3" />
          {showPlaceholder ? "Showing Placeholder" : "Showing Content"}
        </Button>
        <span className="text-muted-foreground text-xs">
          Simulates empty/redacted reasoning content
        </span>
      </div>

      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger />
        <ChainOfThoughtContent>
          {showPlaceholder ? (
            <ChainOfThoughtPlaceholder />
          ) : (
            <ChainOfThoughtText>
              This is the actual reasoning content that would appear when
              available.
            </ChainOfThoughtText>
          )}
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-muted-foreground text-xs">
          Custom placeholder message
        </span>
        <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger />
          <ChainOfThoughtContent>
            <ChainOfThoughtPlaceholder>
              Reasoning not available for this response.
            </ChainOfThoughtPlaceholder>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>
    </SampleFrame>
  );
}

// ============================================================================
// User Dismiss Behavior Demo
// ============================================================================

function UserDismissDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const fullText = REASONING_SAMPLES.medium;

  // Simulate controlled open based on streaming + user dismiss
  const shouldBeOpen = isStreaming && !userDismissed;

  useEffect(() => {
    if (!isStreaming) return;

    setStreamedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setStreamedText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStart = () => {
    setStreamedText("");
    setUserDismissed(false);
    setIsStreaming(true);
  };

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && isStreaming) {
        setUserDismissed(true);
      }
    },
    [isStreaming],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Streaming..." : "Start Reasoning"}
        </Button>
        <span className="text-muted-foreground text-xs">
          {userDismissed
            ? "You dismissed - won't reopen automatically"
            : isStreaming
              ? "Try closing while streaming - it won't reopen"
              : "Click to start, then try closing"}
        </span>
      </div>

      <ChainOfThoughtRoot
        variant="muted"
        {...(shouldBeOpen ? { open: true } : {})}
        defaultOpen={false}
        onOpenChange={handleOpenChange}
        className="mb-0"
      >
        <ChainOfThoughtTrigger active={isStreaming} />
        <ChainOfThoughtContent aria-busy={isStreaming}>
          <ChainOfThoughtText className="whitespace-pre-wrap">
            {streamedText || (
              <span className="text-muted-foreground/50 italic">
                Waiting for reasoning...
              </span>
            )}
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtUserDismissSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <UserDismissDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Many Instances
// ============================================================================

export function ChainOfThoughtStressTestSample() {
  const [count, setCount] = useState(5);
  const [allStreaming, setAllStreaming] = useState(false);

  return (
    <SampleFrame className="flex h-auto max-h-96 flex-col gap-4 overflow-y-auto p-4">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-background pb-2">
        <Button
          size="sm"
          variant={allStreaming ? "default" : "outline"}
          onClick={() => setAllStreaming(!allStreaming)}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {allStreaming ? "Stop All" : "Stream All"}
        </Button>
        <label
          htmlFor="cot-stress-count"
          className="text-muted-foreground text-xs"
        >
          Count:
        </label>
        <select
          id="cot-stress-count"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="rounded border bg-background px-2 py-1 text-xs"
        >
          <option value={3}>3</option>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>

      {Array.from({ length: count }).map((_, i) => (
        <ChainOfThoughtRoot key={i} variant="outline" className="mb-0">
          <ChainOfThoughtTrigger
            active={allStreaming}
            label={`Step ${i + 1}`}
          />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>
              Reasoning content for step {i + 1}. This tests rendering multiple
              instances and scroll behavior.
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      ))}
    </SampleFrame>
  );
}

// ============================================================================
// Timeline Demo - Steps with connecting line
// ============================================================================

const SAMPLE_STEPS = [
  {
    header: "Understanding the problem",
    body: "First, I need to break down the user's question and identify the key requirements.",
  },
  {
    header: "Analyzing constraints",
    body: "The solution must be performant, maintainable, and work with the existing architecture.",
  },
  {
    header: "Evaluating options",
    body: "There are three possible approaches: A) Simple but limited, B) Flexible but complex, C) Balanced trade-offs.",
  },
  {
    header: "Making a decision",
    body: "Option C provides the best balance. It handles edge cases while keeping the API intuitive.",
  },
  {
    header: "Implementation plan",
    body: "We'll start with the core logic, add TypeScript types, then build the React components.",
  },
];

export function ChainOfThoughtTimelineSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            {SAMPLE_STEPS.map((step, i) => (
              <ChainOfThoughtStep key={i}>
                <ChainOfThoughtStepHeader>
                  {step.header}
                </ChainOfThoughtStepHeader>
                <ChainOfThoughtStepBody>{step.body}</ChainOfThoughtStepBody>
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Timeline with Numbered Steps
// ============================================================================

export function ChainOfThoughtNumberedStepsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Analysis Steps" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            {SAMPLE_STEPS.map((step, i) => (
              <ChainOfThoughtStep key={i} stepLabel={i + 1}>
                <ChainOfThoughtStepHeader>
                  {step.header}
                </ChainOfThoughtStepHeader>
                <ChainOfThoughtStepBody>{step.body}</ChainOfThoughtStepBody>
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Timeline with Active/Streaming Step
// ============================================================================

function TimelineStreamingDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [stepTexts, setStepTexts] = useState<string[]>([]);

  useEffect(() => {
    if (!isStreaming) return;

    setStepTexts([]);
    setCurrentStep(0);

    let stepIdx = 0;
    let charIdx = 0;

    const interval = setInterval(() => {
      if (stepIdx >= SAMPLE_STEPS.length) {
        setIsStreaming(false);
        setCurrentStep(-1);
        clearInterval(interval);
        return;
      }

      const currentText = SAMPLE_STEPS[stepIdx]!.body;
      if (charIdx < currentText.length) {
        setStepTexts((prev) => {
          const newTexts = [...prev];
          newTexts[stepIdx] = currentText.slice(0, charIdx + 1);
          return newTexts;
        });
        charIdx++;
      } else {
        stepIdx++;
        charIdx = 0;
        setCurrentStep(stepIdx);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStart = () => {
    setStepTexts([]);
    setCurrentStep(-1);
    setIsStreaming(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Reasoning..." : "Start Timeline"}
        </Button>
      </div>

      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger active={isStreaming} />
        <ChainOfThoughtContent aria-busy={isStreaming}>
          <ChainOfThoughtTimeline>
            {SAMPLE_STEPS.map((step, i) => {
              const isActive = currentStep === i;
              const isComplete =
                i < currentStep || (!isStreaming && stepTexts[i]);
              const isPending = i > currentStep && isStreaming;
              const text = stepTexts[i] || "";

              if (!text && isPending) return null;

              return (
                <ChainOfThoughtStep
                  key={i}
                  active={isActive}
                  status={
                    isComplete ? "complete" : isPending ? "pending" : undefined
                  }
                  stepLabel={i + 1}
                >
                  <ChainOfThoughtStepHeader>
                    {step.header}
                  </ChainOfThoughtStepHeader>
                  <ChainOfThoughtStepBody>
                    {text || (
                      <span className="text-muted-foreground/50 italic">
                        ...
                      </span>
                    )}
                  </ChainOfThoughtStepBody>
                </ChainOfThoughtStep>
              );
            })}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtTimelineStreamingSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <TimelineStreamingDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Agent Trace Demo - Search, Image, and Tool steps with badges
// ============================================================================

export function ChainOfThoughtAgentTraceSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="ghost" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Chain of Thought" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            {/* Search step with source badges */}
            <ChainOfThoughtStep type="search">
              <ChainOfThoughtStepHeader>
                Searching for profiles for Hayden Bleasel
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>www.x.com</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>www.instagram.com</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>www.github.com</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>

            {/* Image found step */}
            <ChainOfThoughtStep type="image">
              <ChainOfThoughtStepHeader>
                Found the profile photo for Hayden Bleasel
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepImage
                src="https://avatars.githubusercontent.com/u/1147460?v=4"
                alt="Profile photo"
              />
              <ChainOfThoughtStepBody className="mt-2 text-xs">
                Hayden Bleasel&apos;s profile photo from x.com
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            {/* Text/info step */}
            <ChainOfThoughtStep type="text">
              <ChainOfThoughtStepBody>
                Hayden Bleasel is an Australian product designer, software
                engineer, and founder. He is currently based in the United
                States working for Vercel, an American cloud application
                company.
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            {/* Another search step */}
            <ChainOfThoughtStep type="search" active>
              <ChainOfThoughtStepHeader>
                Searching for recent work...
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>www.github.com</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>www.dribbble.com</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Tool Calls Demo - Different tool types with icons
// ============================================================================

export function ChainOfThoughtToolCallsSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Agent Execution" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            <ChainOfThoughtStep type="tool" status="complete">
              <ChainOfThoughtStepHeader>
                Called: get_weather
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>
                  location: San Francisco
                </ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
              <ChainOfThoughtStepBody className="mt-1">
                Returned: 68°F, Partly Cloudy
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="search" status="complete">
              <ChainOfThoughtStepHeader>
                Called: web_search
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>
                  query: &quot;best restaurants SF&quot;
                </ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
              <ChainOfThoughtStepBody className="mt-1">
                Found 15 results from Yelp, Google Maps, TripAdvisor
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="tool" active>
              <ChainOfThoughtStepHeader>
                Calling: make_reservation
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>
                  restaurant: House of Prime Rib
                </ChainOfThoughtBadge>
                <ChainOfThoughtBadge>party_size: 4</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="complete" status="pending">
              <ChainOfThoughtStepHeader>
                Summarize results
              </ChainOfThoughtStepHeader>
            </ChainOfThoughtStep>
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}
