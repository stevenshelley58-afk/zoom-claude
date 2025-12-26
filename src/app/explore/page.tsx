"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRecording } from "@/lib/recording-store";
import { TimelinePanel } from "@/components/explore/timeline-panel";
import { DetailPanel } from "@/components/explore/detail-panel";
import { InspectorPanel } from "@/components/explore/inspector-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ExplorePage() {
  const router = useRouter();
  const { recording, setRecording, setSelection } = useRecording();

  // Redirect to home if no recording is loaded
  useEffect(() => {
    if (!recording) {
      router.push("/");
    }
  }, [recording, router]);

  if (!recording) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const handleClear = () => {
    setRecording(null);
    setSelection(null);
    router.push("/");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-primary">Zoom</h1>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium">
              {recording.recordingId}
            </span>
            {recording.metadata.hasFailure && (
              <Badge variant="destructive" className="text-xs">
                Failed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(recording.createdAt).toLocaleString()}
          </span>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </header>

      {/* Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Timeline */}
        <div className="w-[280px] border-r border-border flex-shrink-0 overflow-hidden">
          <TimelinePanel />
        </div>

        {/* Center Panel - Detail View */}
        <div className="flex-1 overflow-hidden border-r border-border">
          <DetailPanel />
        </div>

        {/* Right Panel - Inspector */}
        <div className="w-[320px] flex-shrink-0 overflow-hidden">
          <InspectorPanel />
        </div>
      </div>

      {/* Footer with failure reason if present */}
      {recording.metadata.hasFailure && recording.metadata.failureReason && (
        <footer className="h-10 border-t border-red-500/30 bg-red-500/5 flex items-center px-4 flex-shrink-0">
          <span className="text-xs text-red-400">
            <strong>Failure:</strong> {recording.metadata.failureReason}
          </span>
        </footer>
      )}
    </div>
  );
}
