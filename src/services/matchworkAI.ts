const API_BASE_URL = (
  import.meta.env.VITE_MATCHWORK_API_URL ??
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

export interface MatchEvidence {
  minute: number
  event_type: string
  team: string
  description: string
  score: string
  evidence_ids: string[]
  statistics: Record<string, unknown>
}

export interface MatchInsight {
  source: 'foundry' | 'rule-based'
  explanation: string
  evidence_ids: string[]
  status: string
}

export async function requestMatchInsight(
  event: MatchEvidence,
  fallbackText: string,
  audience: 'fan' | 'analyst',
  signal?: AbortSignal
): Promise<MatchInsight> {
  
const response = await fetch("/api/insights", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    event,
    audience,
    fallback_text: fallbackText
  }),
  signal
});

  if (!response.ok) {
    throw new Error(
      `Matchwork API error: ${response.status}`
    )
  }

  return response.json() as Promise<MatchInsight>
}
