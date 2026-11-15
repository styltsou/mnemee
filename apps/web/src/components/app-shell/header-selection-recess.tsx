import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  SELECTION_EASE,
  SELECTION_ENTER_DURATION,
  SELECTION_EXIT_DURATION,
} from "@/components/selection/selection-motion";

// Start at the center third and widen as the edge rises. Matching commands
// interpolate both dimensions together. Each corner meets the straight wall
// tangentially; the 12px quarter-circle control offset is 12 * 0.55228475.
// Extend the fill into the board so there is no antialiased seam at the join.
const FLAT_EDGE =
  "M80 48 C84.418 48 88 48 88 48 L88 48 C88 48 91.582 48 96 48 L144 48 C148.418 48 152 48 152 48 L152 48 C152 48 155.582 48 160 48 L160 50 L80 50 Z";
const OPEN_EDGE =
  "M0 48 C6.627 48 12 42.627 12 36 L12 20 C12 13.373 17.373 8 24 8 L216 8 C222.627 8 228 13.373 228 20 L228 36 C228 42.627 233.373 48 240 48 L240 50 L0 50 Z";
const RECESS_EXIT_DURATION = 0.18;

export function HeaderSelectionRecess({
  children,
  onRevealStart,
}: {
  children: ReactNode;
  onRevealStart: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="header-selection-recess"
      initial="closed"
      animate="open"
      exit="closed"
      onAnimationStart={(definition) => {
        if (definition === "open") onRevealStart();
      }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full overflow-visible fill-card"
        viewBox="0 0 240 48"
        preserveAspectRatio="none"
      >
        <motion.path
          stroke="none"
          variants={{
            closed: {
              d: FLAT_EDGE,
              transition: {
                duration: reduceMotion ? 0 : RECESS_EXIT_DURATION,
                ease: SELECTION_EASE,
              },
            },
            open: {
              d: OPEN_EDGE,
              transition: {
                duration: reduceMotion ? 0 : SELECTION_ENTER_DURATION,
                ease: SELECTION_EASE,
              },
            },
          }}
        />
      </svg>
      <motion.div
        className="relative flex h-full items-end justify-center pb-1"
        variants={{
          closed: {
            opacity: 0,
            transform: reduceMotion ? "none" : "translateY(4px)",
            transition: {
              duration: SELECTION_EXIT_DURATION,
              ease: SELECTION_EASE,
            },
          },
          open: {
            opacity: 1,
            transform: reduceMotion ? "none" : "translateY(0px)",
            transition: {
              duration: reduceMotion ? 0.1 : SELECTION_ENTER_DURATION,
              ease: SELECTION_EASE,
            },
          },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
