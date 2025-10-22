"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface WorkflowStatusProps {
  status: "idle" | "running" | "suspended" | "completed" | "error";
  currentStep?: string;
  suspendData?: any;
  onResume?: (resumeData: any) => void;
  isResuming?: boolean;
}

export function WorkflowStatus({
  status,
  currentStep,
  suspendData,
  onResume,
  isResuming = false,
}: WorkflowStatusProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const steps = [
    {
      id: "screening-step",
      name: "Screening",
      description: "Initial candidate evaluation",
    },
    {
      id: "interview-step",
      name: "Interview",
      description: "Technical and behavioral assessment",
    },
  ];

  const openModal = (title: string, content: string) => {
    setModalContent({ title, content });
    setShowModal(true);
  };

  const getStepStatus = (stepId: string) => {
    if (status === "completed") return "completed";
    if (status === "error") return "error";
    if (currentStep === stepId) {
      if (status === "suspended") return "suspended";
      if (status === "running") return "running";
      if (status === "error") return "error";
    }
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex < currentIndex) return "completed";
    return "pending";
  };

  const handleApprove = () => {
    if (currentStep === "screening-step") {
      onResume?.({ approved: true, approverNotes: "Approved for interview" });
    } else if (currentStep === "interview-step") {
      onResume?.({ hiringDecision: "hire", decisionNotes: "Strong candidate" });
    }
  };

  const handleReject = () => {
    if (currentStep === "screening-step") {
      onResume?.({ approved: false, approverNotes: "Not a good fit" });
    } else if (currentStep === "interview-step") {
      onResume?.({
        hiringDecision: "reject",
        decisionNotes: "Not meeting requirements",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        {steps.map((step) => {
          const stepStatus = getStepStatus(step.id);
          return (
            <div key={step.id} className="flex items-start gap-3">
              <div className="mt-0.5">
                {stepStatus === "completed" && (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                {stepStatus === "running" && (
                  <Clock className="h-5 w-5 animate-pulse text-blue-600" />
                )}
                {stepStatus === "suspended" && (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
                {stepStatus === "pending" && (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{step.name}</div>
                <div className="text-muted-foreground text-xs">
                  {step.description}
                </div>
                {stepStatus === "suspended" && suspendData && (
                  <div className="mt-2 space-y-1.5 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
                    {suspendData.candidateName && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Candidate:</span>{" "}
                        {suspendData.candidateName}
                      </div>
                    )}
                    {suspendData.screeningScore != null && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Score:</span>{" "}
                        {suspendData.screeningScore}/10
                      </div>
                    )}
                    {suspendData.recommendation && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Recommendation:</span>{" "}
                        {suspendData.recommendation.replace(/_/g, " ")}
                      </div>
                    )}
                    {suspendData.technicalScore != null && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Technical:</span>{" "}
                        {suspendData.technicalScore}/10
                      </div>
                    )}
                    {suspendData.culturalScore != null && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Cultural:</span>{" "}
                        {suspendData.culturalScore}/10
                      </div>
                    )}
                    {(suspendData.evaluationSummary ||
                      suspendData.interviewSummary) && (
                      <button
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-yellow-300 bg-yellow-100 px-2 py-1.5 text-xs font-medium text-yellow-900 transition-colors hover:bg-yellow-200 dark:border-yellow-700 dark:bg-yellow-900 dark:text-yellow-100 dark:hover:bg-yellow-800"
                        onClick={() =>
                          openModal(
                            suspendData.evaluationSummary
                              ? "AI Screening Evaluation"
                              : "AI Interview Assessment",
                            suspendData.evaluationSummary ||
                              suspendData.interviewSummary,
                          )
                        }
                      >
                        <FileText className="h-3 w-3" />
                        <span>View Details</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {status === "suspended" && onResume && (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={isResuming}
            className="flex-1"
            variant="default"
          >
            {isResuming ? "Processing..." : "Approve"}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isResuming}
            className="flex-1"
            variant="destructive"
          >
            Reject
          </Button>
        </div>
      )}

      {status === "completed" && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
          ✓ Workflow completed successfully
        </div>
      )}

      {status === "error" && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          ✗ Workflow encountered an error
        </div>
      )}

      {/* Modal */}
      {showModal && modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {modalContent.title}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="prose prose-base dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-li:text-gray-700 dark:prose-li:text-gray-300 max-w-none">
                <ReactMarkdown>{modalContent.content}</ReactMarkdown>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
