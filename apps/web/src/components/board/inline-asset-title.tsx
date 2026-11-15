import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { SparklesIcon, XIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InlineAssetTitle({
  value,
  fallback,
  onSave,
  onRegenerate,
  disabled = false,
  titleClassName,
}: {
  value: string;
  fallback: string;
  onSave: (value: string) => void;
  onRegenerate?: () => void;
  disabled?: boolean;
  titleClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const restoreTitleFocus = useRef(false);
  const cancelled = useRef(false);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (restoreTitleFocus.current) {
      restoreTitleFocus.current = false;
      titleButtonRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);
  function finish(save: boolean) {
    if (save && !cancelled.current && draft.trim() !== value)
      onSave(draft.trim());
    setEditing(false);
  }
  function handleCancelKey(event: KeyboardEvent) {
    if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    cancelled.current = true;
    restoreTitleFocus.current = true;
    finish(false);
  }
  return (
    <span
      className={cn(
        "group/title relative flex h-8 min-w-0 items-center gap-1.5",
        editing && "px-2",
      )}
    >
      <motion.span
        aria-hidden="true"
        layout={reduceMotion ? false : "size"}
        layoutDependency={editing}
        transition={{
          duration: editing ? 0.12 : 0.08,
          ease: [0.23, 1, 0.32, 1],
        }}
        style={{ borderRadius: 8 }}
        className={cn(
          "pointer-events-none absolute inset-0 border border-transparent bg-muted opacity-0 transition-[opacity,border-color,box-shadow] duration-75 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none group-hover/title:opacity-100 group-focus-within/title:opacity-100",
          editing && "border-foreground/25 opacity-100 shadow-sm duration-100",
        )}
      />
      {editing ? (
        <input
          ref={inputRef}
          aria-label="Title"
          maxLength={255}
          placeholder={fallback}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => {
            if (
              !event.currentTarget.parentElement?.contains(event.relatedTarget)
            )
              finish(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              restoreTitleFocus.current = true;
              finish(true);
            } else {
              handleCancelKey(event);
            }
          }}
          className="relative field-sizing-content h-full min-w-4 bg-transparent ps-0 pe-2 pt-0 pb-0.5 leading-5 text-inherit outline-none placeholder:text-muted-foreground"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                ref={titleButtonRef}
                type="button"
                aria-disabled={disabled}
                aria-label={`Edit title: ${value || fallback}`}
                onClick={() => {
                  if (disabled) return;
                  cancelled.current = false;
                  setDraft(value);
                  setEditing(true);
                }}
                className={cn(
                  "relative h-full min-w-0 truncate rounded-lg px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  titleClassName,
                )}
              />
            }
          >
            {value || fallback}
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="duration-125 ease-[cubic-bezier(0.23,1,0.32,1)]"
          >
            Edit title
          </TooltipContent>
        </Tooltip>
      )}
      {editing ? (
        <button
          type="button"
          disabled={disabled}
          aria-label="Cancel title edit"
          onKeyDown={handleCancelKey}
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onBlur={(event) => {
            if (
              editing &&
              !event.currentTarget.parentElement?.contains(event.relatedTarget)
            )
              finish(true);
          }}
          onClick={() => {
            cancelled.current = true;
            restoreTitleFocus.current = true;
            finish(false);
          }}
          className="relative flex size-5 shrink-0 items-center justify-center rounded-sm text-inherit focus-visible:outline-2 focus-visible:outline-ring"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      {!editing && onRegenerate ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  titleButtonRef.current?.focus({ preventScroll: true });
                  onRegenerate();
                }}
                aria-label="Regenerate title"
                className="relative flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[background-color,opacity,color] duration-75 group-focus-within/title:opacity-100 group-hover/title:opacity-100 hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none [@media(hover:none)]:opacity-100"
              />
            }
          >
            <SparklesIcon aria-hidden="true" className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top">Regenerate title</TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}
