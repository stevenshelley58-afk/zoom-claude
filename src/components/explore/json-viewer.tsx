"use client";

import { useCallback } from "react";

interface JsonViewerProps {
  data: unknown;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const renderValue = useCallback((value: unknown, depth: number = 0): React.ReactNode => {
    const indent = "  ".repeat(depth);
    const nextIndent = "  ".repeat(depth + 1);

    if (value === null) {
      return <span className="json-null">null</span>;
    }

    if (typeof value === "boolean") {
      return <span className="json-boolean">{value.toString()}</span>;
    }

    if (typeof value === "number") {
      return <span className="json-number">{value}</span>;
    }

    if (typeof value === "string") {
      // Truncate very long strings
      const displayValue = value.length > 100 ? value.slice(0, 100) + "..." : value;
      return <span className="json-string">&quot;{displayValue}&quot;</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-foreground">[]</span>;
      }

      return (
        <span className="text-foreground">
          {"[\n"}
          {value.map((item, index) => (
            <span key={index}>
              {nextIndent}
              {renderValue(item, depth + 1)}
              {index < value.length - 1 ? ",\n" : "\n"}
            </span>
          ))}
          {indent}]
        </span>
      );
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return <span className="text-foreground">{"{}"}</span>;
      }

      return (
        <span className="text-foreground">
          {"{\n"}
          {entries.map(([key, val], index) => (
            <span key={key}>
              {nextIndent}
              <span className="json-key">&quot;{key}&quot;</span>
              <span className="text-foreground">: </span>
              {renderValue(val, depth + 1)}
              {index < entries.length - 1 ? ",\n" : "\n"}
            </span>
          ))}
          {indent}
          {"}"}
        </span>
      );
    }

    return <span className="text-foreground">{String(value)}</span>;
  }, []);

  return (
    <pre className={`font-mono text-sm whitespace-pre-wrap break-words ${className || ""}`}>
      {renderValue(data)}
    </pre>
  );
}
