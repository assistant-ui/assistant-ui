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
  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  const steps = [
    { id: "screening-step", name: "Screening", description: "Initial candidate evaluation" },
    { id: "interview-step", name: "Interview", description: "Technical and behavioral assessment" },
  ];

  const openModal = (title: string, content: string) => {
    setModalContent({ title, content });
    setShowModal(true);
  };

  const getStepStatus = (stepId: string) => {
    if (status === "completed") return "completed";
    if (currentStep === stepId) {
      if (status === "suspended") return "suspended";
      if (status === "running") return "running";
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
      onResume?.({ hiringDecision: "reject", decisionNotes: "Not meeting requirements" });
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
                  <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                )}
                {stepStatus === "suspended" && (
                  <Clock className="h-5 w-5 text-yellow-600" />
                )}
                {stepStatus === "pending" && (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{step.name}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
                {stepStatus === "suspended" && suspendData && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md space-y-1.5">
                    {suspendData.candidateName && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Candidate:</span> {suspendData.candidateName}
                      </div>
                    )}
                    {suspendData.screeningScore && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Score:</span> {suspendData.screeningScore}/10
                      </div>
                    )}
                    {suspendData.recommendation && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Recommendation:</span> {suspendData.recommendation.replace(/_/g, ' ')}
                      </div>
                    )}
                    {suspendData.technicalScore && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Technical:</span> {suspendData.technicalScore}/10
                      </div>
                    )}
                    {suspendData.culturalScore && (
                      <div className="text-xs text-yellow-900 dark:text-yellow-100">
                        <span className="font-semibold">Cultural:</span> {suspendData.culturalScore}/10
                      </div>
                    )}
                    {(suspendData.evaluationSummary || suspendData.interviewSummary) && (
                      <button
                        className="w-full mt-2 px-2 py-1.5 text-xs font-medium bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-900 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700 rounded flex items-center justify-center gap-1 transition-colors"
                        onClick={() => openModal(
                          suspendData.evaluationSummary ? "AI Screening Evaluation" : "AI Interview Assessment",
                          suspendData.evaluationSummary || suspendData.interviewSummary
                        )}
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
        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm text-green-900 dark:text-green-100">
          ✓ Workflow completed successfully
        </div>
      )}

      {status === "error" && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-900 dark:text-red-100">
          ✗ Workflow encountered an error
        </div>
      )}

      {/* Modal */}
      {showModal && modalContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{modalContent.title}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-6 overflow-y-auto flex-1">
              <div className="prose prose-base dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-li:text-gray-700 dark:prose-li:text-gray-300">
                <ReactMarkdown>{modalContent.content}</ReactMarkdown>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
