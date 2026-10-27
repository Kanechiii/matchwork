import { ArrowLeftRight, ArrowUpRight, Gauge, Shield, Target } from "lucide-react";
import type { MatchEvent } from "../types/match";

const icons = {
  pass: ArrowUpRight,
  shot: Target,
  tackle: Shield,
  pressure: Gauge,
  possession_change: ArrowLeftRight,
} as const;

export function EventIcon({ type }: { type: MatchEvent["type"] }) {
  const Icon = icons[type];
  return <Icon aria-hidden="true" />;
}
