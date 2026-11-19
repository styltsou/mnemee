import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
} from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 touch-manipulation items-center justify-center rounded-lg border text-sm font-medium whitespace-nowrap outline-none select-none transition-[background,color,border-color,box-shadow,scale] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:active:not-disabled:not-aria-disabled:not-focus-visible:scale-[0.985] in-data-[slot=button-group]:active:scale-100! motion-reduce:transition-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "disabled:opacity-80 [--control-primary-top:#303030] [--control-primary-bottom:#202020] [--control-primary-hover-top:#3a3a3a] [--control-primary-hover-bottom:#2c2c2c] [--control-primary-edge:#202020] [--control-primary-foreground:#ffffff] border-(--control-primary-edge) bg-linear-to-b from-(--control-primary-top) to-(--control-primary-bottom) font-semibold text-(--control-primary-foreground) shadow-[0_1px_2px_rgb(0_0_0_/_0.06)] hover:from-(--control-primary-hover-top) hover:to-(--control-primary-hover-bottom) dark:[--control-primary-top:#ffffff] dark:[--control-primary-bottom:#e5e5e5] dark:[--control-primary-hover-top:#ffffff] dark:[--control-primary-hover-bottom:#eeeeee] dark:[--control-primary-edge:#c9c9c9] dark:[--control-primary-foreground:#171717] dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.16)]",
        outline:
          "[--control-outline-surface:oklch(1_0_0)] [--control-outline-hover:oklch(0.975_0_0)] [--control-outline-edge:oklch(0.9_0_0)] [--control-surface:var(--control-outline-surface)] [--control-surface-hover:var(--control-outline-hover)] border-(--control-outline-edge) bg-(--control-surface) text-foreground hover:bg-(--control-surface-hover) aria-expanded:bg-(--control-surface-hover) active:not-disabled:bg-(--control-surface-hover) dark:[--control-outline-surface:oklch(0.19_0_0)] dark:[--control-outline-hover:oklch(0.225_0_0)] dark:[--control-outline-edge:oklch(1_0_0_/_12%)]",
        secondary:
          "[--control-secondary-surface:oklch(0.97_0_0)] [--control-secondary-hover:oklch(0.95_0_0)] [--control-secondary-edge:oklch(0.88_0_0)] [--control-surface:var(--control-secondary-surface)] [--control-surface-hover:var(--control-secondary-hover)] border-(--control-secondary-edge) bg-(--control-surface) text-foreground hover:bg-(--control-surface-hover) aria-expanded:bg-(--control-surface-hover) active:not-disabled:bg-(--control-surface-hover) dark:[--control-secondary-surface:oklch(0.255_0_0)] dark:[--control-secondary-hover:oklch(0.275_0_0)] dark:[--control-secondary-edge:oklch(1_0_0_/_14%)]",
        ghost:
          "border-transparent text-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-foreground aria-pressed:bg-secondary aria-pressed:text-foreground data-popup-open:bg-secondary data-popup-open:text-foreground dark:hover:bg-secondary/50 dark:active:bg-secondary/40 dark:aria-pressed:bg-secondary/50",
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/25 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:active:bg-destructive/35 dark:focus-visible:ring-destructive/40",
        "destructive-primary":
          "disabled:opacity-80 border-(--destructive-primary-edge) bg-linear-to-b from-(--destructive-primary-top) to-(--destructive-primary-bottom) font-semibold text-(--destructive-primary-foreground) shadow-[0_1px_2px_rgb(0_0_0_/_0.06)] hover:from-(--destructive-primary-hover-top) hover:to-(--destructive-primary-hover-bottom) dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.16)]",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Trim actual text boxes, rather than the flex row that aligns text and icons.
// Fragments and existing label spans are common at button call sites.
function trimButtonText(children: ReactNode): ReactNode {
  const content: ReactNode[] = [];
  let text = "";
  function flushText() {
    if (!text) return;
    content.push(
      <span
        key={`text-${content.length}`}
        data-slot="button-text"
        className="[text-box:trim-both_cap_alphabetic]"
      >
        {text}
      </span>,
    );
    text = "";
  }
  for (const child of Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
      continue;
    }
    flushText();
    if (isValidElement<{ children?: ReactNode; className?: string }>(child)) {
      if (child.type === Fragment) {
        content.push(
          cloneElement(child, {}, trimButtonText(child.props.children)),
        );
        continue;
      }
      if (child.type === "span") {
        content.push(
          cloneElement(child, {
            className: cn(
              "[text-box:trim-both_cap_alphabetic]",
              child.props.className,
            ),
          }),
        );
        continue;
      }
    }
    content.push(child);
  }
  flushText();
  return content;
}

function Button({
  className,
  variant = "default",
  size = "default",
  pending,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    /** Opt in for server-confirmed actions; leave unset for optimistic actions.
     * Pass false while idle so the spinner space is reserved before submitting. */
    pending?: boolean;
  }) {
  const content = trimButtonText(children);
  const iconOnly = size?.startsWith("icon");
  const hasPendingState = pending !== undefined;
  const motion =
    "transition-[transform,opacity] duration-100 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity";
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || props["aria-busy"] || undefined}
      data-pending={hasPendingState ? Boolean(pending) : undefined}
    >
      {hasPendingState ? (
        <span
          data-slot="button-pending-content"
          className={cn(
            "relative inline-flex items-center justify-center gap-[inherit] [--pending-slot:1.375rem] [--pending-spinner:1rem]",
            (size === "xs" || size === "icon-xs") &&
              "[--pending-slot:1rem] [--pending-spinner:0.75rem]",
            (size === "sm" || size === "icon-sm") &&
              "[--pending-slot:1.125rem] [--pending-spinner:0.875rem]",
            !iconOnly && "px-[calc(var(--pending-slot)/2)]",
          )}
        >
          <span
            aria-hidden="true"
            data-slot="button-spinner"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 flex items-center",
              motion,
              iconOnly ? "inset-x-0 justify-center" : null,
              pending ? "opacity-100" : "opacity-0",
              !iconOnly &&
                !pending &&
                "transform-[translateX(calc(var(--pending-slot)/2))]",
            )}
          >
            <LoaderCircleIcon
              className={cn(
                "block size-(--pending-spinner) origin-center [transform-box:view-box]",
                pending && "motion-safe:animate-spin",
              )}
            />
          </span>
          <span
            data-slot="button-label"
            className={cn(
              "inline-flex items-center justify-center gap-[inherit]",
              motion,
              iconOnly && pending && "opacity-0",
              !iconOnly &&
                pending &&
                "transform-[translateX(calc(var(--pending-slot)/2))]",
            )}
          >
            {content}
          </span>
        </span>
      ) : (
        content
      )}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
