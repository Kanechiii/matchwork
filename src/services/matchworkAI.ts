export interface MatchEvidenceReference {
  match_id: "matchwork-demo-001";
  as_of_seconds: number;
  evidence_ids: string[];
  audience: "fan" | "analyst";
}
export interface MatchInsight {
  source: "foundry" | "rule-based";
  explanation: string;
  evidence_ids: string[];
  status: string;
}
let csrfToken: string | null = null;
export function hasOperatorSession() { return csrfToken !== null; }
export async function startOperatorSession(accessCode: string): Promise<void> {
  const response = await fetch("/api/browser/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: accessCode }),
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error("Operator session unavailable or access code rejected");
  const data = await response.json() as { csrf_token: string };
  csrfToken = data.csrf_token;
}
export async function endOperatorSession(): Promise<void> {
  csrfToken = null;
  await fetch("/api/browser/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
}
export async function requestMatchInsight(evidence: MatchEvidenceReference, signal?: AbortSignal): Promise<MatchInsight> {
  if (!csrfToken) throw new Error("Operator access required");
  const response = await fetch("/api/browser/agents/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Matchwork-CSRF": csrfToken },
    body: JSON.stringify(evidence),
    credentials: "same-origin",
    signal,
  });
  if (response.status === 401 || response.status === 403) csrfToken = null;
  if (!response.ok) throw new Error(`Matchwork AI request failed: ${response.status}`);
  return response.json() as Promise<MatchInsight>;
}
