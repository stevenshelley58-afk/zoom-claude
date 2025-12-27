"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type SuggestionType =
  | "artifact"
  | "operation"
  | "external_call"
  | "user_action"
  | "state_change"
  | "check";

export interface Suggestion {
  file: string;
  line: number;
  type: SuggestionType;
  pattern: string;
  suggestion: string;
  codeSnippet?: string;
  artifactType?: string;
  checkCondition?: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  suggestionCount?: number;
}

export interface AnalysisResult {
  folderPath: string;
  fileTree: FileNode;
  suggestions: Suggestion[];
  analyzedAt: Date;
}

interface AnalysisContextType {
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  selectedFile: string | null;
  analyze: (folderPath: string) => Promise<void>;
  setSelectedFile: (path: string | null) => void;
  clearAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const analyze = useCallback(async (folderPath: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderPath }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      setAnalysisResult({
        folderPath,
        fileTree: data.fileTree,
        suggestions: data.suggestions,
        analyzedAt: new Date(),
      });

      // Auto-select first file with suggestions
      if (data.suggestions.length > 0) {
        setSelectedFile(data.suggestions[0].file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setSelectedFile(null);
    setError(null);
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        analysisResult,
        isAnalyzing,
        error,
        selectedFile,
        analyze,
        setSelectedFile,
        clearAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
