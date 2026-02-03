"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import type { VariantProps } from "class-variance-authority";
import {
  PlayIcon,
  RotateCcwIcon,
  EyeOffIcon,
  ChevronDownIcon,
} from "lucide-react";
import { AISDKMessageConverter } from "@assistant-ui/react-ai-sdk";
import {
  MessageProvider,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import type { UIMessage } from "ai";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import {
  ChainOfThoughtRoot,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtText,
  ChainOfThoughtPlaceholder,
  ChainOfThoughtTrace,
  ChainOfThoughtTimeline,
  ChainOfThoughtStep,
  ChainOfThoughtStepHeader,
  ChainOfThoughtStepBody,
  ChainOfThoughtStepBadges,
  ChainOfThoughtStepImage,
  ChainOfThoughtBadge,
  ChainOfThoughtAnnouncer,
  ChainOfThoughtTraceTool,
  ChainOfThoughtToolBadge,
  traceFromThreadMessage,
  type TraceNode,
  type ChainOfThoughtTraceGroupSummaryProps,
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
// Stress Test: Very Long Content (Scroll Behavior)
// ============================================================================

const EXTREMELY_LONG_CONTENT = `## Deep Analysis of Complex Systems

Let me work through this problem systematically, examining each layer of complexity:

### Phase 1: Initial Assessment

The first thing I notice is that we're dealing with a multi-dimensional optimization problem. The constraints are:
- Performance must remain under 100ms for 95th percentile
- Memory usage should not exceed 512MB
- The solution must be backwards compatible

This reminds me of several similar problems I've encountered. The key insight is that we can't optimize for all three simultaneously without trade-offs.

### Phase 2: Breaking Down the Problem

Let's decompose this into smaller, manageable pieces:

1. **Data Flow Analysis**
   - Input validation and sanitization
   - Transformation pipeline design
   - Output formatting and serialization
   - Error handling and recovery

2. **Performance Considerations**
   - Hot path identification
   - Cache invalidation strategy
   - Lazy evaluation opportunities
   - Parallelization potential

3. **Memory Management**
   - Object pooling for frequent allocations
   - Stream processing for large datasets
   - Weak references for cached data
   - Garbage collection tuning

### Phase 3: Evaluating Approaches

**Approach A: Eager Evaluation**
- Pros: Simple implementation, predictable behavior
- Cons: High memory usage, slower startup
- Estimated complexity: O(n²) time, O(n) space

**Approach B: Lazy Streaming**
- Pros: Low memory footprint, fast startup
- Cons: Complex error handling, debugging difficulty
- Estimated complexity: O(n) time, O(1) space

**Approach C: Hybrid with Adaptive Switching**
- Pros: Best of both worlds, adapts to input size
- Cons: More code to maintain, edge cases
- Estimated complexity: O(n log n) time, O(√n) space

### Phase 4: Implementation Strategy

After careful consideration, I recommend Approach C with the following modifications:

\`\`\`typescript
function processData<T>(
  input: AsyncIterable<T>,
  options: ProcessOptions
): AsyncIterable<Result<T>> {
  const threshold = options.adaptiveThreshold ?? 1000;
  
  if (estimateSize(input) < threshold) {
    return eagerProcess(input, options);
  }
  
  return lazyProcess(input, options);
}
\`\`\`

### Phase 5: Testing Strategy

We need comprehensive tests covering:

1. Unit tests for each transformation function
2. Integration tests for the full pipeline
3. Performance benchmarks with various input sizes
4. Memory profiling under load
5. Chaos testing for error conditions

### Phase 6: Monitoring and Observability

Once deployed, we should track:
- P50, P95, P99 latency distributions
- Memory allocation rates
- Error rates by category
- Cache hit/miss ratios

This gives us the visibility needed to iterate on performance.

### Conclusion

The hybrid approach provides the best balance of performance and maintainability. Implementation should take approximately 3 sprints, with the first sprint focused on core infrastructure.`;

export function ChainOfThoughtLongContentSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Tests the max-h-64 scroll container with very long markdown content.
      </p>
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Deep Analysis" duration={47.3} />
        <ChainOfThoughtContent>
          <ChainOfThoughtText className="whitespace-pre-wrap">
            {EXTREMELY_LONG_CONTENT}
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Unbreakable Text (Horizontal Overflow)
// ============================================================================

const UNBREAKABLE_TEXT = `ThisIsAnExtremelyLongWordWithNoSpacesThatShouldTriggerHorizontalScrollingOrTextOverflowBehaviorInTheContainerAndWeNeedToMakeSureItDoesNotBreakTheLayout`;

const LONG_URL = `https://example.com/api/v2/users/12345/documents/abcdefghijklmnop/versions/latest?include=metadata,permissions,annotations&format=json&api_key=EXAMPLE_API_KEY`;

const LONG_CODE = `const extremelyLongVariableNameThatShouldNeverBeUsedInProductionCode = calculateSomethingVeryComplexWithManyParameters(param1, param2, param3, param4, param5);`;

export function ChainOfThoughtOverflowSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Tests horizontal overflow with unbreakable content: long words, URLs,
        and code.
      </p>
      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Overflow Test" />
        <ChainOfThoughtContent>
          <ChainOfThoughtText>
            <p className="mb-2">
              <strong>Long word:</strong> {UNBREAKABLE_TEXT}
            </p>
            <p className="mb-2">
              <strong>Long URL:</strong>{" "}
              <code className="break-all text-xs">{LONG_URL}</code>
            </p>
            <p>
              <strong>Long code:</strong>{" "}
              <code className="text-xs">{LONG_CODE}</code>
            </p>
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Unicode and Emoji Content
// ============================================================================

export function ChainOfThoughtUnicodeSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Tests rendering with emoji, unicode, RTL text, and special characters.
      </p>
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="🧠 Thinking..." />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            <ChainOfThoughtStep type="search">
              <ChainOfThoughtStepHeader>
                🔍 Searching for relevant information
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                Found results in multiple languages: English, 日本語, العربية,
                עברית, 中文, Ελληνικά
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="text">
              <ChainOfThoughtStepHeader>
                📊 Processing mathematical notation
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                The equation ∑(n=1→∞) 1/n² = π²/6 demonstrates the Basel
                problem. Also: α β γ δ ε ζ η θ, ∫∂∇∆, ≤≥≠≈∞, ±×÷√
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="text">
              <ChainOfThoughtStepHeader>
                🎨 Emoji stress test
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                Skin tones: 👋🏻👋🏼👋🏽👋🏾👋🏿 | ZWJ sequences: 👨‍👩‍👧‍👦 👩‍💻
                🏳️‍🌈 | Flags: 🇺🇸🇬🇧🇯🇵🇩🇪🇫🇷 | Complex: 👨🏽‍🦱👩🏻‍🦰👱🏿‍♀️
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="complete">
              <ChainOfThoughtStepHeader>
                ✅ Analysis complete
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                Special chars: — – … • ™ © ® ° ¶ § † ‡ ※ ⁂
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Many Steps (Performance)
// ============================================================================

export function ChainOfThoughtManyStepsSample() {
  const [stepCount, setStepCount] = useState(10);

  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <label htmlFor="step-count" className="text-muted-foreground text-xs">
          Steps:
        </label>
        <select
          id="step-count"
          value={stepCount}
          onChange={(e) => setStepCount(Number(e.target.value))}
          className="rounded border bg-background px-2 py-1 text-xs"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-muted-foreground text-xs">
          Tests rendering performance with many timeline steps.
        </span>
      </div>

      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label={`${stepCount} Steps`} />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            {Array.from({ length: stepCount }).map((_, i) => (
              <ChainOfThoughtStep
                key={i}
                stepLabel={i + 1}
                status={i === stepCount - 1 ? "active" : "complete"}
                active={i === stepCount - 1}
              >
                <ChainOfThoughtStepHeader>
                  Step {i + 1}: Processing batch {Math.floor(i / 10) + 1}
                </ChainOfThoughtStepHeader>
                <ChainOfThoughtStepBody>
                  Completed operation {i + 1} of {stepCount}. Status: success.
                </ChainOfThoughtStepBody>
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Many Badges
// ============================================================================

const MANY_SOURCES = [
  "wikipedia.org",
  "arxiv.org",
  "github.com",
  "stackoverflow.com",
  "medium.com",
  "dev.to",
  "hackernews.com",
  "reddit.com/r/programming",
  "twitter.com",
  "youtube.com",
  "docs.microsoft.com",
  "developer.mozilla.org",
  "w3schools.com",
  "freecodecamp.org",
  "coursera.org",
];

export function ChainOfThoughtManyBadgesSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Tests badge wrapping and layout with many source badges.
      </p>
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Research Results" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            <ChainOfThoughtStep type="search">
              <ChainOfThoughtStepHeader>
                Found {MANY_SOURCES.length} relevant sources
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                {MANY_SOURCES.map((source) => (
                  <ChainOfThoughtBadge key={source}>
                    {source}
                  </ChainOfThoughtBadge>
                ))}
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="tool">
              <ChainOfThoughtStepHeader>
                Calling API with many parameters
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>method: POST</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>
                  endpoint: /api/v2/analyze
                </ChainOfThoughtBadge>
                <ChainOfThoughtBadge>
                  content-type: application/json
                </ChainOfThoughtBadge>
                <ChainOfThoughtBadge>auth: bearer</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>timeout: 30000ms</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>retries: 3</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>cache: enabled</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>compression: gzip</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Rapid Toggle (Animation Performance)
// ============================================================================

function RapidToggleDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [toggleCount, setToggleCount] = useState(0);
  const [isRapidToggling, setIsRapidToggling] = useState(false);

  useEffect(() => {
    if (!isRapidToggling) return;

    let count = 0;
    const interval = setInterval(() => {
      if (count >= 20) {
        setIsRapidToggling(false);
        clearInterval(interval);
        return;
      }
      setIsOpen((prev) => !prev);
      setToggleCount((c) => c + 1);
      count++;
    }, 100);

    return () => clearInterval(interval);
  }, [isRapidToggling]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsRapidToggling(true)}
          disabled={isRapidToggling}
        >
          {isRapidToggling ? "Toggling..." : "Rapid Toggle (20x)"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setToggleCount(0)}
          disabled={isRapidToggling}
        >
          Reset Counter
        </Button>
        <span className="text-muted-foreground text-xs">
          Toggles: {toggleCount}
        </span>
      </div>

      <ChainOfThoughtRoot
        variant="muted"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mb-0"
      >
        <ChainOfThoughtTrigger label="Animation Stress Test" />
        <ChainOfThoughtContent>
          <ChainOfThoughtText>
            This tests the animation performance when rapidly opening and
            closing the disclosure. The scroll lock and animation transitions
            should remain smooth.
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtRapidToggleSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <RapidToggleDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Nested/Complex Structure
// ============================================================================

export function ChainOfThoughtNestedStructureSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Tests complex nested structure with mixed content types.
      </p>
      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Complex Agent Trace" duration={12.7} />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            {/* Main planning step */}
            <ChainOfThoughtStep type="text" stepLabel={1}>
              <ChainOfThoughtStepHeader>
                Breaking down the task into subtasks
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                <p>I need to:</p>
                <ol className="ml-4 list-decimal">
                  <li>Research the topic</li>
                  <li>Find relevant images</li>
                  <li>Analyze the data</li>
                  <li>Generate a summary</li>
                </ol>
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            {/* Research subtask with nested results */}
            <ChainOfThoughtStep type="search" stepLabel={2}>
              <ChainOfThoughtStepHeader>
                Researching: Machine Learning fundamentals
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>papers: 47</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>articles: 128</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>tutorials: 23</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
              <ChainOfThoughtStepBody className="mt-2">
                <p className="mb-2 text-foreground">Key findings:</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>Neural networks are the foundation of deep learning</li>
                  <li>Gradient descent optimizes model parameters</li>
                  <li>Regularization prevents overfitting</li>
                </ul>
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            {/* Image search with preview */}
            <ChainOfThoughtStep type="image" stepLabel={3}>
              <ChainOfThoughtStepHeader>
                Found relevant diagrams
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepImage
                src="https://placehold.co/400x200/1a1a2e/ffffff?text=Neural+Network+Diagram"
                alt="Neural network architecture"
              />
              <ChainOfThoughtStepBadges>
                <ChainOfThoughtBadge>format: PNG</ChainOfThoughtBadge>
                <ChainOfThoughtBadge>size: 400x200</ChainOfThoughtBadge>
              </ChainOfThoughtStepBadges>
            </ChainOfThoughtStep>

            {/* Tool call with code */}
            <ChainOfThoughtStep type="tool" stepLabel={4}>
              <ChainOfThoughtStepHeader>
                Executing: data_analysis
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                  {`{
  "accuracy": 0.947,
  "precision": 0.932,
  "recall": 0.958,
  "f1_score": 0.945
}`}
                </pre>
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            {/* Active step */}
            <ChainOfThoughtStep type="text" stepLabel={5} active>
              <ChainOfThoughtStepHeader>
                Generating final summary...
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody>
                Synthesizing findings from 47 papers and 128 articles into a
                cohesive overview of machine learning fundamentals.
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Concurrent Streaming Instances
// ============================================================================

function ConcurrentStreamingInstance({
  id,
  delay,
}: {
  id: number;
  delay: number;
}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState("");
  const fullText = `This is instance ${id} streaming its content. Each instance operates independently with its own timing and state. The delay was ${delay}ms.`;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    const startTimeout = setTimeout(() => {
      setIsStreaming(true);
      setText("");
      let i = 0;
      interval = setInterval(
        () => {
          if (i < fullText.length) {
            setText(fullText.slice(0, i + 1));
            i++;
          } else {
            setIsStreaming(false);
            if (interval) {
              clearInterval(interval);
              interval = undefined;
            }
          }
        },
        20 + Math.random() * 20,
      );
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [delay, fullText]);

  return (
    <ChainOfThoughtRoot
      variant={id % 2 === 0 ? "outline" : "muted"}
      defaultOpen
      className="mb-0"
    >
      <ChainOfThoughtTrigger active={isStreaming} label={`Stream ${id}`} />
      <ChainOfThoughtContent aria-busy={isStreaming}>
        <ChainOfThoughtText>
          {text || (
            <span className="text-muted-foreground/50 italic">
              Starting in {delay}ms...
            </span>
          )}
        </ChainOfThoughtText>
      </ChainOfThoughtContent>
    </ChainOfThoughtRoot>
  );
}

export function ChainOfThoughtConcurrentStreamingSample() {
  const [key, setKey] = useState(0);
  const instances = [
    { id: 1, delay: 0 },
    { id: 2, delay: 300 },
    { id: 3, delay: 600 },
    { id: 4, delay: 900 },
    { id: 5, delay: 1200 },
  ];

  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setKey((k) => k + 1)}
        >
          <RotateCcwIcon className="mr-1.5 size-3" />
          Restart All
        </Button>
        <span className="text-muted-foreground text-xs">
          5 instances streaming with staggered start times
        </span>
      </div>

      <div key={key} className="flex flex-col gap-2">
        {instances.map((inst) => (
          <ConcurrentStreamingInstance
            key={inst.id}
            id={inst.id}
            delay={inst.delay}
          />
        ))}
      </div>
    </SampleFrame>
  );
}

// ============================================================================
// Stress Test: Edge Cases
// ============================================================================

export function ChainOfThoughtEdgeCasesSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <p className="text-muted-foreground text-xs">
        Various edge cases: empty content, single character, whitespace-only.
      </p>

      {/* Empty placeholder */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          Empty content → Placeholder
        </span>
        <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="Empty" />
          <ChainOfThoughtContent>
            <ChainOfThoughtPlaceholder />
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      {/* Single character */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          Single character
        </span>
        <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="Minimal" />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>.</ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      {/* Whitespace only */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          Whitespace-only content
        </span>
        <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="Whitespace" />
          <ChainOfThoughtContent>
            <ChainOfThoughtText className="whitespace-pre">
              {"   \n   \n   "}
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      {/* Very long label */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          Very long trigger label
        </span>
        <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="This is an extremely long label that should test how the trigger handles text overflow and whether it truncates or wraps properly in the available space" />
          <ChainOfThoughtContent>
            <ChainOfThoughtText>
              Content with a very long label above.
            </ChainOfThoughtText>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>

      {/* Timeline with single step */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-muted-foreground text-xs">
          Timeline with single step
        </span>
        <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="Single Step" />
          <ChainOfThoughtContent>
            <ChainOfThoughtTimeline>
              <ChainOfThoughtStep type="complete">
                <ChainOfThoughtStepHeader>
                  Only one step
                </ChainOfThoughtStepHeader>
                <ChainOfThoughtStepBody>
                  This timeline has only a single step.
                </ChainOfThoughtStepBody>
              </ChainOfThoughtStep>
            </ChainOfThoughtTimeline>
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </div>
    </SampleFrame>
  );
}

// ============================================================================
// Motion Showcase Demo - Demonstrates all motion refinements
// ============================================================================

const MOTION_DEMO_STEPS = [
  {
    header: "Planning approach",
    body: "Analyzing the request and determining the best strategy...",
  },
  {
    header: "Gathering context",
    body: "Searching for relevant information and prior examples.",
  },
  {
    header: "Evaluating options",
    body: "Comparing approaches A, B, and C for trade-offs.",
  },
  {
    header: "Building solution",
    body: "Implementing the chosen approach with best practices.",
  },
  {
    header: "Validating result",
    body: "Testing the solution and verifying correctness.",
  },
];

function MotionShowcaseDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleStart = () => {
    setIsOpen(true);
    setActiveStep(0);
    setCompletedSteps([]);
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsOpen(false);
    setActiveStep(-1);
    setCompletedSteps([]);
    setIsRunning(false);
  };

  // Progress through steps automatically
  useEffect(() => {
    if (!isRunning || activeStep < 0) return;

    const timer = setTimeout(() => {
      if (activeStep < MOTION_DEMO_STEPS.length - 1) {
        setCompletedSteps((prev) => [...prev, activeStep]);
        setActiveStep((prev) => prev + 1);
      } else {
        setCompletedSteps((prev) => [...prev, activeStep]);
        setActiveStep(-1);
        setIsRunning(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeStep, isRunning]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isRunning}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isRunning ? "Running..." : "Start Demo"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          disabled={!isOpen && activeStep === -1}
          className="gap-1.5"
        >
          <RotateCcwIcon className="size-3" />
          Reset
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1">
          <h4 className="font-medium text-foreground text-sm">
            Motion Features
          </h4>
          <ul className="space-y-0.5 text-muted-foreground text-xs">
            <li>
              • <strong>Spring easing</strong> — Chevron rotates with natural
              overshoot
            </li>
            <li>
              • <strong>Staggered reveals</strong> — Steps cascade in with 40ms
              delays
            </li>
            <li>
              • <strong>Pulsing ring</strong> — Active step has expanding ring
              indicator
            </li>
            <li>
              • <strong>Scale pop</strong> — Steps briefly scale up when
              completing
            </li>
            <li>
              • <strong>Diagonal shimmer</strong> — 30° angle for more dynamic
              movement
            </li>
            <li>
              • <strong>Smooth collapse</strong> — Expo easing with opacity
              leading
            </li>
          </ul>
        </div>
      </div>

      <ChainOfThoughtRoot
        variant="outline"
        open={isOpen}
        onOpenChange={setIsOpen}
        className="mb-0"
      >
        <ChainOfThoughtTrigger label="Reasoning" active={isRunning} />
        <ChainOfThoughtContent aria-busy={isRunning}>
          <ChainOfThoughtTimeline>
            {MOTION_DEMO_STEPS.map((step, i) => {
              const isActive = activeStep === i;
              const isComplete = completedSteps.includes(i);
              const isPending = !isActive && !isComplete;
              const isVisible =
                isComplete || isActive || (isRunning && i <= activeStep + 1);

              if (!isVisible && isPending) return null;

              return (
                <ChainOfThoughtStep
                  key={i}
                  stepLabel={i + 1}
                  active={isActive}
                  status={
                    isComplete ? "complete" : isPending ? "pending" : undefined
                  }
                >
                  <ChainOfThoughtStepHeader>
                    {step.header}
                  </ChainOfThoughtStepHeader>
                  <ChainOfThoughtStepBody>{step.body}</ChainOfThoughtStepBody>
                </ChainOfThoughtStep>
              );
            })}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtMotionShowcaseSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <MotionShowcaseDemo />
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
// PartsGrouped Trace Demo - parentId grouping + timeline rendering
// ============================================================================

const TRACE_PARENT_IDS = {
  search: "trace:search",
  image: "trace:image",
  summary: "trace:summary",
} as const;

type TraceActiveStep = keyof typeof TRACE_PARENT_IDS | "complete";

function PartsGroupedTraceDemo() {
  const [activeStep, setActiveStep] = useState<TraceActiveStep>("search");
  const isRunning = activeStep !== "complete";

  const message: ThreadAssistantMessage = {
    id: "cot-trace-message",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    role: "assistant",
    status: isRunning
      ? { type: "running" }
      : { type: "complete", reason: "stop" },
    content: [
      {
        type: "tool-call",
        toolCallId: "tc-search-1",
        toolName: "search",
        args: { query: "profiles for Hayden Bleasel" },
        argsText: JSON.stringify({ query: "profiles for Hayden Bleasel" }),
        result: {
          results: ["x.com", "instagram.com", "github.com"],
        },
        parentId: TRACE_PARENT_IDS.search,
      },
      {
        type: "text",
        text: "Found profiles on x.com, instagram.com, and github.com.",
        parentId: TRACE_PARENT_IDS.search,
      },
      {
        type: "tool-call",
        toolCallId: "tc-image-1",
        toolName: "image",
        args: { prompt: "Create a profile avatar preview" },
        argsText: JSON.stringify({ prompt: "Create a profile avatar preview" }),
        result: { ok: true },
        parentId: TRACE_PARENT_IDS.image,
      },
      {
        type: "text",
        text: "Generated an avatar image preview.",
        parentId: TRACE_PARENT_IDS.image,
      },
      {
        type: "text",
        text: "Summary: Hayden Bleasel is a product designer and engineer.",
        parentId: TRACE_PARENT_IDS.summary,
      },
    ],
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs">Active step:</span>
        <Button
          size="sm"
          variant={activeStep === "search" ? "default" : "outline"}
          onClick={() => setActiveStep("search")}
        >
          Search
        </Button>
        <Button
          size="sm"
          variant={activeStep === "image" ? "default" : "outline"}
          onClick={() => setActiveStep("image")}
        >
          Image
        </Button>
        <Button
          size="sm"
          variant={activeStep === "summary" ? "default" : "outline"}
          onClick={() => setActiveStep("summary")}
        >
          Summary
        </Button>
        <Button
          size="sm"
          variant={activeStep === "complete" ? "default" : "outline"}
          onClick={() => setActiveStep("complete")}
        >
          Complete
        </Button>
      </div>

      <MessageProvider message={message} index={0} isLast>
        <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
          <ChainOfThoughtTrigger label="Trace" active={isRunning} />
          <ChainOfThoughtContent aria-busy={isRunning}>
            <ChainOfThoughtTrace
              inferStep={({ groupKey, parts }) => {
                const tool = parts.find((p) => p?.type === "tool-call") as
                  | { toolName?: string }
                  | undefined;
                const toolName = tool?.toolName;

                if (toolName === "search") {
                  return { label: "Searching for profiles", type: "search" };
                }

                if (toolName === "image") {
                  return { label: "Generating image", type: "image" };
                }

                if (groupKey === TRACE_PARENT_IDS.summary) {
                  return { label: "Summary", type: "text" };
                }

                return { label: "Step", type: "default" };
              }}
              components={{
                Text: MarkdownText,
                tools: { Override: ChainOfThoughtTraceTool },
              }}
            />
          </ChainOfThoughtContent>
        </ChainOfThoughtRoot>
      </MessageProvider>
    </div>
  );
}

export function ChainOfThoughtPartsGroupedSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <PartsGroupedTraceDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Nested Trace Demo - Subagent groups with latest-step marquee
// ============================================================================

const NESTED_TRACE_SAMPLE: TraceNode[] = [
  {
    kind: "step",
    id: "plan",
    label: "Planning approach",
    type: "text",
    status: "complete",
  },
  {
    kind: "group",
    id: "agent-research",
    label: "Researcher",
    status: "running",
    variant: "subagent",
    children: [
      {
        kind: "group",
        id: "agent-web",
        label: "Web Scout",
        variant: "subagent",
        children: [
          {
            kind: "step",
            id: "crawl",
            label: "Crawling sources",
            type: "tool",
            toolName: "browser",
            status: "complete",
          },
        ],
      },
      {
        kind: "step",
        id: "search",
        label: "Searching docs",
        type: "search",
        toolName: "search",
        status: "running",
      },
    ],
  },
  {
    kind: "step",
    id: "draft",
    label: "Drafting response",
    type: "text",
    status: "complete",
  },
];

export function ChainOfThoughtNestedTraceSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Nested Trace" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTrace trace={NESTED_TRACE_SAMPLE} maxDepth={2} />
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

function CustomTraceGroupSummary({
  group,
  latestStep,
  isOpen,
  canExpand,
  onToggle,
}: ChainOfThoughtTraceGroupSummaryProps) {
  const summaryLabel =
    group.summary?.latestLabel ??
    latestStep?.label ??
    (latestStep?.toolName ? `Tool: ${latestStep.toolName}` : undefined) ??
    "Working...";
  const toolName = group.summary?.toolName ?? latestStep?.toolName;
  const status = latestStep?.status ?? group.status;
  const badgeStatus =
    status === "running"
      ? "running"
      : status === "error" || status === "incomplete"
        ? "error"
        : "complete";
  const isSubagent = group.variant === "subagent";

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canExpand}
      className="w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 disabled:cursor-default disabled:hover:bg-transparent"
      aria-expanded={isOpen}
    >
      <div className="flex items-center gap-2 text-sm">
        {canExpand ? (
          <ChevronDownIcon
            aria-hidden
            className={`size-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        ) : (
          <span className="size-4" aria-hidden />
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            isSubagent
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isSubagent ? "Subagent" : "Agent"}
        </span>
        <span className="font-medium text-foreground">{group.label}</span>
      </div>
      <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
        {toolName ? (
          <ChainOfThoughtToolBadge toolName={toolName} status={badgeStatus} />
        ) : null}
        <span className="truncate">{summaryLabel}</span>
      </div>
    </button>
  );
}

export function ChainOfThoughtCustomGroupSummarySample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Custom Group Summary" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTrace
            trace={NESTED_TRACE_SAMPLE}
            maxDepth={2}
            nodeComponents={{ GroupSummary: CustomTraceGroupSummary }}
          />
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </SampleFrame>
  );
}

// ============================================================================
// AI SDK Adapter Demo - Convert UIMessage -> ThreadMessage -> Trace
// ============================================================================

const AISDK_MESSAGES: UIMessage[] = [
  {
    id: "user-1",
    role: "user",
    parts: [
      {
        type: "text",
        text: "Find the latest release notes for Next.js",
      },
    ],
  },
  {
    id: "assistant-1",
    role: "assistant",
    parts: [
      {
        type: "dynamic-tool",
        toolName: "search",
        toolCallId: "tool-search-1",
        state: "input-available",
        input: { query: "Next.js latest release notes" },
      },
      {
        type: "text",
        text: "Found the latest release notes and summarized the key changes.",
      },
    ],
  },
];

function AISDKAdapterDemo() {
  const threadMessages = useMemo(
    () => AISDKMessageConverter.toThreadMessages(AISDK_MESSAGES, true),
    [],
  );
  const assistantMessage = threadMessages.find(
    (message) => message.role === "assistant",
  );

  const baseTrace = useMemo(
    () => (assistantMessage ? traceFromThreadMessage(assistantMessage) : []),
    [assistantMessage],
  );
  const trace = useMemo<TraceNode[]>(() => {
    if (baseTrace.length === 0) return [];
    return [
      {
        kind: "group",
        id: "agent-ai-sdk",
        label: "AI SDK Agent",
        variant: "subagent",
        children: baseTrace,
      },
    ];
  }, [baseTrace]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md bg-muted/50 p-3 font-mono text-[11px] text-muted-foreground leading-relaxed">
        {
          "const threadMessages = AISDKMessageConverter.toThreadMessages(uiMessages, true)"
        }
        {"\n"}
        {"const trace = traceFromThreadMessage(threadMessages[1])"}
        {"\n"}
        {
          "const nested = [{ kind: 'group', id: 'agent', label: 'AI SDK Agent', children: trace }]"
        }
        {"\n"}
        {"return <ChainOfThought.Trace trace={nested} />"}
      </div>

      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="AI SDK Trace Adapter" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTrace trace={trace} />
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtAISDKAdapterSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-4 p-4">
      <AISDKAdapterDemo />
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

// ============================================================================
// Error State Demo - Steps with error status and retry
// ============================================================================

function ErrorStateDemo() {
  const [errorStep, setErrorStep] = useState(2);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
    // Simulate retry success after 2 attempts
    if (retryCount >= 1) {
      setErrorStep(-1);
    }
  }, [retryCount]);

  const handleReset = () => {
    setErrorStep(2);
    setRetryCount(0);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcwIcon className="mr-1.5 size-3" />
          Reset Demo
        </Button>
        <span className="text-muted-foreground text-xs">
          {errorStep === -1
            ? "Error resolved!"
            : `Retry attempts: ${retryCount}`}
        </span>
      </div>

      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Agent Execution" />
        <ChainOfThoughtContent>
          <ChainOfThoughtTimeline>
            <ChainOfThoughtStep type="tool" status="complete">
              <ChainOfThoughtStepHeader>
                Called: fetch_user_data
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody className="mt-1">
                Successfully retrieved user profile
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep type="search" status="complete">
              <ChainOfThoughtStepHeader>
                Called: search_database
              </ChainOfThoughtStepHeader>
              <ChainOfThoughtStepBody className="mt-1">
                Found 47 matching records
              </ChainOfThoughtStepBody>
            </ChainOfThoughtStep>

            <ChainOfThoughtStep
              type="tool"
              {...(errorStep === 2
                ? {
                    error: "Connection timeout after 30s",
                    onRetry: handleRetry,
                  }
                : {})}
              {...(errorStep === -1 ? { status: "complete" as const } : {})}
            >
              <ChainOfThoughtStepHeader>
                Called: external_api
              </ChainOfThoughtStepHeader>
              {errorStep === -1 && (
                <ChainOfThoughtStepBody className="mt-1">
                  API call successful on retry
                </ChainOfThoughtStepBody>
              )}
            </ChainOfThoughtStep>

            {errorStep === -1 && (
              <ChainOfThoughtStep type="complete" status="complete">
                <ChainOfThoughtStepHeader>
                  All steps completed
                </ChainOfThoughtStepHeader>
              </ChainOfThoughtStep>
            )}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtErrorStateSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <ErrorStateDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Auto-Scroll Demo - Content with jump-to-latest button
// ============================================================================

const STREAMING_LINES = [
  "Starting analysis of the problem...",
  "First, let me identify the key components.",
  "The main factors to consider are:",
  "1. Performance requirements",
  "2. Scalability concerns",
  "3. Maintainability goals",
  "4. User experience expectations",
  "Now analyzing each factor in detail...",
  "Performance: The system needs to handle 10k requests/second.",
  "This requires careful attention to caching strategies.",
  "We should implement a multi-tier cache with Redis and local memory.",
  "Scalability: Horizontal scaling is preferred over vertical.",
  "We'll use Kubernetes for orchestration.",
  "Load balancing will be handled by an Nginx ingress controller.",
  "Maintainability: Clean architecture principles should be followed.",
  "Dependency injection will help with testing.",
  "Clear separation of concerns is essential.",
  "User experience: Response times should be under 100ms for P95.",
  "We need to optimize the critical rendering path.",
  "Progressive loading will improve perceived performance.",
  "Conclusion: A microservices architecture is recommended.",
];

function AutoScrollDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (!isStreaming) return;

    setLines([]);
    let index = 0;

    const interval = setInterval(() => {
      if (index < STREAMING_LINES.length) {
        setLines((prev) => [...prev, STREAMING_LINES[index]!]);
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsStreaming(true)}
          disabled={isStreaming}
        >
          <PlayIcon className="mr-1.5 size-3" />
          {isStreaming ? "Streaming..." : "Start Streaming"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLines([])}
          disabled={isStreaming}
        >
          <RotateCcwIcon className="mr-1.5 size-3" />
          Reset
        </Button>
        <span className="text-muted-foreground text-xs">
          Scroll up while streaming to see &quot;Jump to latest&quot;
        </span>
      </div>

      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Auto-Scroll Demo" active={isStreaming} />
        <ChainOfThoughtContent aria-busy={isStreaming}>
          <ChainOfThoughtText autoScroll showCursor={isStreaming}>
            {lines.length > 0 ? (
              lines.map((line, i) => <p key={i}>{line}</p>)
            ) : (
              <span className="text-muted-foreground/50 italic">
                Click &quot;Start Streaming&quot; to begin
              </span>
            )}
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtAutoScrollSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <AutoScrollDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Streaming Cursor Demo - Shows blinking cursor during streaming
// ============================================================================

function StreamingCursorDemo() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState("");
  const fullText =
    "This text appears character by character with a blinking cursor at the end, creating a typewriter effect that feels more natural during streaming...";

  useEffect(() => {
    if (!isStreaming) return;

    setText("");
    let index = 0;

    const interval = setInterval(() => {
      if (index < fullText.length) {
        setText(fullText.slice(0, index + 1));
        index++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsStreaming(true)}
          disabled={isStreaming}
        >
          <PlayIcon className="mr-1.5 size-3" />
          {isStreaming ? "Streaming..." : "Start"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setText("")}
          disabled={isStreaming}
        >
          Reset
        </Button>
      </div>

      <ChainOfThoughtRoot variant="outline" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="With Cursor" active={isStreaming} />
        <ChainOfThoughtContent>
          <ChainOfThoughtText showCursor={isStreaming}>
            {text || (
              <span className="text-muted-foreground/50 italic">
                Click Start to see the cursor
              </span>
            )}
          </ChainOfThoughtText>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtStreamingCursorSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <StreamingCursorDemo />
    </SampleFrame>
  );
}

// ============================================================================
// Accessibility Announcer Demo
// ============================================================================

function AccessibilityDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const steps = ["Initializing", "Processing", "Validating", "Complete"];

  useEffect(() => {
    if (!isRunning) return;

    setCurrentStep(0);
    let step = 0;

    const interval = setInterval(() => {
      if (step < steps.length - 1) {
        step++;
        setCurrentStep(step);
        setAnnouncement(`Step ${step} complete: ${steps[step - 1]}`);
      } else {
        setIsRunning(false);
        setAnnouncement("All steps completed successfully");
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsRunning(true)}
          disabled={isRunning}
        >
          <PlayIcon className="mr-1.5 size-3" />
          {isRunning ? "Running..." : "Start"}
        </Button>
        <span className="text-muted-foreground text-xs">
          Screen readers will announce step completions
        </span>
      </div>

      <ChainOfThoughtRoot variant="muted" defaultOpen className="mb-0">
        <ChainOfThoughtTrigger label="Accessible Steps" active={isRunning} />
        <ChainOfThoughtContent>
          {/* Live region for announcements */}
          <ChainOfThoughtAnnouncer message={announcement} />

          <ChainOfThoughtTimeline>
            {steps.map((step, i) => (
              <ChainOfThoughtStep
                key={i}
                stepLabel={i + 1}
                active={currentStep === i && isRunning}
                status={
                  i < currentStep
                    ? "complete"
                    : i > currentStep
                      ? "pending"
                      : undefined
                }
              >
                <ChainOfThoughtStepHeader>{step}</ChainOfThoughtStepHeader>
              </ChainOfThoughtStep>
            ))}
          </ChainOfThoughtTimeline>
        </ChainOfThoughtContent>
      </ChainOfThoughtRoot>
    </div>
  );
}

export function ChainOfThoughtAccessibilitySample() {
  return (
    <SampleFrame className="h-auto p-4">
      <AccessibilityDemo />
    </SampleFrame>
  );
}

// =============================================================================
// Easing Comparison Sample
// =============================================================================

const EASING_OPTIONS = {
  // Opening (Spring) options
  springCurrent: {
    label: "Current Spring",
    spring: "cubic-bezier(0.62, -0.05, 0.71, 1.15)",
    easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  },
  springIOS: {
    label: "A) iOS Spring",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    easeOut: "cubic-bezier(0.33, 1, 0.68, 1)",
  },
  springGentle: {
    label: "B) Gentle Spring",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.1)",
    easeOut: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
  },
  noOvershoot: {
    label: "C) No Overshoot",
    spring: "cubic-bezier(0.22, 0.61, 0.36, 1)",
    easeOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  // Additional refined options
  appleMusic: {
    label: "Apple Music",
    spring: "cubic-bezier(0.42, 0, 0.58, 1)",
    easeOut: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
  snappy: {
    label: "Snappy",
    spring: "cubic-bezier(0.19, 1, 0.22, 1)",
    easeOut: "cubic-bezier(0.19, 1, 0.22, 1)",
  },
} as const;

function EasingComparisonDemo() {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Click each accordion to compare how different easing curves feel. Pay
        attention to both opening and closing animations.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(EASING_OPTIONS).map(([key, config]) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{config.label}</span>
              {key === "springCurrent" && (
                <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                  Current
                </span>
              )}
            </div>
            <ChainOfThoughtRoot
              variant="outline"
              style={
                {
                  "--spring-easing": config.spring,
                  "--ease-out-expo": config.easeOut,
                } as React.CSSProperties
              }
            >
              <ChainOfThoughtTrigger label="Reasoning" />
              <ChainOfThoughtContent>
                <ChainOfThoughtText>
                  This is sample content to demonstrate the easing curve. Toggle
                  open and closed multiple times to get a feel for the
                  animation. The opening uses the spring easing, while the
                  closing uses the ease-out curve.
                </ChainOfThoughtText>
              </ChainOfThoughtContent>
            </ChainOfThoughtRoot>
            <div className="font-mono text-muted-foreground text-xs">
              <div>Open: {config.spring.replace("cubic-bezier", "")}</div>
              <div>Close: {config.easeOut.replace("cubic-bezier", "")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChainOfThoughtEasingComparisonSample() {
  return (
    <SampleFrame className="h-auto p-4">
      <EasingComparisonDemo />
    </SampleFrame>
  );
}
