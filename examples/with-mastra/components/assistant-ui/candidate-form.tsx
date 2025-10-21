"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CandidateFormProps {
  onSubmit: (candidateData: {
    candidateName: string;
    candidateEmail: string;
    resume: string;
    position: string;
  }) => void;
  isLoading?: boolean;
}

export function CandidateForm({ onSubmit, isLoading = false }: CandidateFormProps) {
  const [formData, setFormData] = useState({
    candidateName: "Sarah Chen",
    candidateEmail: "sarah.chen@email.com",
    resume: "Senior Full-Stack Engineer with 6+ years of experience building scalable web applications. Expert in React, Node.js, and TypeScript. Led teams of 5+ engineers at previous companies. Strong background in system design and cloud architecture (AWS, GCP). Open source contributor with 2000+ GitHub stars across projects. BS in Computer Science from Stanford University.",
    position: "Senior Software Engineer",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const inputClass = "w-full px-3 py-2 border border-border rounded-md bg-background text-foreground disabled:opacity-50";
  const labelClass = "block text-sm font-medium mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="candidateName" className={labelClass}>Candidate Name</label>
        <input
          id="candidateName"
          type="text"
          className={inputClass}
          placeholder="Sarah Chen"
          value={formData.candidateName}
          onChange={handleChange("candidateName")}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="candidateEmail" className={labelClass}>Email</label>
        <input
          id="candidateEmail"
          type="email"
          className={inputClass}
          placeholder="sarah.chen@email.com"
          value={formData.candidateEmail}
          onChange={handleChange("candidateEmail")}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="position" className={labelClass}>Position</label>
        <input
          id="position"
          type="text"
          className={inputClass}
          placeholder="Senior Software Engineer"
          value={formData.position}
          onChange={handleChange("position")}
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="resume" className={labelClass}>Resume / Background</label>
        <textarea
          id="resume"
          className={`${inputClass} text-sm`}
          placeholder="Senior Full-Stack Engineer with 6+ years experience..."
          value={formData.resume}
          onChange={handleChange("resume")}
          required
          disabled={isLoading}
          rows={4}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Starting..." : "Start Workflow"}
      </Button>
    </form>
  );
}
