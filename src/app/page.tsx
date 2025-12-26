"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRecording } from "@/lib/recording-store";
import { Recording } from "@/types/recording";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  const router = useRouter();
  const { setRecording } = useRecording();
  const [isDragging, setIsDragging] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validateAndLoadRecording = useCallback(
    (data: unknown): boolean => {
      try {
        const recording = data as Recording;

        // Basic validation
        if (!recording.recordingId || !recording.events || !recording.artifacts) {
          setError("Invalid recording format: missing required fields");
          return false;
        }

        if (!Array.isArray(recording.events)) {
          setError("Invalid recording format: events must be an array");
          return false;
        }

        setRecording(recording);
        router.push("/explore");
        return true;
      } catch (e) {
        setError(`Failed to validate recording: ${e instanceof Error ? e.message : "Unknown error"}`);
        return false;
      }
    },
    [router, setRecording]
  );

  const handleFileRead = useCallback(
    (content: string) => {
      try {
        setError(null);
        const data = JSON.parse(content);
        validateAndLoadRecording(data);
      } catch (e) {
        setError(`Failed to parse JSON: ${e instanceof Error ? e.message : "Invalid JSON"}`);
      }
    },
    [validateAndLoadRecording]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!file.name.endsWith(".json")) {
        setError("Please drop a JSON file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        handleFileRead(content);
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsText(file);
    },
    [handleFileRead]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePasteSubmit = useCallback(() => {
    if (!jsonText.trim()) {
      setError("Please enter JSON data");
      return;
    }
    handleFileRead(jsonText);
  }, [jsonText, handleFileRead]);

  const handleLoadSample = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/sample-recording.json");
      const data = await response.json();
      validateAndLoadRecording(data);
    } catch (e) {
      setError(`Failed to load sample: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  }, [validateAndLoadRecording]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full space-y-8">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold tracking-tight">
            <span className="text-primary">Zoom</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            World Model Recording Explorer
          </p>
        </div>

        {/* Drop Zone */}
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              Drop recording JSON here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse files
            </p>
          </CardContent>
        </Card>

        {/* JSON Paste Area */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">
            or paste JSON directly
          </p>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setError(null);
            }}
            placeholder='{"recordingId": "...", "events": [...], ...}'
            className="w-full h-32 px-4 py-3 bg-card border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          />
          <div className="flex gap-3">
            <Button
              onClick={handlePasteSubmit}
              className="flex-1"
              disabled={!jsonText.trim()}
            >
              Load Recording
            </Button>
            <Button
              onClick={handleLoadSample}
              variant="outline"
              className="flex-1"
            >
              Load Sample
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            Zoom helps you debug World Model recordings by visualizing events,
            artifacts, and check results.
          </p>
        </div>
      </div>
    </div>
  );
}
