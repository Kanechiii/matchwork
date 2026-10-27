import type { ReactNode } from "react";
import { motion } from "motion/react";
import { SPRING_UI } from "../motion";

interface Option<T extends string | number> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface SegmentedProps<T extends string | number> {
  /** Unique per page: drives the shared sliding thumb. */
  id: string;
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
  className?: string;
}

export function Segmented<T extends string | number>({ id, label, options, value, onChange, size = "md", className = "" }: SegmentedProps<T>) {
  return (
    <div className={`segmented${size === "sm" ? " segmented-sm" : ""} ${className}`} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button key={String(option.value)} type="button" aria-pressed={active} onClick={() => onChange(option.value)}>
            {active && <motion.span layoutId={`${id}-thumb`} className="segmented-thumb" transition={SPRING_UI} aria-hidden="true" />}
            <span className="segmented-label">{option.icon}{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
