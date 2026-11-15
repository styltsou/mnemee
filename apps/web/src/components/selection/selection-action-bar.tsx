import { useState } from "react";
import { useDeleteShortcut } from "@/hooks/use-delete-shortcut";
import {
  AlignCenterHorizontalIcon,
  AlignCenterVerticalIcon,
  AlignEndHorizontalIcon,
  AlignEndVerticalIcon,
  AlignStartHorizontalIcon,
  AlignStartVerticalIcon,
  FolderInputIcon,
  HeartIcon,
  LayoutGridIcon,
  MoreHorizontalIcon,
  PanelsTopLeftIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShortcutKey } from "@/components/ui/shortcut-key";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FLOATING_GLASS_BACKDROP_CLASS,
  GLASS_FRAME_CLASS,
  GLASS_SURFACE_CLASS,
} from "@/lib/glass";
import { cn } from "@/lib/utils";
import {
  SELECTION_EASE,
  SELECTION_ENTER_DURATION,
  SELECTION_EXIT_DURATION,
} from "./selection-motion";

type SelectionActionBarProps = {
  count: number;
  layoutCount?: number;
  surface: "inbox" | "canvas" | "grid";
  variant?: "floating" | "header";
  onClear: () => void;
  onMove?: () => void;
  moveDisabled?: boolean;
  onDelete?: () => void;
  onArrange?: () => void;
  onCompact?: () => void;
  onMakeRow?: (alignment: "start" | "center" | "end") => void;
  onMakeColumn?: (alignment: "start" | "center" | "end") => void;
  className?: string;
  showActions?: boolean;
};

const BUTTON_GROUP_SURFACE_CLASS = cn(
  "relative z-10 rounded-md",
  GLASS_SURFACE_CLASS,
);

