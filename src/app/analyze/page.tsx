"use client";

import { useState } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { FileTree } from "@/components/FileTree";
import { SuggestionsList } from "@/components/SuggestionsList";
import { GeneratedCode } from "@/components/GeneratedCode";
import { FolderOpen, Search, Loader2, AlertCircle } from "lucide-react";

export default function AnalyzePage() {
  const [folderPath, setFolderPath] = useState("");
  const { analysisResult, isAnalyzing, error, analyze, selectedFile } = useAnalysis();

  const handleAnalyze = () => {
    if (folderPath.trim()) {
      analyze(folderPath.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAnalyzing) {
      handleAnalyze();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header with input */}
      <div className="border-b border-gray-800 bg-gray-950 p-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus-within:border-blue-500 transition-colors">
              <FolderOpen className="w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Enter folder path (e.g., /projects/my-app/src)"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
                disabled={isAnalyzing}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!folderPath.trim() || isAnalyzing}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      {analysisResult ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - File tree and suggestions (60%) */}
          <div className="w-[60%] flex flex-col border-r border-gray-800">
            <div className="flex-1 flex overflow-hidden">
              {/* File tree */}
              <div className="w-1/3 border-r border-gray-800 overflow-auto">
                <div className="p-3 border-b border-gray-800 bg-gray-950">
                  <h3 className="text-sm font-medium text-gray-400">Files</h3>
                </div>
                <FileTree />
              </div>

              {/* Suggestions for selected file */}
              <div className="flex-1 overflow-auto">
                <div className="p-3 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400">
                    {selectedFile ? `Suggestions: ${selectedFile.split("/").pop()}` : "Suggestions"}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {analysisResult.suggestions.filter(s => !selectedFile || s.file === selectedFile).length} items
                  </span>
                </div>
                <SuggestionsList />
              </div>
            </div>
          </div>

          {/* Right panel - Generated code (40%) */}
          <div className="w-[40%] flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-800 bg-gray-950">
              <h3 className="text-sm font-medium text-gray-400">Generated Instrumentation</h3>
            </div>
            <GeneratedCode />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Analyze Your Codebase</h2>
            <p className="text-gray-400 mb-6">
              Enter a folder path above to scan your code and get AI-powered suggestions
              for instrumenting it with Monitor calls.
            </p>
            <div className="text-left bg-gray-900 rounded-lg p-4 text-sm">
              <p className="text-gray-400 mb-2">The analyzer will look for:</p>
              <ul className="space-y-1 text-gray-500">
                <li>• <span className="text-blue-400">Artifacts</span> - Data objects that flow through the system</li>
                <li>• <span className="text-purple-400">Operations</span> - Async functions that transform data</li>
                <li>• <span className="text-green-400">External Calls</span> - Third-party API calls</li>
                <li>• <span className="text-orange-400">User Actions</span> - Event handlers</li>
                <li>• <span className="text-yellow-400">State Changes</span> - State updates</li>
                <li>• <span className="text-red-400">Checks</span> - Assertions and validations</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
