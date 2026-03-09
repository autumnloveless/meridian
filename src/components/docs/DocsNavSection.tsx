import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { co } from "jazz-tools";
import { useCoState } from "jazz-tools/react";

import { Document } from "@/schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const DocsNavSection = ({
  to,
  label,
  isActive,
  basePath,
  documents,
  activeDocId,
}: {
  to: string;
  label: string;
  isActive: boolean;
  basePath: string;
  documents: co.loaded<co.List<typeof Document>>;
  activeDocId: string | null;
}) => {
  const navigate = useNavigate();
  const [dropTargetDocId, setDropTargetDocId] = useState<string | null>(null);
  const [isRootDropActive, setIsRootDropActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ docId: string; parentId: string | null; name: string } | null>(null);

  const createPage = async () => {
    const newDocument = Document.create({
      name: "Untitled",
      content: co.richText().create(""),
      children: [],
    });

    if (activeDocId) {
      const parent = documents.find((doc) => doc.$jazz.id === activeDocId);
      if (parent) {
        const loadedParent = await parent.$jazz.ensureLoaded({ resolve: { children: true } });
        if (!loadedParent.children) loadedParent.$jazz.set("children", []);

        const loadedChildrenParent = await loadedParent.$jazz.ensureLoaded({ resolve: { children: true } });
        if (loadedChildrenParent.children && loadedChildrenParent.children.$isLoaded) {
          loadedChildrenParent.children.$jazz.push(newDocument);
        }
      } else {
        documents.$jazz.push(newDocument);
      }
    } else {
      documents.$jazz.push(newDocument);
    }

    navigate(`${basePath}/docs/${newDocument.$jazz.id}`);
  };

  const moveDocument = async (sourceId: string, sourceParentId: string | null, targetParentId: string | null) => {
    if (sourceId === targetParentId) return;
    if (sourceParentId === targetParentId) return;

    const source = await Document.load(sourceId, { resolve: { children: true } });
    if (!source.$isLoaded) return;

    if (sourceParentId) {
      const currentParent = await Document.load(sourceParentId, { resolve: { children: true } });
      if (currentParent.$isLoaded) {
        const loadedCurrentParent = await currentParent.$jazz.ensureLoaded({ resolve: { children: true } });
        if (loadedCurrentParent.children && loadedCurrentParent.children.$isLoaded) {
          loadedCurrentParent.children.$jazz.remove((child) => child.$jazz.id === sourceId);
        }
      }
    } else {
      documents.$jazz.remove((document) => document.$jazz.id === sourceId);
    }

    if (targetParentId) {
      const nextParent = await Document.load(targetParentId, { resolve: { children: true } });
      if (!nextParent.$isLoaded) return;
      const loadedNextParent = await nextParent.$jazz.ensureLoaded({ resolve: { children: true } });
      if (!loadedNextParent.children) loadedNextParent.$jazz.set("children", []);

      const loadedChildrenParent = await loadedNextParent.$jazz.ensureLoaded({ resolve: { children: true } });
      const alreadyChild = loadedChildrenParent.children?.some((child) => child.$jazz.id === sourceId);
      if (!alreadyChild && loadedChildrenParent.children && loadedChildrenParent.children.$isLoaded) {
        loadedChildrenParent.children.$jazz.push(source);
      }
      return;
    }

    const alreadyRoot = documents.some((document) => document.$jazz.id === sourceId);
    if (!alreadyRoot) {
      documents.$jazz.push(source);
    }
  };

  const handleRootDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropTargetDocId(null);
    setIsRootDropActive(false);
    const payload = event.dataTransfer.getData("application/json");
    if (!payload) return;

    try {
      const parsed = JSON.parse(payload) as { sourceId: string; sourceParentId: string | null };
      void moveDocument(parsed.sourceId, parsed.sourceParentId, null);
    } catch {
      // Ignore malformed drag payload.
    }
  };

  const renameDocument = async (docId: string) => {
    const document = await Document.load(docId);
    if (!document.$isLoaded) return;

    const nextName = window.prompt("Rename page", document.name)?.trim();
    if (!nextName || nextName === document.name) return;

    document.$jazz.set("name", nextName);
  };

  const requestDeleteDocument = async (docId: string, parentId: string | null) => {
    const document = await Document.load(docId);
    if (!document.$isLoaded) return;

    setDeleteTarget({ docId, parentId, name: document.name });
  };

  const confirmDeleteDocument = async () => {
    if (!deleteTarget) return;

    const { docId, parentId } = deleteTarget;

    if (parentId) {
      const parent = await Document.load(parentId, { resolve: { children: true } });
      if (parent.$isLoaded) {
        const loadedParent = await parent.$jazz.ensureLoaded({ resolve: { children: true } });
        if (loadedParent.children && loadedParent.children.$isLoaded) {
          loadedParent.children.$jazz.remove((child) => child.$jazz.id === docId);
        }
      }
    } else {
      documents.$jazz.remove((item) => item.$jazz.id === docId);
    }

    if (activeDocId === docId) {
      navigate(`${basePath}/docs`, { replace: true });
    }

    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <div className="relative w-full">
          <NavLink
            to={to}
            className={({ isActive: isLinkActive }) =>
              cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start pr-9",
                isLinkActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )
            }
          >
            {label}
          </NavLink>

          {isActive && (
            <button
              type="button"
              aria-label="Create page"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void createPage();
              }}
              className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isActive && (
        <div
          className="relative ml-4 max-h-[45vh] overflow-auto border-l pl-2"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetDocId(null);
            setIsRootDropActive(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
            setIsRootDropActive(false);
          }}
          onDrop={handleRootDrop}
        >
          {isRootDropActive && (
            <div className="pointer-events-none absolute left-2 right-2 top-1 h-0.5 rounded bg-primary/80" />
          )}

          {documents.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No pages yet.</p>
          ) : (
            <ul className="space-y-1 py-1">
              {documents.map((document) => (
                <DocsTreeItem
                  key={document.$jazz.id}
                  basePath={basePath}
                  docId={document.$jazz.id}
                  activeDocId={activeDocId}
                  parentId={null}
                  ancestorIds={[]}
                  onMove={moveDocument}
                  onRename={renameDocument}
                  onDelete={requestDeleteDocument}
                  dropTargetDocId={dropTargetDocId}
                  onDropTargetChange={setDropTargetDocId}
                  onRootDropActiveChange={setIsRootDropActive}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Delete \"${deleteTarget.name}\" and all nested pages? This action cannot be undone.`
                : "Delete this page?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void confirmDeleteDocument()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DocsTreeItem = ({
  basePath,
  docId,
  activeDocId,
  parentId,
  ancestorIds,
  onMove,
  onRename,
  onDelete,
  dropTargetDocId,
  onDropTargetChange,
  onRootDropActiveChange,
}: {
  basePath: string;
  docId: string;
  activeDocId: string | null;
  parentId: string | null;
  ancestorIds: string[];
  onMove: (sourceId: string, sourceParentId: string | null, targetParentId: string | null) => Promise<void>;
  onRename: (docId: string) => Promise<void>;
  onDelete: (docId: string, parentId: string | null) => Promise<void>;
  dropTargetDocId: string | null;
  onDropTargetChange: (docId: string | null) => void;
  onRootDropActiveChange: (active: boolean) => void;
}) => {
  const document = useCoState(Document, docId, {
    resolve: {
      children: {
        $each: true,
      },
    },
  });

  if (!document.$isLoaded) return null;

  const isActive = activeDocId === docId;
  const isDropTarget = dropTargetDocId === docId;
  const children = document.children ?? [];

  return (
    <li className="space-y-1">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <NavLink
            to={`${basePath}/docs/${docId}`}
            title={document.name}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData(
                "application/json",
                JSON.stringify({ sourceId: docId, sourceParentId: parentId }),
              );
            }}
            onDragEnd={() => {
              onDropTargetChange(null);
              onRootDropActiveChange(false);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.dataTransfer.dropEffect = "move";
              onRootDropActiveChange(false);
              onDropTargetChange(docId);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget.contains(event.relatedTarget as Node)) return;
              if (dropTargetDocId === docId) {
                onDropTargetChange(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDropTargetChange(null);
              onRootDropActiveChange(false);

              const payload = event.dataTransfer.getData("application/json");
              if (!payload) return;

              try {
                const parsed = JSON.parse(payload) as { sourceId: string; sourceParentId: string | null };

                if (parsed.sourceId === docId) return;
                if (ancestorIds.includes(parsed.sourceId)) return;

                void onMove(parsed.sourceId, parsed.sourceParentId, docId);
              } catch {
                // Ignore malformed drag payload.
              }
            }}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1 text-xs",
              isDropTarget && "border-t-2 border-primary",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{document.name}</span>
          </NavLink>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void onRename(docId);
            }}
          >
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-red-700 focus:text-red-700"
            onSelect={(event) => {
              event.preventDefault();
              void onDelete(docId, parentId);
            }}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {children.length > 0 && (
        <ul className="ml-3 border-l pl-2">
          {children.map((child) => (
            <DocsTreeItem
              key={child.$jazz.id}
              basePath={basePath}
              docId={child.$jazz.id}
              activeDocId={activeDocId}
              parentId={docId}
              ancestorIds={[...ancestorIds, docId]}
              onMove={onMove}
              onRename={onRename}
              onDelete={onDelete}
              dropTargetDocId={dropTargetDocId}
              onDropTargetChange={onDropTargetChange}
              onRootDropActiveChange={onRootDropActiveChange}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
