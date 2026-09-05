"use client";

import { ToolErrorCard, ToolStatusCard, ToolTraceCard } from "@/lib/tool-trace";
import type {
  ToolCallMessagePart,
  ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderTreeIcon,
  InfoIcon,
  LayoutTemplateIcon,
  TerminalIcon,
  type LucideIcon,
  ArrowRight,
  CheckCircle2,
  Download,
  PartyPopper,
  Award,
  Sparkles,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { parseLearnCourseStepResult } from "@/lib/xulux/learn/tool-result";
import { useLearnMode } from "../learn/LearnModeContext";
import { analytics } from "@/lib/analytics";
import {
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";

function getToolIcon(toolName: string): ReactNode {
  const Icon = getToolIconComponent(toolName);
  return <Icon className="size-3.5" />;
}

function getToolIconComponent(toolName: string): LucideIcon {
  switch (toolName) {
    case "listDocs":
      return FolderTreeIcon;
    case "readDoc":
      return FileTextIcon;
    case "bash":
    case "inspectSourceMap":
      return TerminalIcon;
    case "readFile":
    case "readSourceMapFile":
      return FileCodeIcon;
    case "getTemplateList":
      return LayoutTemplateIcon;
    case "getTemplateDetails":
      return InfoIcon;
    case "openTemplatePreview":
      return ExternalLinkIcon;
    default:
      return BookOpenIcon;
  }
}

function getRunningMessage(toolName: string): string {
  switch (toolName) {
    case "listDocs":
      return "Listing docs...";
    case "readDoc":
      return "Reading page...";
    case "bash":
    case "inspectSourceMap":
      return "Running command...";
    case "readFile":
    case "readSourceMapFile":
      return "Reading file...";
    case "getTemplateList":
      return "Loading templates...";
    case "getTemplateDetails":
      return "Reading template...";
    case "openTemplatePreview":
      return "Opening preview...";
    default:
      return "Running...";
  }
}

function extractToolError(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  if (record.success === false) {
    if (typeof record.error === "string") return record.error;
    return "Tool failed";
  }
  if (typeof record.error === "string") return record.error;
  return null;
}

function summarizeXuluxResult(toolName: string, result: unknown): string {
  if (result === undefined || result === null) return "Done";

  const error = extractToolError(result);
  if (error) return error;

  if (typeof result !== "object") return String(result);

  const record = result as Record<string, unknown>;

  switch (toolName) {
    case "listDocs": {
      const children = record.children;
      if (Array.isArray(children)) {
        return `${children.length} item${children.length === 1 ? "" : "s"}`;
      }
      return "Listed";
    }
    case "readDoc":
      return typeof record.title === "string" ? record.title : "Read page";
    case "bash":
    case "inspectSourceMap": {
      const stdout = record.stdout;
      if (typeof stdout === "string" && stdout.trim()) {
        const line = stdout.trim().split("\n")[0] ?? "";
        return line.length > 48 ? `${line.slice(0, 45)}...` : line;
      }
      return "Completed";
    }
    case "readFile":
    case "readSourceMapFile": {
      const path = typeof record.path === "string" ? record.path : "";
      return path ? path.split("/").slice(-2).join("/") : "Read file";
    }
    case "getTemplateList": {
      const templates = record.templates;
      if (Array.isArray(templates)) {
        return `${templates.length} template${templates.length === 1 ? "" : "s"}`;
      }
      return "Templates loaded";
    }
    case "getTemplateDetails": {
      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.id === "string"
            ? record.id
            : "Template details";
      return name;
    }
    case "openTemplatePreview": {
      if (typeof record.title === "string") return record.title;
      const templateId =
        typeof record.templateId === "string" ? record.templateId : "";
      const versionId =
        typeof record.versionId === "string" ? record.versionId : "";
      if (templateId && versionId) return `${templateId} · ${versionId}`;
      return templateId || "Preview opened";
    }
    default:
      return "Completed";
  }
}

export function XuluxToolCall({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps): ReactNode {
  if (toolName === "getNextCourseStep") {
    return <LearnCourseToolCall result={result} status={status} args={args} />;
  }
  const signature = toolName;
  const icon = getToolIcon(toolName);
  const isRunning = status?.type === "running";
  const error = !isRunning ? extractToolError(result) : null;

  if (isRunning) {
    return (
      <ToolStatusCard
        icon={icon}
        signature={signature}
        message={getRunningMessage(toolName)}
        loading
      />
    );
  }

  if (error) {
    return <ToolErrorCard signature={signature} error={error} args={args} />;
  }

  return (
    <ToolTraceCard
      icon={icon}
      signature={signature}
      description={summarizeXuluxResult(toolName, result)}
      args={args}
      result={result}
    />
  );
}

function LearnCourseToolCall({
  result,
  status,
  args,
}: Pick<ToolCallMessagePartProps, "result" | "status" | "args">) {
  const aui = useAui();
  const { progress } = useLearnMode();
  const parsed = parseLearnCourseStepResult(result);
  if (status?.type === "running") {
    return (
      <ToolStatusCard
        icon={<BookOpenIcon className="size-3.5" />}
        signature="Course step"
        message="Loading the next lesson…"
        loading
      />
    );
  }
  if (!parsed) {
    return (
      <article className="border-destructive/40 bg-destructive/5 my-3 rounded-xl border p-4">
        <p className="text-sm font-medium">The course step could not load.</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Your saved progress is unchanged.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            aui.thread().append({
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    progress.currentStepId === null
                      ? "Start the Learn course."
                      : "Move to the next course step.",
                },
              ],
            })
          }
        >
          Retry
        </Button>
        <span className="sr-only">{JSON.stringify(args)}</span>
      </article>
    );
  }
  return (
    <ToolTraceCard
      icon={<BookOpenIcon className="size-3.5" />}
      signature="getNextCourseStep"
      description={
        "finalStage" in parsed
          ? "Course completed"
          : `Loaded step ${parsed.step.index}: ${parsed.step.title}`
      }
      args={args}
      result={result}
    />
  );
}

