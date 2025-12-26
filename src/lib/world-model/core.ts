// ID generators
function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Types
export type ArtifactId = string;
export type EventId = string;

export interface Artifact {
  artifactId: ArtifactId;
  artifactType: string;
  contentHash: string;
  derivedFrom: ArtifactId[];
  createdBy: string;
  createdAt: number;
  properties: Record<string, unknown>;
  locations: Array<{ type: string; reference: string; since: number }>;
}

export interface WorldModelEvent {
  eventId: EventId;
  timestamp: number;
  sessionId: string;
  flowId: string;
  operationId?: string;
  type: string;
  name: string;
  payload: Record<string, unknown>;
  artifactRefs: Array<{ artifactId: string; role: string }>;
}

export interface CheckDefinition {
  checkId: string;
  name: string;
  trigger: { type: string; artifactType?: string };
  condition: { type: string; artifactProperty?: string; operator?: string; value?: unknown };
  severity: 'error' | 'warning' | 'info';
  messageTemplate: string;
}

export interface CheckResult {
  checkId: string;
  checkName: string;
  timestamp: number;
  passed: boolean;
  condition: string;
  evidence: Record<string, unknown>;
  message?: string;
  artifactRefs: string[];
}

export interface Recording {
  recordingId: string;
  createdAt: number;
  sessionId: string;
  events: WorldModelEvent[];
  artifacts: Record<string, Artifact>;
  checkResults: CheckResult[];
  metadata: {
    hasFailure: boolean;
    failureReason?: string;
    failedChecks: string[];
  };
  indexes: {
    eventsByType: Record<string, string[]>;
    artifactsByType: Record<string, string[]>;
    artifactLineage: Record<string, string[]>;
    failedChecks: CheckResult[];
    timeline: Array<{
      timestamp: number;
      eventId: string;
      type: string;
      name: string;
      isCheckFailure: boolean;
    }>;
  };
}

// Main class
export class WorldModel {
  private events: WorldModelEvent[] = [];
  private artifacts: Map<string, Artifact> = new Map();
  private checks: Map<string, CheckDefinition> = new Map();
  private checkResults: CheckResult[] = [];
  private sessionId: string;
  private flowId: string | null = null;
  private operationId: string | null = null;
  private listeners: Array<(event: WorldModelEvent) => void> = [];

  constructor() {
    this.sessionId = generateId('ses');
  }

  subscribe(fn: (event: WorldModelEvent) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  registerCheck(check: CheckDefinition): void {
    this.checks.set(check.checkId, check);
  }

  startFlow(name: string): string {
    this.flowId = generateId('flw');
    this.emit('flow_started', name, { flowName: name });
    return this.flowId;
  }

  enterStep(name: string): void {
    this.emit('step_entered', name, { stepName: name });
  }

  completeFlow(outcome: 'success' | 'failure' | 'abandoned' = 'success'): void {
    this.emit('flow_completed', 'Flow Completed', { outcome });
    this.flowId = null;
  }

  async operation<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const opId = generateId('opr');
    this.operationId = opId;
    this.emit('operation_started', name, { operationId: opId, operationName: name });
    const start = Date.now();
    try {
      const result = await fn();
      this.emit('operation_completed', name, { operationId: opId, operationName: name, duration: Date.now() - start });
      return result;
    } catch (error) {
      this.emit('operation_failed', name, { operationId: opId, operationName: name, duration: Date.now() - start, error: String(error) });
      throw error;
    } finally {
      this.operationId = null;
    }
  }

  createArtifact(type: string, properties: Record<string, unknown>, options: { derivedFrom?: string[]; content?: unknown } = {}): Artifact {
    const artifact: Artifact = {
      artifactId: generateId('art'),
      artifactType: type,
      contentHash: this.hash(properties),
      derivedFrom: options.derivedFrom || [],
      createdBy: this.operationId || '',
      createdAt: Date.now(),
      properties,
      locations: [],
    };
    this.artifacts.set(artifact.artifactId, artifact);
    this.emit('artifact_created', `Created ${type}`, { artifactId: artifact.artifactId, artifactType: type, properties, derivedFrom: artifact.derivedFrom }, [{ artifactId: artifact.artifactId, role: 'output' }]);
    this.evaluateChecks('artifact_created', type, artifact);
    return artifact;
  }