export function SelectionActionBar({
  count,
  layoutCount,
  surface,
  variant = "floating",
  onClear,
  onMove,
  moveDisabled = false,
  onDelete,
  onArrange,
  onCompact,
  onMakeRow,
  onMakeColumn,
  className,
  showActions = true,
}: SelectionActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  useDeleteShortcut({
    enabled: count > 0 && Boolean(onDelete) && !deleteDialogOpen,
    onDelete: () => setDeleteDialogOpen(true),
  });
  const reduceMotion = useReducedMotion();
  const isHeader = variant === "header";
  const ActionGroup = isHeader ? "div" : ButtonGroup;
  const restingState = { transform: "translateY(0px)" };
  const hiddenState = {
    transform: reduceMotion ? "translateY(0px)" : "translateY(-4px)",
  };

  return (
    <>
      <AnimatePresence>
        {count >= 1 && showActions ? (
          <motion.div
            key="selection-bar"
            initial={isHeader ? false : hiddenState}
            animate={restingState}
            role="toolbar"
            aria-label="Selection actions"
            className="flex w-fit flex-col items-center gap-1"
            transition={{
              duration: reduceMotion ? 0 : SELECTION_ENTER_DURATION,
              ease: SELECTION_EASE,
            }}
          >
            <div
              className={cn(
                "relative w-fit",
                !isHeader && FLOATING_GLASS_BACKDROP_CLASS,
              )}
            >
              <div
                className={cn(
                  "relative z-10",
                  isHeader ? "flex items-center gap-2" : "rounded-lg p-1",
                  !isHeader && GLASS_FRAME_CLASS,
                  className,
                )}
              >
                {isHeader ? (
                  <span
                    className="text-sm font-medium whitespace-nowrap tabular-nums"
                    role="status"
                  >
                    {count}
                    <span className="sr-only sm:not-sr-only"> selected</span>
                  </span>
                ) : null}
                <div
                  className={cn(
                    "flex shrink-0 items-center",
                    isHeader && "gap-1",
                  )}
                >
                  <div
                    className={
                      isHeader ? undefined : BUTTON_GROUP_SURFACE_CLASS
                    }
                  >
                    <ActionGroup
                      className={
                        isHeader ? "flex items-center gap-1" : undefined
                      }
                    >
                      {onMove ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size={isHeader ? "icon-sm" : "default"}
                                aria-label={
                                  surface === "inbox"
                                    ? "Move to collection"
                                    : "Move selected"
                                }
                                disabled={moveDisabled}
                                onClick={onMove}
                              />
                            }
                          >
                            <FolderInputIcon />
                          </TooltipTrigger>
                          <TooltipContent>
                            {surface === "inbox"
                              ? "Move to collection"
                              : "Move selected"}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <PlaceholderAction
                          label={
                            surface === "inbox" ? "Move to collection" : "Move"
                          }
                          disabled
                        >
                          <FolderInputIcon />
                        </PlaceholderAction>
                      )}
                      {!isHeader ? (
                        <>
                          <ButtonGroupSeparator />
                          <PlaceholderAction label="Favorite">
                            <HeartIcon />
                          </PlaceholderAction>
                          <ButtonGroupSeparator />
                        </>
                      ) : null}
                      {onDelete ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                aria-label="Delete selected"
                                size={isHeader ? "icon-sm" : "default"}
                                aria-keyshortcuts="Delete"
                                onClick={() => setDeleteDialogOpen(true)}
                              />
                            }
                          >
                            <Trash2Icon />
                          </TooltipTrigger>
                          <TooltipContent>
                            Delete selected <ShortcutKey>Del</ShortcutKey>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <PlaceholderAction label="Delete">
                          <Trash2Icon />
                        </PlaceholderAction>
                      )}
                    </ActionGroup>
                  </div>
                  <AnimatePresence initial={false}>
                    {surface === "canvas" && (layoutCount ?? count) >= 2 ? (
                      <motion.div
                        key="layout-actions"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{
                          opacity: 0,
                          width: 0,
                          transition: {
                            duration: reduceMotion
                              ? 0
                              : SELECTION_EXIT_DURATION,
                            ease: SELECTION_EASE,
                          },
                        }}
                        transition={{
                          duration: reduceMotion ? 0 : SELECTION_ENTER_DURATION,
                          ease: SELECTION_EASE,
                        }}
                        className="-m-1 overflow-hidden p-1"
                      >
                        <div className={BUTTON_GROUP_SURFACE_CLASS}>
                          <ButtonGroup>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="Arrange in grid"
                                    onClick={onArrange}
                                  />
                                }
                              >
                                <LayoutGridIcon />
                              </TooltipTrigger>
                              <TooltipContent>Arrange in grid</TooltipContent>
                            </Tooltip>
                            <ButtonGroupSeparator orientation="vertical" />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    aria-label="Compact into columns"
                                    onClick={onCompact}
                                  />
                                }
                              >
                                <PanelsTopLeftIcon />
                              </TooltipTrigger>
                              <TooltipContent>
                                Compact into columns
                              </TooltipContent>
                            </Tooltip>
                            <ButtonGroupSeparator orientation="vertical" />
                            <LayoutActionsMenu
                              onMakeRow={onMakeRow}
                              onMakeColumn={onMakeColumn}
                            />
                          </ButtonGroup>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                  <div
                    className={cn(
                      !isHeader && cn(BUTTON_GROUP_SURFACE_CLASS, "ml-1"),
                    )}
                  >
                    <ActionGroup>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size={isHeader ? "icon-sm" : "icon"}
                              aria-label="Clear selection"
                              aria-keyshortcuts={
                                isHeader ? "Escape" : undefined
                              }
                              onClick={onClear}
                            />
                          }
                        >
                          <XIcon />
                        </TooltipTrigger>
                        <TooltipContent>
                          Clear selection{" "}
                          {isHeader ? <ShortcutKey>Esc</ShortcutKey> : null}
                        </TooltipContent>
                      </Tooltip>
                    </ActionGroup>
                  </div>
                </div>
                {!isHeader ? (
                  <div className="flex items-center justify-between px-0 pt-1.5 pr-[3px] pb-0.5 text-[10px] leading-4 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ShortcutKey>Esc</ShortcutKey>
                      <span>to close</span>
                    </span>
                    <span>{count} selected</span>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {onDelete ? (
        <AlertDialog
          open={deleteDialogOpen && count > 0}
          onOpenChange={setDeleteDialogOpen}
        >
          <AlertDialogContent size="sm">
            <AlertDialogBody>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {count} {count === 1 ? "item" : "items"}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {surface !== "inbox"
                    ? "Selected items will be permanently deleted. Folders also delete their contents."
                    : "This action cannot be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
            </AlertDialogBody>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  setDeleteDialogOpen(false);
                  onDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}

function LayoutActionsMenu({
  onMakeRow,
  onMakeColumn,
}: Pick<SelectionActionBarProps, "onMakeRow" | "onMakeColumn">) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="More layout options"
                >
                  <MoreHorizontalIcon />
                </Button>
              }
            />
          }
        >
          More options
        </TooltipTrigger>
        <TooltipContent>More layout options</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        side="bottom"
        surface="solid"
        className="w-48"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Arrange in column</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onMakeColumn?.("start")}>
            <AlignStartVerticalIcon />
            <span>Align start</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMakeColumn?.("center")}>
            <AlignCenterVerticalIcon />
            <span>Align center</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMakeColumn?.("end")}>
            <AlignEndVerticalIcon />
            <span>Align end</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Arrange in row</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onMakeRow?.("start")}>
            <AlignStartHorizontalIcon />
            <span>Align start</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMakeRow?.("center")}>
            <AlignCenterHorizontalIcon />
            <span>Align center</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMakeRow?.("end")}>
            <AlignEndHorizontalIcon />
            <span>Align end</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlaceholderAction({
  label,
  children,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label={label}
            disabled={disabled}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