export function LearnCourseResultFooter() {
  const isComplete = useAuiState(
    (state) => state.message.status?.type === "complete",
  );
  const result = useAuiState((state) => {
    const content = state.message.content ?? [];
    for (let index = content.length - 1; index >= 0; index -= 1) {
      const part = content[index];
      if (part?.type === "tool-call" && part.toolName === "getNextCourseStep") {
        return (part as ToolCallMessagePart & { result?: unknown }).result;
      }
    }
    return undefined;
  });
  const parsed = parseLearnCourseStepResult(result);
  if (!isComplete || !parsed) return null;

  return "finalStage" in parsed ? (
    <LearnCompletionCard result={parsed} />
  ) : (
    <LearnStepCard result={parsed} />
  );
}

function LearnStepCard({
  result,
}: {
  result: Extract<
    NonNullable<ReturnType<typeof parseLearnCourseStepResult>>,
    { course: { status: "in_progress" } }
  >;
}) {
  const aui = useAui();
  const { course, openTab } = useLearnMode();
  const nextStep = course.steps[result.step.index];

  if (!nextStep) {
    return (
      <LearnCompletionCard
        result={{
          course: { id: result.course.id, status: "completed" },
          finalStage: {
            id: result.stage.id,
            previewPath: result.stage.previewPath,
            downloadUrl: result.stage.downloadUrl,
          },
        }}
      />
    );
  }

  return (
    <article className="bg-card my-3 overflow-hidden rounded-xl border shadow-sm">
      <div className="p-4">
        <p className="text-muted-foreground text-xs font-medium">
          Up next · Step {result.step.index + 1} of {result.step.total}
        </p>
        <h3 className="mt-1 font-semibold">{nextStep.title}</h3>
      </div>
      <div className="border-t p-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openTab("preview")}
          >
            Review current preview
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              aui.thread().append({
                role: "user",
                content: [
                  { type: "text", text: "Move to the next course step." },
                ],
              })
            }
          >
            Continue
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function LearnCompletionCard({
  result,
}: {
  result: Extract<
    NonNullable<ReturnType<typeof parseLearnCourseStepResult>>,
    { course: { status: "completed" } }
  >;
}) {
  const { course, progress, updateProgress, openTab } = useLearnMode();
  const analyticsCtx = useXuluxAnalytics();
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (progress.completionCelebrated) return;
    const timer = window.setTimeout(() => {
      setCelebrate(true);
      setCertificateOpen(!progress.certificatePromptDismissed);
      updateProgress({
        ...progress,
        completionCelebrated: true,
        updatedAt: Date.now(),
      });
      window.setTimeout(() => setCelebrate(false), 4200);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [progress, updateProgress]);

  return (
    <>
      {celebrate && <Confetti />}
      <article className="bg-card my-3 rounded-xl border p-5 shadow-sm">
        <CheckCircle2 className="size-7 text-green-600" />
        <h3 className="mt-3 text-lg font-semibold">Course complete</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          You built a streamed assistant with tools, generative UI, shared
          editable state, persisted conversations, and message branches. Your
          final preview and files remain available in the workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => openTab("preview")}
          >
            Final preview
          </Button>
          <a
            href={result.finalStage.downloadUrl}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium"
            onClick={() =>
              analytics.xulux.learnCourseDownloaded(
                withXuluxContext(analyticsCtx, {
                  course_id: result.course.id,
                  stage_id: result.finalStage.id,
                }),
              )
            }
          >
            <Download className="size-4" />
            Download project
          </a>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCertificateOpen(true)}
          >
            Certificate
          </Button>
        </div>
      </article>
      {certificateOpen && (
        <CertificateDialog
          courseId={result.course.id}
          courseTitle={course.title}
          {...(progress.certificateName
            ? { certificateName: progress.certificateName }
            : {})}
          {...(progress.certificateGeneratedAt
            ? { certificateGeneratedAt: progress.certificateGeneratedAt }
            : {})}
          onGenerated={(name, generatedAt) => {
            updateProgress({
              ...progress,
              certificateName: name,
              certificateGeneratedAt: generatedAt,
              certificatePromptDismissed: false,
              updatedAt: generatedAt,
            });
          }}
          onClose={(dismissed) => {
            setCertificateOpen(false);
            if (dismissed) {
              updateProgress({
                ...progress,
                certificatePromptDismissed: true,
                updatedAt: Date.now(),
              });
            }
          }}
        />
      )}
    </>
  );
}

