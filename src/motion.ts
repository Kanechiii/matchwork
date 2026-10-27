import type { Transition } from "motion/react";

/*
  Motion language: calm and physical.
  - Entrances ease out (fast in, gentle settle). Exits are shorter and ease in.
  - Weight through duration: chips and labels ~0.25s, panels ~0.5s, story beats ~0.8s.
  - Controls use a tight spring so thumbs and bars feel attached to the pointer.
*/
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_IN: [number, number, number, number] = [0.55, 0, 0.75, 0.2];
export const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

export const SPRING_UI: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.7 };
export const SPRING_BAR: Transition = { type: "spring", stiffness: 170, damping: 26 };

export const STAGGER = 0.07;

/** Scroll reveal used by story sections: rises 24px and fades in once. */
export function reveal(delay = 0, distance = 24) {
  return {
    initial: { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.8, ease: EASE_OUT, delay },
  } as const;
}

/** Panel swap: enter from below, exit upward a little faster. */
export const swap = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: EASE_IN } },
} as const;
