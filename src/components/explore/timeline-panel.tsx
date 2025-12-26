"use client";

import { useRecording } from "@/lib/recording-store";
import { RecordingEvent } from "@/types/recording";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventIcon } from "./event-icon";
import { cn } from "@/lib/utils";

function formatTimestamp(timestamp: number, baseTimestamp: number): string {
  const diff = timestamp - baseTimestamp;
  if (diff < 1000) {
    return `+${diff}ms`;
  }
  return `+${(diff / 1000).toFixed(2)}s`;
}

interface TimelineItemProps {
  event: RecordingEvent;
  baseTimestamp: number;
  isSelected: boolean;
  onClick: () => void;
}

function TimelineItem({ event, baseTimestamp, isSelected, onClick }: TimelineItemProps) {
  const isFailed = event.type === "check_failed";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 flex items-center gap-3 transition-colors border-l-2",
        isSelected
          ? "bg-primary/20 border-l-primary"
          : "border-l-transparent hover:bg-muted/50",
        isFailed && !isSelected && "bg-red-500/10 hover:bg-red-500/20"
      )}
    >
      <span className="text-xs text-muted-foreground font-mono w-16 flex-shrink-0">
        {formatTimestamp(event.timestamp, baseTimestamp)}
      </span>
      <EventIcon type={event.type} />
      <span className={cn(
        "text-sm truncate",
        isFailed ? "text-red-400" : "text-foreground"
      )}>
        {event.name}
      </span>
    </button>
  );
}

export function TimelinePanel() {
  const { recording, selection, setSelection } = useRecording();

  if (!recording) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No recording loaded
      </div>
    );
  }

  const baseTimestamp = recording.events[0]?.timestamp || 0;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {recording.events.length} events
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {recording.events.map((event) => (
            <TimelineItem
              key={event.eventId}
              event={event}
              baseTimestamp={baseTimestamp}
              isSelected={selection?.type === "event" && selection.id === event.eventId}
              onClick={() => setSelection({ type: "event", id: event.eventId })}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Failed Checks Quick Access */}
      {recording.checkResults.filter(c => !c.passed).length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-red-400 mb-2">Failed Checks</h3>
            {recording.checkResults.filter(c => !c.passed).map((check) => (
              <button
                key={check.checkId}
                onClick={() => setSelection({ type: "check", id: check.checkId })}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded transition-colors",
                  selection?.type === "check" && selection.id === check.checkId
                    ? "bg-red-500/20 text-red-300"
                    : "text-red-400 hover:bg-red-500/10"
                )}
              >
                {check.checkName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
