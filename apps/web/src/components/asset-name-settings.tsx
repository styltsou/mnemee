import { Switch } from "@/components/ui/switch";
import {
  ASSET_NAME_POSITIONS,
  useAssetNamePreferences,
  type AssetNamePosition,
} from "@/lib/asset-name-preferences";
import { cn } from "@/lib/utils";

function PositionPreview({ position }: { position: AssetNamePosition }) {
  const inside = position.startsWith("inside");
  const labelY =
    position === "above"
      ? 8
      : position === "below"
        ? 76
        : position === "inside-top"
          ? 29
          : 55;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 128 96"
      className="block w-full rounded-sm"
    >
      <rect width="128" height="96" fill="var(--background)" />
      <rect x="16" y="23" width="96" height="50" rx="5" fill="var(--muted)" />
      <path
        d="M17 66L43 39L64 58L80 44L111 72H17Z"
        fill="var(--foreground)"
        opacity=".12"
      />
      <circle cx="89" cy="37" r="5" fill="var(--foreground)" opacity=".18" />
      {inside ? (
        <rect
          x="38"
          y={labelY - 1}
          width="52"
          height="13"
          rx="4"
          fill="var(--background)"
          fillOpacity=".8"
          stroke="var(--border)"
        />
      ) : null}
      <rect
        x="44"
        y={labelY + 4}
        width="40"
        height="3"
        rx="1.5"
        fill="var(--foreground)"
        opacity=".75"
      />
    </svg>
  );
}

export function AssetNameSettings() {
  const { alwaysVisible, position, setPreferences } = useAssetNamePreferences();
  return (
    <div className="mt-9">
      <h3 className="text-[13px] font-medium text-muted-foreground">
        Asset names
      </h3>
      <div className="mt-4 rounded-lg border border-border/70 bg-card px-4 py-4 sm:px-5">
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
        {alwaysVisible ? (
          <div className="mt-5 border-t border-border/70 pt-4">
            <p
              id="asset-name-position-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Position
            </p>
            <div
              role="radiogroup"
              aria-labelledby="asset-name-position-label"
              className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
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
                      "block overflow-hidden rounded-md border bg-background p-0.5",
                      position === option.value
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-border hover:border-foreground/50",
                    )}
                  >
                    <PositionPreview position={option.value} />
                  </span>
                  <span className="mt-2 block text-center">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
