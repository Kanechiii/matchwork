import { calculateMatchStats } from "../engine/calculateStats.ts";
import { extractWindowFeatures } from "../ai/features.ts";
import type { SyntheticMatch } from "../types/match.ts";

/**
 * Experimental multi-specialist *workflow*, NOT yet an LLM multi-agent system.
 * Executors use deterministic logic, with one optional model-backed narrative
 * adapter. No cloud credentials or network requests are included.
 */
export interface AgentTrace {
  agent: "intake" | "analyst" | "narrator" | "auditor";
  status: "ok" | "recovered";
  detail: string;
}
export interface NarrationRequest {
  clockSeconds: number;
  verifiedEventIds: string[];
  observedShots: number;
  observedPressures: number;
  observedTurnovers: number;
  summary: string;
}
export interface NarrationResponse {
  text: string;
  citedEventIds: string[];
}
export type NarrativeAdapter = (request: Readonly<NarrationRequest>) => Promise<NarrationResponse>;
export interface OrchestrationResult {
  clockSeconds: number;
  narrative: string;
  evidenceEventIds: string[];
  recovered: boolean;
  trace: AgentTrace[];
}
function validClock(match: SyntheticMatch, seconds: number) {
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > match.metadata.durationSeconds) {
    throw new Error("Clock outside the synthetic match");
  }
}
function fallbackSummary(request: NarrationRequest): string {
  return `Through ${request.clockSeconds}s: ${request.observedShots} shots, ${request.observedPressures} pressures, and ${request.observedTurnovers} possession changes in the rolling match window. This is a synthetic-event summary, not an AI prediction.`;
}
function auditNarrative(response: NarrationResponse, allowed: Set<string>): boolean {
  return typeof response?.text === "string"
    && response.text.length > 0
    && response.text.length <= 900
    && Array.isArray(response.citedEventIds)
    && response.citedEventIds.length > 0
    && response.citedEventIds.every(id => typeof id === "string" && allowed.has(id));
}
/**
 * Specialists are explicit and traceable; optional adapter enables future
 * actual model-backed narration. Deterministic fallback is never mislabeled
 * as model-generated output.
 */
export async function orchestrateMatchInsight(
  match: SyntheticMatch,
  clockSeconds: number,
  modelNarrator?: NarrativeAdapter,
): Promise<OrchestrationResult> {
  const trace: AgentTrace[] = [];
  // Intake: verify event integrity against the trusted statistics engine.
  validClock(match, clockSeconds);
  const snapshot = calculateMatchStats(match, clockSeconds);
  trace.push({ agent: "intake", status: "ok", detail: `Validated ${snapshot.processedEvents} replay events` });

  // Analyst: derive and hand off exclusively as-of evidence.
  const features = extractWindowFeatures(match, clockSeconds);
  const allowed = new Set(features.eventIds);
  const request: NarrationRequest = {
    clockSeconds,
    verifiedEventIds: [...features.eventIds],
    observedShots: features.shots,
    observedPressures: features.pressures,
    observedTurnovers: features.turnovers,
    summary: `Passes ${features.passesCompleted}/${features.passesAttempted}; shot events ${features.shots}`,
  };
  trace.push({ agent: "analyst", status: "ok", detail: `Handed off ${allowed.size} evidence event IDs` });

  let recovered = false;
  let narrative = fallbackSummary(request);
  let evidenceEventIds = features.eventIds.slice(-5);
  if (modelNarrator) {
    try {
      const candidate = await modelNarrator(Object.freeze({
        ...request, verifiedEventIds: Object.freeze([...request.verifiedEventIds]) as unknown as string[],
      }));
      // Narrative content cannot be mathematically verified; claims still require human review.
      if (!auditNarrative(candidate, allowed)) {
        throw new Error("Narrator returned missing or out-of-window evidence");
      }
      narrative = candidate.text;
      evidenceEventIds = [...new Set(candidate.citedEventIds)];
      trace.push({ agent: "narrator", status: "ok", detail: "External narrative adapter returned a draft" });
    } catch {
      recovered = true;
      trace.push({ agent: "narrator", status: "recovered", detail: "Adapter failed or evidence rejected; deterministic fallback used" });
    }
  } else {
    trace.push({ agent: "narrator", status: "ok", detail: "No model adapter; deterministic synthetic-event narrative" });
  }
  // Auditor: enforce evidence provenance before release.
  if (!evidenceEventIds.every(id => allowed.has(id))) {
    recovered = true;
    evidenceEventIds = features.eventIds.slice(-5);
    narrative = fallbackSummary(request);
  }
  trace.push({ agent: "auditor", status: recovered ? "recovered" : "ok", detail: `Audited ${evidenceEventIds.length} event IDs` });
  return { clockSeconds, narrative, evidenceEventIds, recovered, trace };
}
