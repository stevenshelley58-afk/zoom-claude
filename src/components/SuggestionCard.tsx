"use client";

import { useState } from "react";
import { Suggestion, SuggestionType } from "@/context/AnalysisContext";
import { Copy, Check, FileCode, ChevronDown, ChevronUp } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const typeConfig: Record<SuggestionType, { label: string; color: string; bg: string }> = {
  artifact: { label: "Artifact", color: "text-blue-400", bg: "bg-blue-500/10" },
  operation: { label: "Operation", color: "text-purple-400", bg: "bg-purple-500/10" },
  external_call: { label: "External Call", color: "text-green-400", bg: "bg-green-500/10" },
  user_action: { label: "User Action", color: "text-orange-400", bg: "bg-orange-500/10" },
  state_change: { label: "State Change", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  check: { label: "Check", color: "text-red-400", bg: "bg-red-500/10" },
};

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const config = typeConfig[suggestion.type];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(suggestion.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const fileName = suggestion.file.split("/").pop();

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="p-3 flex items-center gap-3 border-b border-gray-800">
        <span className={`px-2 py-1 rounded text-xs font-medium ${config.color} ${config.bg}`}>
          {config.label}
        </span>
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <FileCode className="w-4 h-4" />
          <span>{fileName}</span>
          <span className="text-gray-600">:</span>
          <span className="text-blue-400">{suggestion.line}</span>
        </div>
        {suggestion.artifactType && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
            {suggestion.artifactType}
          </span>
        )}
      </div>

      {/* Pattern description */}
      <div className="p-3 border-b border-gray-800">
        <p className="text-sm text-gray-300">{suggestion.pattern}</p>
      </div>

      {/* Original code snippet (if available) */}
      {suggestion.codeSnippet && (
        <div className="border-b border-gray-800">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full p-2 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-400 hover:bg-gray-800/50 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>Original code</span>
          </button>
          {expanded && (
            <div className="text-xs">
              <SyntaxHighlighter
                language="typescript"
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "12px",
                  background: "#1a1a1a",
                  fontSize: "12px",
                }}
              >
                {suggestion.codeSnippet}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}

      {/* Generated instrumentation code */}
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={copyToClipboard}
            className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
        <div className="text-xs">
          <SyntaxHighlighter
            language="typescript"
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: "12px",
              paddingRight: "40px",
              background: "#0d0d0d",
              fontSize: "12px",
            }}
          >
            {suggestion.suggestion}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}
