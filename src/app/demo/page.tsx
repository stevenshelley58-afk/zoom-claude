"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Monitor, WorldModelEvent, worldModel } from "@/lib/world-model/core";
import { convertRecordingForViewer } from "@/lib/world-model/convert";
import { useRecording } from "@/lib/recording-store";
import { cn } from "@/lib/utils";

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LogEntry {
  id: string;
  event: WorldModelEvent;
  timestamp: number;
}

function EventLogItem({ entry }: { entry: LogEntry }) {
  const { event } = entry;
  const isFailed = event.type === "check_failed";
  const isArtifact = event.type === "artifact_created";
  const isSuccess = event.type === "check_passed" || event.type === "flow_completed";
  const isExternal = event.type.startsWith("external_call");

  return (
    <div
      className={cn(
        "px-3 py-2 border-l-2 text-sm",
        isFailed && "bg-red-500/10 border-l-red-500",
        isArtifact && "bg-purple-500/10 border-l-purple-500",
        isSuccess && "bg-green-500/10 border-l-green-500",
        isExternal && "bg-yellow-500/10 border-l-yellow-500",
        !isFailed && !isArtifact && !isSuccess && !isExternal && "border-l-border"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Badge
          variant={isFailed ? "destructive" : "secondary"}
          className="text-[10px] px-1.5 py-0"
        >
          {event.type}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(event.timestamp).toLocaleTimeString()}.{String(event.timestamp % 1000).padStart(3, "0")}
        </span>
      </div>
      <p className={cn("font-medium", isFailed && "text-red-400")}>
        {event.name}
      </p>
      {event.artifactRefs.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {event.artifactRefs.map((ref, i) => (
            <span key={i} className="text-xs text-primary font-mono">
              {ref.role}: {ref.artifactId.slice(0, 12)}...
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();
  const { setRecording } = useRecording();
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [recordingJson, setRecordingJson] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = worldModel.subscribe((event) => {
      setEvents((prev) => [
        ...prev,
        { id: event.eventId, event, timestamp: event.timestamp },
      ]);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Run the simulation
  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setEvents([]);
    Monitor.reset();

    try {
      // 1. Start flow
      Monitor.startFlow("ObjectRemoval");
      await delay(500);

      // 2. Register check for MaskHasContent
      Monitor.registerCheck({
        checkId: "chk_mask_content",
        name: "MaskHasContent",
        trigger: { type: "artifact_created", artifactType: "MaskImage" },
        condition: {
          type: "property",
          artifactProperty: "whitePixelCount",
          operator: ">",
          value: 0,
        },
        severity: "error",
        messageTemplate: "Mask is empty - whitePixelCount is ${whitePixelCount}",
      });
      await delay(300);

      // 3. Enter Upload step
      Monitor.enterStep("Upload");
      await delay(500);

      // 4. Create RoomPhoto artifact
      const roomPhoto = Monitor.createArtifact("RoomPhoto", {
        name: "RoomPhoto",
        width: 1920,
        height: 1080,
        format: "jpg",
        sizeBytes: 2458624,
      });
      await delay(500);

      // 5. Enter Normalize step
      Monitor.enterStep("Normalize");
      await delay(500);

      // 6. Create NormalizedPhoto artifact
      const normalizedPhoto = Monitor.createArtifact(
        "NormalizedPhoto",
        {
          name: "NormalizedPhoto",
          width: 1024,
          height: 576,
          normalized: true,
        },
        { derivedFrom: [roomPhoto.artifactId] }
      );
      await delay(500);

      // 7. Enter Paint step
      Monitor.enterStep("Paint");
      await delay(500);

      // 8. User action - painting stroke (but with 0 points to simulate the bug)
      Monitor.userAction("stroke", { points: 0, duration: 0 });
      await delay(500);

      // 9. Enter CaptureMask step
      Monitor.enterStep("CaptureMask");
      await delay(500);

      // 10. Create MaskImage artifact (with 0 pixels - triggers check failure)
      const maskImage = Monitor.createArtifact(
        "MaskImage",
        {
          name: "MaskImage",
          width: 1024,
          height: 576,
          whitePixelCount: 0,
          coverage: 0,
          totalPixels: 589824,
        },
        { derivedFrom: [normalizedPhoto.artifactId] }
      );
      await delay(500);

      // 11. Enter CallAI step
      Monitor.enterStep("CallAI");
      await delay(500);

      // 12. External call to Gemini
      await Monitor.externalCall(
        "Gemini",
        "inpaint",
        [normalizedPhoto.artifactId, maskImage.artifactId],
        async () => {
          await delay(2000);
          return { success: true };
        }
      );
      await delay(500);

      // 13. Create InpaintResult artifact
      const inpaintResult = Monitor.createArtifact(
        "InpaintResult",
        {
          name: "InpaintResult",
          width: 1024,
          height: 576,
          diffFromInput: 0.001,
          changedPixels: 590,
        },
        { derivedFrom: [normalizedPhoto.artifactId, maskImage.artifactId] }
      );
      await delay(500);

      // 14. Display the result
      Monitor.displayArtifact(inpaintResult.artifactId, "resultCanvas");
      await delay(500);

      // 15. Complete flow with failure
      Monitor.completeFlow("failure");

      // Update recording JSON preview
      const recording = Monitor.getRecording();
      setRecordingJson(JSON.stringify(recording, null, 2));
    } catch (error) {
      console.error("Simulation error:", error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Reset everything
  const handleReset = useCallback(() => {
    Monitor.reset();
    setEvents([]);
    setRecordingJson("");
  }, []);

  // Export recording as JSON file
  const handleExport = useCallback(() => {
    const recording = Monitor.getRecording();
    const blob = new Blob([JSON.stringify(recording, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording-${recording.recordingId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Open in explorer
  const handleOpenInExplorer = useCallback(() => {
    const sdkRecording = Monitor.getRecording();
    const viewerRecording = convertRecordingForViewer(sdkRecording);
    setRecording(viewerRecording);
    router.push("/explore");
  }, [router, setRecording]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-primary">Zoom</h1>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-foreground">Live Demo</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Panel - Controls + Event Log */}
        <div className="w-1/2 border-r border-border flex flex-col">
          {/* Controls */}
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={runSimulation}
                disabled={isRunning}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  "Run Object Removal Flow"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isRunning}
              >
                Reset
              </Button>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={events.length === 0}
                className="flex-1"
              >
                Export Recording
              </Button>
              <Button
                variant="secondary"
                onClick={handleOpenInExplorer}
                disabled={events.length === 0}
                className="flex-1"
              >
                Open in Explorer
              </Button>
            </div>
          </div>

          {/* Event Log */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">
                Live Event Log
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {events.length} events
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div ref={scrollRef} className="divide-y divide-border">
                {events.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">No events yet</p>
                    <p className="text-xs mt-1">
                      Click &quot;Run Object Removal Flow&quot; to start
                    </p>
                  </div>
                ) : (
                  events.map((entry) => (
                    <EventLogItem key={entry.id} entry={entry} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Right Panel - Recording Preview */}
        <div className="w-1/2 flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Recording Preview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generated recording JSON
            </p>
          </div>
          <ScrollArea className="flex-1">
            {recordingJson ? (
              <pre className="p-4 text-xs font-mono text-foreground whitespace-pre-wrap">
                {recordingJson}
              </pre>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-sm">Recording will appear here</p>
                <p className="text-xs mt-1">after the simulation completes</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Status Bar */}
      {isRunning && (
        <div className="fixed bottom-0 left-0 right-0 h-10 bg-primary/10 border-t border-primary/20 flex items-center justify-center">
          <span className="text-sm text-primary font-medium">
            Simulation in progress...
          </span>
        </div>
      )}
    </div>
  );
}
