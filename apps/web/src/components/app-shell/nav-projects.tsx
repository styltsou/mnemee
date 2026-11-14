import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { DeleteCollectionDialog } from "@/components/collections/delete-collection-dialog";
import { isDeleteShortcut } from "@/lib/delete-shortcut";
import { ScrollArea } from "@/components/ui/scroll-area";
import "./nav-projects.css";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavCollection {
  slug: string;
  name: string;
  count: number;
  link: React.ReactElement;
  isActive?: boolean;
}

interface NavProjectsProps {
  workspaceSlug: string;
  collections: NavCollection[];
  isLoading?: boolean;
}

export function NavProjects({
  collections,
  isLoading,
  workspaceSlug,
}: NavProjectsProps) {
  const [deleteTarget, setDeleteTarget] = useState<NavCollection | null>(null);
  if (!isLoading && collections.length === 0 && !deleteTarget) return null;

  return (
    <>
      <SidebarGroup className="min-h-0 flex-1 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Collections</SidebarGroupLabel>
        <ScrollArea
          className="collections-scroll -mr-[calc(var(--app-shell-inset)+var(--app-shell-inset))] min-h-0 flex-1"
          viewportClassName="overscroll-contain"
          contentClassName="pr-[calc(var(--app-shell-inset)+var(--app-shell-inset))]"
          verticalScrollbarClassName="w-2 p-0 opacity-100"
          verticalThumbClassName="w-0.5"
          horizontalScrollbarClassName="hidden"
          role="region"
          aria-label="Collections"
        >
          <SidebarMenu className="gap-1">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex h-8 items-center gap-2 px-2">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-6" />
                    </div>
                  </SidebarMenuItem>
                ))
              : collections.map((item) => (
                  <CollectionItem
                    key={item.slug}
                    item={item}
                    onDelete={() => setDeleteTarget(item)}
                  />
                ))}
          </SidebarMenu>
        </ScrollArea>
      </SidebarGroup>
      {deleteTarget ? (
        <DeleteCollectionDialog
          workspaceSlug={workspaceSlug}
          collection={deleteTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        />
      ) : null}
    </>
  );
}

function CollectionItem({
  item,
  onDelete,
}: {
  item: NavCollection;
  onDelete: () => void;
}) {
  function measureOverflow(event: React.SyntheticEvent<HTMLElement>) {
    const row = event.currentTarget;
    const viewport = row.querySelector<HTMLElement>(
      ".collection-name-viewport",
    );
    const name = row.querySelector<HTMLElement>(".collection-name-text");
    if (!viewport || !name) return;

    const distance = Math.max(0, name.offsetWidth - viewport.clientWidth + 4);
    const overflowing = distance > 0;
    row.style.setProperty("--collection-name-distance", `${distance}px`);
    row.style.setProperty(
      "--collection-name-duration",
      `${Math.max(0.6, distance / 50)}s`,
    );
    row.toggleAttribute("data-name-overflow", overflowing);
  }

  return (
    <SidebarMenuItem data-delete-shortcut-local>
      <SidebarMenuButton
        data-active={item.isActive}
        render={item.link}
        onMouseEnter={measureOverflow}
        onFocus={measureOverflow}
        aria-keyshortcuts="Delete"
        onKeyDown={(event) => {
          if (!isDeleteShortcut(event.nativeEvent)) return;
          event.preventDefault();
          event.stopPropagation();
          onDelete();
        }}
        title={item.name}
      >
        <span className="collection-name-viewport min-w-0 flex-1 overflow-hidden">
          <span className="collection-name-text block w-max whitespace-nowrap">
            {item.name}
          </span>
        </span>
        <span className="shrink-0 translate-y-px text-xs text-sidebar-foreground/40">
          {item.count}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
