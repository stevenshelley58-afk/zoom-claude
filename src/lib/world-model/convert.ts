import { Recording as SDKRecording } from './core';
import { Recording as ViewerRecording } from '@/types/recording';

/**
 * Converts SDK Recording format to the Viewer Recording format
 */
export function convertRecordingForViewer(sdk: SDKRecording): ViewerRecording {
  return {
    recordingId: sdk.recordingId,
    createdAt: sdk.createdAt,
    events: sdk.events.map(e => ({
      eventId: e.eventId,
      timestamp: e.timestamp,
      type: e.type,
      name: e.name,
      payload: e.payload as Record<string, unknown>,
      artifactRefs: e.artifactRefs,
    })),
    artifacts: Object.fromEntries(
      Object.entries(sdk.artifacts).map(([id, a]) => [
        id,
        {
          artifactId: a.artifactId,
          artifactType: a.artifactType,
          properties: a.properties as Record<string, unknown>,
          derivedFrom: a.derivedFrom,
          createdAt: a.createdAt,
        },
      ])
    ),
    checkResults: sdk.checkResults.map(c => ({
      checkId: c.checkId,
      checkName: c.checkName,
      passed: c.passed,
      evidence: c.evidence as Record<string, unknown>,
      message: c.message,
      artifactRefs: c.artifactRefs,
    })),
    metadata: {
      hasFailure: sdk.metadata.hasFailure,
      failureReason: sdk.metadata.failureReason,
    },
    indexes: {
      failedChecks: sdk.indexes.failedChecks.map(c => ({
        checkId: c.checkId,
        checkName: c.checkName,
        passed: c.passed,
        evidence: c.evidence as Record<string, unknown>,
        message: c.message,
        artifactRefs: c.artifactRefs,
      })),
      artifactLineage: sdk.indexes.artifactLineage,
    },
  };
}
