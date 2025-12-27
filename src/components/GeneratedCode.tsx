"use client";

import { useState, useMemo } from "react";
import { useAnalysis } from "@/context/AnalysisContext";
import { Copy, Check, Download, FileCode, Settings } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type ViewMode = "wrapper" | "checks" | "full";

export function GeneratedCode() {
  const { analysisResult, selectedFile } = useAnalysis();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("wrapper");

  const suggestions = useMemo(() => {
    if (!analysisResult) return [];
    return selectedFile
      ? analysisResult.suggestions.filter((s) => s.file === selectedFile)
      : analysisResult.suggestions;
  }, [analysisResult, selectedFile]);

  const generatedCode = useMemo(() => {
    if (suggestions.length === 0) return "";

    if (viewMode === "checks") {
      // Generate check registrations
      const checks = suggestions.filter((s) => s.type === "check");
      if (checks.length === 0) {
        return "// No checks found in the selected scope";
      }

      const registrations = checks.map((check, i) => {
        const checkId = check.pattern
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .substring(0, 30);

        return `Monitor.registerCheck({
  checkId: '${checkId}_${i + 1}',
  name: '${check.pattern.substring(0, 50)}',
  trigger: { type: 'manual' },
  condition: { type: 'custom' },
  severity: 'warning',
  messageTemplate: '${check.checkCondition || check.pattern}'
});`;
      });

      return `// Add these check registrations to your app initialization
import { Monitor } from './monitor';

${registrations.join("\n\n")}`;
    }

    if (viewMode === "wrapper") {
      // Generate a wrapper module with all instrumented functions
      const imports = `import { Monitor } from './monitor';`;

      const wrappers = suggestions
        .filter((s) => s.type === "operation" || s.type === "external_call")
        .map((s) => s.suggestion)
        .join("\n\n");

      const artifacts = suggestions
        .filter((s) => s.type === "artifact")
        .map((s) => `// Artifact: ${s.pattern}\n${s.suggestion}`)
        .join("\n\n");

      const checks = suggestions
        .filter((s) => s.type === "check")
        .map((s) => `// Check: ${s.pattern}\n${s.suggestion}`)
        .join("\n\n");

      const actions = suggestions
        .filter((s) => s.type === "user_action" || s.type === "state_change")
        .map((s) => `// ${s.type === "user_action" ? "User Action" : "State Change"}: ${s.pattern}\n${s.suggestion}`)
        .join("\n\n");

      return `${imports}

// ==========================================
// Generated Instrumentation Code
// ==========================================

${wrappers ? `// Operations & External Calls\n${wrappers}` : ""}

${artifacts ? `\n// Artifacts\n${artifacts}` : ""}

${checks ? `\n// Checks\n${checks}` : ""}

${actions ? `\n// User Actions & State Changes\n${actions}` : ""}
`.trim();
    }

    // Full mode - all suggestions as comments
    return suggestions
      .map(
        (s) => `// File: ${s.file}:${s.line}
// Type: ${s.type}
// Pattern: ${s.pattern}
${s.suggestion}`
      )
      .join("\n\n// ---\n\n");
  }, [suggestions, viewMode]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "instrumentation.ts";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!analysisResult) {
    return null;
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a file to see generated code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-2 border-b border-gray-800 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setViewMode("wrapper")}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === "wrapper"
                ? "bg-blue-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Wrapper
          </button>
          <button
            onClick={() => setViewMode("checks")}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === "checks"
                ? "bg-blue-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Checks
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === "full"
                ? "bg-blue-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Full
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy All</span>
            </>
          )}
        </button>

        <button
          onClick={downloadCode}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download</span>
        </button>
      </div>

      {/* Code display */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language="typescript"
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "16px",
            background: "#0a0a0a",
            fontSize: "12px",
            minHeight: "100%",
          }}
          showLineNumbers
          lineNumberStyle={{ color: "#4a4a4a", paddingRight: "1em" }}
        >
          {generatedCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