  updateArtifactLocation(artifactId: string, locationType: string, reference: string): void {
    const artifact = this.artifacts.get(artifactId);
    if (artifact) {
      artifact.locations.push({ type: locationType, reference, since: Date.now() });
      this.emit('artifact_location_added', `Location: ${locationType}`, { artifactId, locationType, reference }, [{ artifactId, role: 'affected' }]);
    }
  }

  displayArtifact(artifactId: string, element: string): void {
    this.updateArtifactLocation(artifactId, 'displayed', element);
    this.emit('artifact_displayed', 'Displayed', { artifactId, element }, [{ artifactId, role: 'displayed' }]);
  }

  getArtifact(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  async externalCall<T>(service: string, operation: string, inputArtifacts: string[], fn: () => Promise<T>): Promise<T> {
    this.emit('external_call_started', `${service}.${operation}`, { service, operation, inputArtifacts }, inputArtifacts.map(id => ({ artifactId: id, role: 'input' })));
    const start = Date.now();
    try {
      const result = await fn();
      this.emit('external_call_completed', `${service}.${operation}`, { service, operation, duration: Date.now() - start, success: true }, inputArtifacts.map(id => ({ artifactId: id, role: 'input' })));
      return result;
    } catch (error) {
      this.emit('external_call_failed', `${service}.${operation}`, { service, operation, duration: Date.now() - start, success: false, error: String(error) }, inputArtifacts.map(id => ({ artifactId: id, role: 'input' })));
      throw error;
    }
  }

  userAction(action: string, details?: Record<string, unknown>): void {
    this.emit('user_action', action, { action, ...details });
  }

  stateChanged(path: string, from: unknown, to: unknown): void {
    this.emit('state_changed', `State: ${path}`, { path, from, to });
  }

  check(name: string, condition: boolean, evidence: Record<string, unknown>): boolean {
    const result: CheckResult = {
      checkId: generateId('chk'),
      checkName: name,
      timestamp: Date.now(),
      passed: condition,
      condition: String(condition),
      evidence,
      message: condition ? undefined : `Check failed: ${name}`,
      artifactRefs: [],
    };
    this.checkResults.push(result);
    this.emit(condition ? 'check_passed' : 'check_failed', name, { ...result });
    return condition;
  }

  private evaluateChecks(trigger: string, artifactType: string, artifact: Artifact): void {
    for (const check of this.checks.values()) {
      if (check.trigger.type !== trigger) continue;
      if (check.trigger.artifactType && check.trigger.artifactType !== artifactType) continue;

      const cond = check.condition;
      let passed = false;
      const evidence: Record<string, unknown> = { artifactId: artifact.artifactId };

      if (cond.type === 'property' && cond.artifactProperty) {
        const value = artifact.properties[cond.artifactProperty];
        evidence[cond.artifactProperty] = value;
        switch (cond.operator) {
          case '>': passed = (value as number) > (cond.value as number); break;
          case '>=': passed = (value as number) >= (cond.value as number); break;
          case '<': passed = (value as number) < (cond.value as number); break;
          case '<=': passed = (value as number) <= (cond.value as number); break;
          case '==': passed = value === cond.value; break;
          case '!=': passed = value !== cond.value; break;
          default: passed = !!value;
        }
      }

      const result: CheckResult = {
        checkId: check.checkId,
        checkName: check.name,
        timestamp: Date.now(),
        passed,
        condition: `${cond.artifactProperty} ${cond.operator} ${cond.value}`,
        evidence,
        message: passed ? undefined : check.messageTemplate.replace(/\$\{(\w+)\}/g, (_, k) => String(evidence[k] ?? '')),
        artifactRefs: [artifact.artifactId],
      };
      this.checkResults.push(result);
      this.emit(passed ? 'check_passed' : 'check_failed', check.name, { ...result }, [{ artifactId: artifact.artifactId, role: 'affected' }]);
    }
  }

  private emit(type: string, name: string, payload: Record<string, unknown>, artifactRefs: Array<{ artifactId: string; role: string }> = []): void {
    const event: WorldModelEvent = {
      eventId: generateId('evt'),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      flowId: this.flowId || '',
      operationId: this.operationId || undefined,
      type,
      name,
      payload,
      artifactRefs,
    };
    this.events.push(event);
    this.listeners.forEach(fn => fn(event));
  }

  private hash(obj: unknown): string {
    const str = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, '0');
  }

