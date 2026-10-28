import { useId, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import type { Team, TeamId } from "../types/match";
import { TeamCrest } from "../components/TeamCrest";
import { SPRING_UI } from "../motion";

interface TeamFollowProps {
  label: string;
  value: TeamId | "all";
  home: Team;
  away: Team;
  onChange: (value: TeamId | "all") => void;
}

/** Three separate buttons: both teams, the home team, and the away team. */
export function TeamFollow({ label, value, home, away, onChange }: TeamFollowProps) {
  const labelId = useId();
  const options = [
    { value: "all", title: "Both teams", sub: "Neutral view", teams: [home, away] },
    { value: home.id, title: home.name, sub: `Home · ${home.abbreviation}`, teams: [home] },
    { value: away.id, title: away.name, sub: `Away · ${away.abbreviation}`, teams: [away] },
  ];
  return (
    <div className="follow">
      <span className="follow-label" id={labelId}>{label}</span>
      <div className="follow-options" role="group" aria-labelledby={labelId}>
        {options.map((option) => {
          const active = option.value === value;
          const tint = option.teams.length === 1 ? ({ "--team": option.teams[0].color } as CSSProperties) : undefined;
          return (
            <motion.button key={option.value} type="button" className={`follow-option${active ? " is-active" : ""}`} style={tint}
              aria-pressed={active} onClick={() => onChange(option.value)} whileTap={{ scale: 0.98 }}>
              {active && <motion.span layoutId="follow-thumb" className="follow-thumb" transition={SPRING_UI} aria-hidden="true" />}
              <span className="follow-crests">{option.teams.map((team) => <TeamCrest key={team.id} team={team} size="sm" />)}</span>
              <span className="follow-text"><strong>{option.title}</strong><small>{option.sub}</small></span>
              <Check className="follow-check" aria-hidden="true" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
