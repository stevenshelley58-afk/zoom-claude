export interface ArtifactRef {
  artifactId: string;
  role: string;
}

export interface RecordingEvent {
  eventId: string;
  timestamp: number;
  type: string;
  name: string;
  payload: Record<string, unknown>;
  artifactRefs: ArtifactRef[];
}

export interface Artifact {
  artifactId: string;
  artifactType: string;
  properties: Record<string, unknown>;
  derivedFrom: string[];
  createdAt: number;
}

export interface CheckResult {
  checkId: string;
  checkName: string;
  passed: boolean;
  evidence: Record<string, unknown>;
  message?: string;
  artifactRefs: string[];
}

export interface RecordingMetadata {
  hasFailure: boolean;
  failureReason?: string;
}

export interface RecordingIndexes {
  failedChecks: CheckResult[];
  artifactLineage: Record<string, string[]>;
}

export interface Recording {
  recordingId: string;
  createdAt: number;
  events: RecordingEvent[];
  artifacts: Record<string, Artifact>;
  checkResults: CheckResult[];
  metadata: RecordingMetadata;
  indexes: RecordingIndexes;
}

export type SelectionType = 'event' | 'artifact' | 'check';

export interface Selection {
  type: SelectionType;
  id: string;
}
