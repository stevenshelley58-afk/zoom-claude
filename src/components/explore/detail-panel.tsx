"use client";

import { useRecording } from "@/lib/recording-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "./json-viewer";
import { EventIcon } from "./event-icon";

export function DetailPanel() {
  const { recording, selection } = useRecording();

  if (!recording || !selection) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p className="text-sm">Select an item from the timeline</p>
        </div>
      </div>
    );
  }

  // Event detail view
  if (selection.type === "event") {
    const event = recording.events.find((e) => e.eventId === selection.id);
    if (!event) return null;

    const isFailed = event.type === "check_failed";

    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <EventIcon type={event.type} className="w-6 h-6 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">{event.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isFailed ? "destructive" : "secondary"}>
                  {event.type}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {event.eventId}
                </span>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Timestamp</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <p className="font-mono text-sm">
                {new Date(event.timestamp).toISOString()}
              </p>
            </CardContent>
          </Card>

          {event.artifactRefs.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Artifact References</CardTitle>
              </CardHeader>
              <CardContent className="py-3 pt-0 space-y-2">
                {event.artifactRefs.map((ref, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {ref.role}
                    </Badge>
                    <code className="text-xs text-primary">{ref.artifactId}</code>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Payload</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <div className="bg-background rounded-lg p-3 border border-border">
                <JsonViewer data={event.payload} />
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Artifact detail view
  if (selection.type === "artifact") {
    const artifact = recording.artifacts[selection.id];
    if (!artifact) return null;

    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {artifact.properties.name as string || artifact.artifactId}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{artifact.artifactType}</Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {artifact.artifactId}
              </span>
            </div>
          </div>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Created At</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <p className="font-mono text-sm">
                {new Date(artifact.createdAt).toISOString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Properties</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <div className="bg-background rounded-lg p-3 border border-border">
                <JsonViewer data={artifact.properties} />
              </div>
            </CardContent>
          </Card>

          {artifact.derivedFrom.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Derived From</CardTitle>
              </CardHeader>
              <CardContent className="py-3 pt-0 space-y-1">
                {artifact.derivedFrom.map((parentId) => (
                  <code key={parentId} className="block text-xs text-primary">
                    {parentId}
                  </code>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    );
  }

  // Check result detail view
  if (selection.type === "check") {
    const check = recording.checkResults.find((c) => c.checkId === selection.id);
    if (!check) return null;

    return (
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{check.checkName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={check.passed ? "default" : "destructive"}>
                {check.passed ? "PASSED" : "FAILED"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {check.checkId}
              </span>
            </div>
          </div>

          {check.message && (
            <Card className={check.passed ? "" : "border-red-500/30 bg-red-500/5"}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Message</CardTitle>
              </CardHeader>
              <CardContent className="py-3 pt-0">
                <p className={`text-sm ${check.passed ? "" : "text-red-400"}`}>
                  {check.message}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Evidence</CardTitle>
            </CardHeader>
            <CardContent className="py-3 pt-0">
              <div className="bg-background rounded-lg p-3 border border-border">
                <JsonViewer data={check.evidence} />
              </div>
            </CardContent>
          </Card>

          {check.artifactRefs.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Related Artifacts</CardTitle>
              </CardHeader>
              <CardContent className="py-3 pt-0 space-y-1">
                {check.artifactRefs.map((artifactId) => (
                  <code key={artifactId} className="block text-xs text-primary">
                    {artifactId}
                  </code>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    );
  }

  return null;
}