  getRecording(): Recording {
    const events = [...this.events];
    const artifacts = Object.fromEntries(this.artifacts);
    const failedChecks = this.checkResults.filter(c => !c.passed);

    const eventsByType: Record<string, string[]> = {};
    const artifactsByType: Record<string, string[]> = {};
    const artifactLineage: Record<string, string[]> = {};

    for (const e of events) {
      (eventsByType[e.type] ??= []).push(e.eventId);
    }
    for (const [id, a] of Object.entries(artifacts)) {
      (artifactsByType[a.artifactType] ??= []).push(id);
      artifactLineage[id] = this.traceLineage(id, artifacts);
    }

    return {
      recordingId: generateId('rec'),
      createdAt: Date.now(),
      sessionId: this.sessionId,
      events,
      artifacts,
      checkResults: [...this.checkResults],
      metadata: {
        hasFailure: failedChecks.length > 0,
        failureReason: failedChecks[0]?.message,
        failedChecks: failedChecks.map(c => c.checkId),
      },
      indexes: {
        eventsByType,
        artifactsByType,
        artifactLineage,
        failedChecks,
        timeline: events.map(e => ({ timestamp: e.timestamp, eventId: e.eventId, type: e.type, name: e.name, isCheckFailure: e.type === 'check_failed' })),
      },
    };
  }

  private traceLineage(id: string, artifacts: Record<string, Artifact>): string[] {
    const lineage: string[] = [];
    const visited = new Set<string>();
    const traverse = (aid: string) => {
      if (visited.has(aid)) return;
      visited.add(aid);
      const a = artifacts[aid];
      if (a) for (const p of a.derivedFrom) { lineage.push(p); traverse(p); }
    };
    traverse(id);
    return lineage;
  }

  reset(): void {
    this.events = [];
    this.artifacts.clear();
    this.checkResults = [];
    this.sessionId = generateId('ses');
    this.flowId = null;
    this.operationId = null;
  }
}

// Global instance
export const worldModel = new WorldModel();

// Convenience API
export const Monitor = {
  startFlow: (name: string) => worldModel.startFlow(name),
  enterStep: (name: string) => worldModel.enterStep(name),
  completeFlow: (outcome?: 'success' | 'failure' | 'abandoned') => worldModel.completeFlow(outcome),
  operation: <T>(name: string, fn: () => Promise<T>) => worldModel.operation(name, fn),
  createArtifact: (type: string, props: Record<string, unknown>, options?: { derivedFrom?: string[] }) => worldModel.createArtifact(type, props, options),
  updateArtifactLocation: (id: string, type: string, ref: string) => worldModel.updateArtifactLocation(id, type, ref),
  displayArtifact: (id: string, element: string) => worldModel.displayArtifact(id, element),
  getArtifact: (id: string) => worldModel.getArtifact(id),
  externalCall: <T>(service: string, op: string, inputs: string[], fn: () => Promise<T>) => worldModel.externalCall(service, op, inputs, fn),
  userAction: (action: string, details?: Record<string, unknown>) => worldModel.userAction(action, details),
  stateChanged: (path: string, from: unknown, to: unknown) => worldModel.stateChanged(path, from, to),
  check: (name: string, condition: boolean, evidence: Record<string, unknown>) => worldModel.check(name, condition, evidence),
  registerCheck: (check: CheckDefinition) => worldModel.registerCheck(check),
  getRecording: () => worldModel.getRecording(),
  reset: () => worldModel.reset(),
  subscribe: (fn: (event: WorldModelEvent) => void) => worldModel.subscribe(fn),
};
