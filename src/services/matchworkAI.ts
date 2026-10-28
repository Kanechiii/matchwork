/** The public browser requests only canonical match/time references, never keys. */
export interface MatchInsight {
  source: "foundry" | "rule-based";
  explanation: string;
  evidence_ids: string[];
  status: string;
  /** Source event time; may precede the paused replay within a safe cache window. */
  as_of_seconds?: number | null;
}

export interface PublicMatchInsightRequest {
  match_id: string;
  as_of_seconds: number;
  audience: "fan" | "analyst";
}

/** Quota-limited public Foundry narrative, verified and cached server-side. */
export async function requestPublicMatchInsight(
  evidence: PublicMatchInsightRequest,
  signal?: AbortSignal,
): Promise<MatchInsight> {
  const response = await fetch("/api/public/agents/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(evidence),
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error(`Public narrative unavailable: ${response.status}`);
  return response.json() as Promise<MatchInsight>;
}
