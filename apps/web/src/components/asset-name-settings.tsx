import { Switch } from "@/components/ui/switch";
import { motion, useReducedMotion } from "motion/react";
import {
  CANVAS_PATTERN_STYLES,
  useCanvasPattern,
  type CanvasPattern,
} from "@/components/canvas/canvas-pattern";
import {
  ASSET_NAME_POSITIONS,
  useAssetNamePreferences,
  type AssetNamePosition,
} from "@/lib/asset-name-preferences";
import { cn } from "@/lib/utils";

function PositionPreview({
  position,
  pattern,
}: {
  position: AssetNamePosition;
  pattern: CanvasPattern;
}) {
  const inside = position.startsWith("inside");
  const labelY =
    position === "above"
      ? 10
      : position === "below"
        ? 89
        : position === "inside-top"
          ? 29
          : 68;
  const gradientId = `asset-name-preview-${position}`;
  const patternStyle =
    pattern === "none" ? null : CANVAS_PATTERN_STYLES[pattern];
  return (
    <span
      aria-hidden="true"
      className="relative block w-full overflow-hidden rounded-sm bg-card"
    >
      {patternStyle ? (
        <svg className="absolute inset-0 size-full" aria-hidden="true">
          <defs>
            <pattern
              id={`${gradientId}-pattern`}
              width={patternStyle.gap}
              height={patternStyle.gap}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(-${1 + (pattern === "cross" ? (patternStyle.size ?? 6) : patternStyle.gap) / 2},-${1 + (pattern === "cross" ? (patternStyle.size ?? 6) : patternStyle.gap) / 2})`}
            >
              {pattern === "dots" ? (
                <circle
                  cx="0.5"
                  cy="0.5"
                  r={(patternStyle.size ?? 1) / 2}
                  fill="var(--foreground)"
                  fillOpacity={patternStyle.opacity}
                />
              ) : pattern === "lines" ? (
                <path
                  d={`M${patternStyle.gap / 2} 0V${patternStyle.gap} M0 ${patternStyle.gap / 2}H${patternStyle.gap}`}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={patternStyle.opacity}
                  strokeWidth={patternStyle.lineWidth}
                />
              ) : (
                <path
                  d={`M0 ${(patternStyle.size ?? 5) / 2}h${patternStyle.size ?? 5} M${(patternStyle.size ?? 5) / 2} 0v${patternStyle.size ?? 5}`}
                  fill="none"
                  stroke="var(--foreground)"
                  strokeOpacity={patternStyle.opacity}
                  strokeWidth={patternStyle.lineWidth}
                />
              )}
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill={`url(#${gradientId}-pattern)`}
          />
        </svg>
      ) : null}
      <svg viewBox="0 0 128 96" className="block w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#bdc8bd" />
            <stop offset=".55" stopColor="#d4bca5" />
            <stop offset="1" stopColor="#6a807a" />
          </linearGradient>
          <clipPath id={`${gradientId}-clip`}>
            <rect x="14" y="18" width="100" height="61" rx="4" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${gradientId}-clip)`}>
          <rect
            x="14"
            y="18"
            width="100"
            height="61"
            fill={`url(#${gradientId})`}
          />
          <circle cx="88" cy="34" r="5" fill="#f4dcc1" opacity=".9" />
          <path
            d="M14 58 Q28 44 42 48 T72 48 T114 50 V79 H14Z"
            fill="#788f87"
          />
          <path
            d="M14 65 Q32 52 49 58 T83 55 T114 58 V79 H14Z"
            fill="#526e69"
          />
          <path d="M14 70 Q39 61 61 65 T114 63 V79 H14Z" fill="#364f4d" />
          <path
            d="M14 70 Q40 66 64 68 T114 67"
            fill="none"
            stroke="#d8c6ae"
            strokeOpacity=".4"
          />
        </g>
        <rect
          x="14.5"
          y="18.5"
          width="99"
          height="60"
          rx="4"
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity=".12"
        />
      </svg>
      <span
        className="pointer-events-none absolute inset-x-0 flex -translate-y-1/2 justify-center"
        style={{ top: `${(labelY / 96) * 100}%` }}
      >
        <span
          className={cn(
            "max-w-[75%] truncate text-[9px] leading-3 font-medium text-sidebar-foreground",
            inside &&
              "rounded-[4px] border border-sidebar-foreground/10 bg-sidebar/90 px-1.5 py-0.5",
          )}
        >
          Coast study.jpg
        </span>
      </span>
    </span>
  );
}

export function AssetNameSettings() {
  const { alwaysVisible, position, setPreferences } = useAssetNamePreferences();
  const { pattern } = useCanvasPattern();
  const reduceMotion = useReducedMotion();
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border/70 bg-card">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-5">
          <div>
            <label
              htmlFor="always-show-asset-names"
              className="text-sm font-medium"
            >
              Always show asset names
            </label>
            <p
              id="asset-names-description"
              className="mt-1 text-xs leading-5 text-muted-foreground"
            >
              Names for images and uploaded videos. When off, names appear on
              hover at the bottom of each card.
            </p>
          </div>
          <Switch
            id="always-show-asset-names"
            aria-describedby="asset-names-description"
            checked={alwaysVisible}
            onCheckedChange={(checked) =>
              setPreferences({ alwaysVisible: checked })
            }
          />
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{
          height: alwaysVisible ? "auto" : 0,
          opacity: alwaysVisible ? 1 : 0,
        }}
        transition={{
          duration: reduceMotion ? 0 : 0.2,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="overflow-hidden"
        aria-hidden={!alwaysVisible}
        inert={!alwaysVisible}
      >
        <div className="rounded-t-lg border-t border-border/70 bg-background px-4 py-4 sm:px-5">
          <div
            role="radiogroup"
            aria-label="Asset name position"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {ASSET_NAME_POSITIONS.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={position === option.value}
                tabIndex={position === option.value ? 0 : -1}
                onClick={() => setPreferences({ position: option.value })}
                onKeyDown={(event) => {
                  const delta =
                    event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? 1
                      : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? -1
                        : 0;
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 3
                        : delta
                          ? (index + delta + 4) % 4
                          : null;
                  if (next === null) return;
                  event.preventDefault();
                  setPreferences({
                    position: ASSET_NAME_POSITIONS[next].value,
                  });
                  event.currentTarget.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                    [next]?.focus();
                }}
                className="min-w-0 rounded-md text-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <span
                  className={cn(
                    "block overflow-hidden rounded-md border bg-card p-1.5",
                    position === option.value
                      ? "border-foreground ring-1 ring-foreground"
                      : "border-border hover:border-foreground/50",
                  )}
                >
                  <PositionPreview position={option.value} pattern={pattern} />
                </span>
                <span className="mt-2 block text-center">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