function CertificateDialog({
  courseId,
  courseTitle,
  certificateName,
  certificateGeneratedAt,
  onGenerated,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  certificateName?: string;
  certificateGeneratedAt?: number;
  onGenerated: (name: string, generatedAt: number) => void;
  onClose: (dismissed: boolean) => void;
}) {
  const analyticsCtx = useXuluxAnalytics();
  const [name, setName] = useState(certificateName ?? "");
  const [generatedAt, setGeneratedAt] = useState(
    certificateGeneratedAt ?? null,
  );
  const generated = generatedAt !== null && name.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-title"
    >
      <div className="bg-background max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border p-4 shadow-2xl sm:p-6">
        {generated ? (
          <>
            <div
              className="relative overflow-hidden border-[6px] border-double border-amber-400 bg-[radial-gradient(circle_at_top,#fffbeb_0%,#ffffff_48%,#eff6ff_100%)] px-6 py-8 text-center text-slate-900 shadow-inner sm:px-12 sm:py-10"
              aria-label={`Course completion certificate for ${name}`}
            >
              <div className="absolute top-3 left-3 size-10 border-t-2 border-l-2 border-amber-500" />
              <div className="absolute top-3 right-3 size-10 border-t-2 border-r-2 border-amber-500" />
              <div className="absolute bottom-3 left-3 size-10 border-b-2 border-l-2 border-amber-500" />
              <div className="absolute right-3 bottom-3 size-10 border-r-2 border-b-2 border-amber-500" />
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blue-950 text-amber-300 shadow-lg ring-4 ring-amber-300/60">
                <Award className="size-8" />
              </div>
              <p className="mt-5 text-xs font-semibold tracking-[0.32em] text-blue-950 uppercase">
                Certificate of completion
              </p>
              <Image
                id="certificate-title"
                src="/brand/logotype.svg"
                alt="assistant-ui"
                width={150}
                height={25}
                className="mx-auto mt-4 h-8 w-auto sm:h-9"
              />
              <p className="mt-6 text-sm text-slate-600">
                This certificate is proudly presented to
              </p>
              <p className="mx-auto mt-3 max-w-lg border-b border-amber-500/70 pb-2 font-serif text-2xl font-semibold sm:text-3xl">
                {name}
              </p>
              <p className="mt-5 text-sm text-slate-600">
                for successfully completing
              </p>
              <p className="mt-2 text-lg font-semibold text-blue-950">
                {courseTitle}
              </p>
              <div className="mt-8 flex items-end justify-between gap-4 text-left text-[11px] text-slate-500">
                <div>
                  <p className="font-semibold text-slate-700">
                    {formatCertificateDate(generatedAt)}
                  </p>
                  <p>Date awarded</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-slate-700">
                    XLX-{generatedAt.toString(36).toUpperCase()}
                  </p>
                  <p>Certificate ID</p>
                </div>
              </div>
              <Sparkles className="absolute top-6 left-8 size-5 text-amber-500" />
              <Sparkles className="absolute right-8 bottom-7 size-4 text-blue-700" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Certificate saved to this course.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() =>
                    downloadCertificateImage({
                      courseId,
                      courseTitle,
                      name,
                      generatedAt,
                    })
                  }
                >
                  <Download className="size-4" />
                  Download image
                </Button>
                <Button onClick={() => onClose(false)}>Done</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <PartyPopper className="size-7" />
            <h2 id="certificate-title" className="mt-3 text-lg font-semibold">
              Generate your certificate
            </h2>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const awardedAt = Date.now();
                analytics.xulux.learnCertificateSubmitted(
                  withXuluxContext(analyticsCtx, {
                    course_id: courseId,
                  }),
                );
                setGeneratedAt(awardedAt);
                onGenerated(name.trim(), awardedAt);
              }}
            >
              <label className="block text-sm">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background mt-1 w-full rounded-md border px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onClose(true)}
                >
                  Not now
                </Button>
                <Button type="submit">Generate</Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Confetti() {
  const colors = [
    "#f43f5e",
    "#f59e0b",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-x-0 top-[42%] text-center">
        <span
          className="inline-block text-5xl opacity-0 sm:text-7xl"
          style={{
            animation: "party-pop .7s ease-out forwards",
          }}
        >
          🎉
        </span>
      </div>
      {Array.from({ length: 120 }, (_, index) => {
        const fromLeft = index % 2 === 0;
        const style = {
          "--confetti-x": `${fromLeft ? -12 : 112}vw`,
          "--confetti-drift": `${fromLeft ? 24 + ((index * 17) % 76) : -(24 + ((index * 17) % 76))}vw`,
          "--confetti-spin": `${540 + ((index * 71) % 1080)}deg`,
          left: `${(index * 47) % 100}%`,
          width: `${5 + (index % 4) * 2}px`,
          height: index % 5 === 0 ? "5px" : `${9 + (index % 5) * 2}px`,
          borderRadius:
            index % 5 === 0 ? "999px" : index % 3 === 0 ? "50%" : "2px",
          background: colors[index % colors.length],
          animationDelay: `${(index % 16) * 45}ms`,
          animationDuration: `${2.4 + (index % 8) * 0.18}s`,
          animationName: "party-confetti",
          animationTimingFunction: "cubic-bezier(.15,.8,.25,1)",
          animationFillMode: "forwards",
        } as CSSProperties & Record<`--${string}`, string>;
        return (
          <span
            key={index}
            className="absolute top-[-5vh] opacity-0"
            style={style}
          />
        );
      })}
      <style>{`
        @keyframes party-confetti {
          0% { transform: translate3d(var(--confetti-x), -8vh, 0) rotate(0deg); opacity: 1; }
          18% { opacity: 1; }
          100% { transform: translate3d(var(--confetti-drift), 112vh, 0) rotate(var(--confetti-spin)); opacity: .35; }
        }
        @keyframes party-pop {
          0% { transform: scale(.25) rotate(-12deg); opacity: 0; }
          55% { transform: scale(1.2) rotate(7deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function formatCertificateDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(timestamp);
}

function downloadCertificateImage({
  courseId,
  courseTitle,
  name,
  generatedAt,
}: {
  courseId: string;
  courseTitle: string;
  name: string;
  generatedAt: number;
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext("2d");
  if (!context) return;

  const background = context.createRadialGradient(800, 0, 0, 800, 0, 1200);
  background.addColorStop(0, "#fffbeb");
  background.addColorStop(0.52, "#ffffff");
  background.addColorStop(1, "#eff6ff");
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#f59e0b";
  context.lineWidth = 12;
  context.strokeRect(18, 18, 1564, 964);
  context.lineWidth = 3;
  context.strokeRect(38, 38, 1524, 924);

  context.fillStyle = "#172554";
  context.beginPath();
  context.arc(800, 155, 66, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#fcd34d";
  context.lineWidth = 10;
  context.stroke();
  context.fillStyle = "#fde68a";
  context.font = "700 32px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("AUI", 800, 157);

  context.textBaseline = "alphabetic";
  context.fillStyle = "#172554";
  context.font = "700 24px system-ui, sans-serif";
  context.fillText(
    "C E R T I F I C A T E   O F   C O M P L E T I O N",
    800,
    285,
  );
  context.font = "700 58px system-ui, sans-serif";
  context.fillText("assistant-ui", 800, 370);

  context.fillStyle = "#475569";
  context.font = "400 25px system-ui, sans-serif";
  context.fillText("This certificate is proudly presented to", 800, 455);

  context.fillStyle = "#0f172a";
  context.font = "600 55px Georgia, serif";
  context.fillText(name, 800, 535, 1200);
  context.strokeStyle = "#d97706";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(300, 565);
  context.lineTo(1300, 565);
  context.stroke();

  context.fillStyle = "#475569";
  context.font = "400 25px system-ui, sans-serif";
  context.fillText("for successfully completing", 800, 635);
  context.fillStyle = "#172554";
  context.font = "700 36px system-ui, sans-serif";
  context.fillText(courseTitle, 800, 700, 1300);

  context.textAlign = "left";
  context.fillStyle = "#334155";
  context.font = "600 21px system-ui, sans-serif";
  context.fillText(formatCertificateDate(generatedAt), 120, 875);
  context.fillStyle = "#64748b";
  context.font = "400 18px system-ui, sans-serif";
  context.fillText("Date awarded", 120, 905);

  context.textAlign = "right";
  context.fillStyle = "#334155";
  context.font = "600 21px ui-monospace, monospace";
  context.fillText(`XLX-${generatedAt.toString(36).toUpperCase()}`, 1480, 875);
  context.fillStyle = "#64748b";
  context.font = "400 18px system-ui, sans-serif";
  context.fillText("Certificate ID", 1480, 905);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `assistant-ui-${courseId}-certificate.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, "image/png");
}
