"use client";

import { useAnalysis } from "@/context/AnalysisContext";
import { SuggestionCard } from "./SuggestionCard";

export function SuggestionsList() {
  const { analysisResult, selectedFile } = useAnalysis();

  if (!analysisResult) {
    return null;
  }

  const filteredSuggestions = selectedFile
    ? analysisResult.suggestions.filter((s) => s.file === selectedFile)
    : analysisResult.suggestions;

  if (filteredSuggestions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        {selectedFile
          ? "No suggestions for this file"
          : "No suggestions found in the codebase"}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {filteredSuggestions.map((suggestion, index) => (
        <SuggestionCard key={`${suggestion.file}-${suggestion.line}-${index}`} suggestion={suggestion} />
      ))}
    </div>
  );
}
