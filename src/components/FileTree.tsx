"use client";

import { useState } from "react";
import { useAnalysis, FileNode } from "@/context/AnalysisContext";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
}

function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const { selectedFile, setSelectedFile, analysisResult } = useAnalysis();

  const isSelected = selectedFile === node.path;
  const hasSuggestions = (node.suggestionCount ?? 0) > 0;

  const suggestionCount = analysisResult?.suggestions.filter(
    s => s.file === node.path || s.file.startsWith(node.path + "/")
  ).length ?? 0;

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center gap-1 py-1.5 px-2 hover:bg-gray-800 text-left text-sm transition-colors ${
            suggestionCount > 0 ? "text-white" : "text-gray-400"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-500" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          )}
          <span className="truncate">{node.name}</span>
          {suggestionCount > 0 && (
            <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
              {suggestionCount}
            </span>
          )}
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setSelectedFile(node.path)}
      className={`w-full flex items-center gap-1 py-1.5 px-2 text-left text-sm transition-colors ${
        isSelected
          ? "bg-blue-500/20 text-blue-400"
          : hasSuggestions
          ? "text-blue-400 hover:bg-gray-800"
          : "text-gray-400 hover:bg-gray-800"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <span className="w-4" /> {/* Spacer for alignment */}
      <File className={`w-4 h-4 flex-shrink-0 ${hasSuggestions ? "text-blue-400" : "text-gray-500"}`} />
      <span className="truncate">{node.name}</span>
      {hasSuggestions && (
        <span className="ml-auto text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
          {node.suggestionCount}
        </span>
      )}
    </button>
  );
}

export function FileTree() {
  const { analysisResult } = useAnalysis();

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="py-2">
      <FileTreeNode node={analysisResult.fileTree} depth={0} />
    </div>
  );
}
