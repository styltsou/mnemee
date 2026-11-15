/**
 * Sweeping highlight for a color's name while automatic naming is pending. All
 * parts sit behind `motion-safe:` so reduced motion shows the plain text.
 */
export const GRADIENT_NAME_SHIMMER =
  "motion-safe:animate-gradient-name-sweep motion-safe:bg-[linear-gradient(105deg,var(--foreground)_40%,color-mix(in_srgb,var(--foreground)_20%,transparent)_50%,var(--foreground)_60%)] motion-safe:bg-[length:220%_100%] motion-safe:bg-clip-text motion-safe:text-transparent";
