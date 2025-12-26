"use client";

import { useMemo } from "react";
import { useRecording } from "@/lib/recording-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LineageNodeProps {
  depth: number;
  isSelected: boolean;
  onClick: () => void;
  name: string;
  type: string;
}

function LineageNode({ depth, isSelected, onClick, name, type }: LineageNodeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded text-sm transition-colors flex items-center gap-2",
        isSelected ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-foreground"
      )}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
    >
      <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <span className="truncate">{name}</span>
      <Badge variant="outline" className="text-[10px] py-0 px-1 flex-shrink-0">
        {type}
      </Badge>
    </button>
  );
}

export function InspectorPanel() {
  const { recording, selection, setSelection } = useRecording();

  // Build lineage tree for the selected artifact
  const lineageData = useMemo(() => {
    if (!recording || selection?.type !== "artifact") return null;

    const artifactId = selection.id;
    const artifact = recording.artifacts[artifactId];
    if (!artifact) return null;

    // Get ancestors (what this artifact was derived from)
    const getAncestors = (id: string, visited = new Set<string>()): string[] => {
      if (visited.has(id)) return [];
      visited.add(id);

      const art = recording.artifacts[id];
      if (!art) return [];

      const ancestors: string[] = [];
      for (const parentId of art.derivedFrom) {
        ancestors.push(parentId);
        ancestors.push(...getAncestors(parentId, visited));
      }
      return ancestors;
    };

    // Get descendants (what was derived from this artifact)
    const getDescendants = (id: string, visited = new Set<string>()): string[] => {
      if (visited.has(id)) return [];
      visited.add(id);

      const descendants: string[] = [];
      for (const [artId, art] of Object.entries(recording.artifacts)) {
        if (art.derivedFrom.includes(id)) {
          descendants.push(artId);
          descendants.push(...getDescendants(artId, visited));
        }
      }
      return descendants;
    };

    return {
      artifact,
      ancestors: [...new Set(getAncestors(artifactId))],
      descendants: [...new Set(getDescendants(artifactId))],
    };
  }, [recording, selection]);

  // Get all artifacts for quick access
  const allArtifacts = useMemo(() => {
    if (!recording) return [];
    return Object.values(recording.artifacts).sort((a, b) => a.createdAt - b.createdAt);
  }, [recording]);

  if (!recording) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No recording loaded
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Inspector</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {allArtifacts.length} artifacts
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Lineage View when artifact is selected */}
          {lineageData && (
            <div className="space-y-3">
              {/* Ancestors */}
              {lineageData.ancestors.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                    DERIVED FROM
                  </h3>
                  <div className="space-y-0.5">
                    {lineageData.ancestors.map((id) => {
                      const art = recording.artifacts[id];
                      if (!art) return null;
                      return (
                        <LineageNode
                          key={id}
                          depth={0}
                          isSelected={selection?.type === "artifact" && selection.id === id}
                          onClick={() => setSelection({ type: "artifact", id })}
                          name={(art.properties.name as string) || id}
                          type={art.artifactType}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Current Artifact */}
              <div>
                <h3 className="text-xs font-semibold text-primary mb-2 px-2">
                  SELECTED
                </h3>
                <LineageNode
                  depth={0}
                  isSelected={true}
                  onClick={() => {}}
                  name={(lineageData.artifact.properties.name as string) || lineageData.artifact.artifactId}
                  type={lineageData.artifact.artifactType}
                />
              </div>

              {/* Descendants */}
              {lineageData.descendants.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                    DERIVED TO
                  </h3>
                  <div className="space-y-0.5">
                    {lineageData.descendants.map((id) => {
                      const art = recording.artifacts[id];
                      if (!art) return null;
                      return (
                        <LineageNode
                          key={id}
                          depth={0}
                          isSelected={selection?.type === "artifact" && selection.id === id}
                          onClick={() => setSelection({ type: "artifact", id })}
                          name={(art.properties.name as string) || id}
                          type={art.artifactType}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Artifacts List */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              ALL ARTIFACTS
            </h3>
            <div className="space-y-0.5">
              {allArtifacts.map((artifact) => (
                <LineageNode
                  key={artifact.artifactId}
                  depth={0}
                  isSelected={selection?.type === "artifact" && selection.id === artifact.artifactId}
                  onClick={() => setSelection({ type: "artifact", id: artifact.artifactId })}
                  name={(artifact.properties.name as string) || artifact.artifactId}
                  type={artifact.artifactType}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
