import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { useCoState } from "jazz-tools/react";

import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project, Test } from "@/schema";
import {
  deleteTestById,
  findTest,
  flattenTests,
  moveTest,
  type LoadedTest,
} from "@/components/tests/testTreeUtils";

const ITEM_PREFIX = "test:";
const itemDndId = (id: string) => `${ITEM_PREFIX}${id}`;
const parseItemDndId = (value: string) => (value.startsWith(ITEM_PREFIX) ? value.slice(ITEM_PREFIX.length) : null);

const QuickTestPane = ({
  test,
  open,
  onClose,
  onDelete,
  pageHref,
}: {
  test: LoadedTest | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  pageHref?: string;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!open || !test) return null;

  const details = test.details.$isLoaded ? test.details.toString() : "";

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-xl border-l border-border bg-background shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Test</p>
            <h3 className="text-sm font-semibold">{test.name || "Untitled test"}</h3>
          </div>
          <div className="flex items-center gap-2">
            {pageHref ? (
              <Button size="sm" variant="outline" asChild>
                <Link to={pageHref}>Open page</Link>
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" aria-label="Test actions">
                  <MoreHorizontal className="size-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
        </header>

        <div className="space-y-4 overflow-y-auto p-4 pb-8">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
            <Input value={test.name} onChange={(event) => test.$jazz.set("name", event.target.value)} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</span>
              <Input
                type="number"
                min={1}
                value={test.version}
                onChange={(event) => test.$jazz.set("version", Math.max(1, Number(event.target.value || 1)))}
              />
            </label>

            <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={test.is_folder}
                onChange={(event) => test.$jazz.set("is_folder", event.target.checked)}
              />
              Folder
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
            <textarea
              className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={details}
              onChange={(event) => test.details.$isLoaded && test.details.$jazz.applyDiff(event.target.value)}
              placeholder="Write test details"
            />
          </label>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete test"
        description="This will permanently remove the test and its children."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
          onClose();
        }}
      />
    </>
  );
};

const TestRow = ({
  entry,
  orgId,
  projectId,
  onSelect,
  onAddChild,
}: {
  entry: ReturnType<typeof flattenTests>[number];
  orgId: string;
  projectId: string;
  onSelect: (id: string) => void;
  onAddChild: (item: LoadedTest) => void;
}) => {
  const sortable = useSortable({ id: itemDndId(entry.item.$jazz.id) });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      className="cursor-grab border-b border-stone-200 bg-white hover:bg-stone-50"
      onClick={() => onSelect(entry.item.$jazz.id)}
    >
      <td className="px-2 py-1">
        <div style={{ paddingLeft: `${entry.depth * 20}px` }} className="min-w-0">
          <p className="truncate text-[13px] text-stone-800">{entry.item.name}</p>
        </div>
      </td>
      <td className="w-20 px-2 py-1 text-xs text-stone-700">v{entry.item.version}</td>
      <td className="w-24 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-700">{entry.item.is_folder ? "Folder" : "Test"}</td>
      <td className="w-24 px-2 py-1 text-xs text-sky-700">
        <Link
          to={`/organizations/${orgId}/projects/${projectId}/tests/${entry.item.$jazz.id}`}
          className="hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Open
        </Link>
      </td>
      <td className="w-16 px-2 py-1 text-right">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onAddChild(entry.item);
          }}
        >
          <Plus className="size-4" />
        </Button>
      </td>
    </tr>
  );
};

export const ProjectTestsPage = () => {
  const { orgId, projectId } = useParams();
  const [search, setSearch] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const project = useCoState(Project, projectId, {
    resolve: {
      tests: {
        $each: {
          details: true,
          children: {
            $each: {
              details: true,
              children: {
                $each: {
                  details: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const entries = useMemo(() => {
    if (!project.$isLoaded) return [];
    const flattened = flattenTests(project.tests.map((item) => item));
    const q = search.trim().toLowerCase();
    if (!q) return flattened;
    return flattened.filter((entry) => entry.item.name.toLowerCase().includes(q));
  }, [project, search]);

  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.item.$jazz.id, entry])), [entries]);

  const selected = useMemo(() => {
    if (!project.$isLoaded || !selectedTestId) return null;
    return findTest(project.tests.map((item) => item), selectedTestId);
  }, [project, selectedTestId]);

  const createRootTest = () => {
    if (!project.$isLoaded) return;
    const summary = newSummary.trim();
    if (!summary) return;

    project.tests.$jazz.push(
      Test.create({
        name: summary,
        details: "",
        version: 1,
        is_folder: false,
        children: [],
      }),
    );
    setNewSummary("");
  };

  const addChild = (parent: LoadedTest) => {
    if (!parent.children) {
      parent.$jazz.set("children", []);
    }

    (parent.children as any)?.$jazz.push(
      Test.create({
        name: "New sub-test",
        details: "",
        version: 1,
        is_folder: false,
        children: [],
      }),
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!project.$isLoaded) return;

    const activeId = parseItemDndId(String(event.active.id));
    const overId = event.over ? parseItemDndId(String(event.over.id)) : null;
    if (!activeId || !overId || activeId === overId) return;

    const activeEntry = entriesById.get(activeId);
    const overEntry = entriesById.get(overId);
    if (!activeEntry || !overEntry) return;

    moveTest(
      project.tests,
      activeId,
      overId,
      activeEntry.parentId === overEntry.parentId,
      activeEntry.parentId,
      overEntry.parentId,
    );
  };

  if (!orgId || !projectId) {
    return <div className="text-sm text-red-700">Invalid project URL.</div>;
  }

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading tests...</div>;
  }

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-900">Tests</h2>
        <p className="text-xs text-muted-foreground">Drag rows to reorder. Drop onto another row to nest it as a child.</p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-[260px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-9 border-stone-300 pl-7 text-sm sm:h-8"
              placeholder="Search tests"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Input
            className="h-9 sm:h-8"
            placeholder="Add test summary"
            value={newSummary}
            onChange={(event) => setNewSummary(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createRootTest()}
          />

          <Button type="button" onClick={createRootTest}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="overflow-hidden rounded-sm border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-stone-100 text-[10px] uppercase tracking-[0.07em] text-stone-600">
                <tr>
                  <th className="px-2 py-1 text-left">Summary</th>
                  <th className="w-20 px-2 py-1 text-left">Version</th>
                  <th className="w-24 px-2 py-1 text-left">Type</th>
                  <th className="w-24 px-2 py-1 text-left">Details</th>
                  <th className="w-16 px-2 py-1 text-right">Child</th>
                </tr>
              </thead>
              <SortableContext items={entries.map((entry) => itemDndId(entry.item.$jazz.id))} strategy={verticalListSortingStrategy}>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-3 text-xs text-muted-foreground">No tests yet.</td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <TestRow
                        key={entry.item.$jazz.id}
                        entry={entry}
                        orgId={orgId}
                        projectId={projectId}
                        onSelect={setSelectedTestId}
                        onAddChild={addChild}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </div>
      </DndContext>

      <QuickTestPane
        open={Boolean(selected)}
        test={selected}
        pageHref={selected ? `/organizations/${orgId}/projects/${projectId}/tests/${selected.$jazz.id}` : undefined}
        onDelete={() => {
          if (!selected) return;
          deleteTestById(project.tests, selected.$jazz.id);
          setSelectedTestId(null);
        }}
        onClose={() => setSelectedTestId(null)}
      />
    </section>
  );
};