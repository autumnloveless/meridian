import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Account, Organization, Task as TaskSchema } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";
import {
  collectOrganizationTaskContainers,
  ensureDefaultBuckets,
  type LoadedOrganization,
} from "@/components/tasks/organizationTasksShared";

type LoadedTask = co.loaded<typeof TaskSchema>;

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-muted text-foreground" },
  { status: "In Progress", title: "In Progress", tone: "bg-primary/15 text-primary" },
  { status: "In-Review", title: "In-Review", tone: "bg-accent/25 text-foreground" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-500/18 text-emerald-700 dark:text-emerald-300" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-destructive/15 text-destructive" },
] as const;

const COLUMN_PREFIX = "org-overview-col:";
const TASK_PREFIX = "org-overview-task:";

const columnDndId = (status: string) => `${COLUMN_PREFIX}${status}`;
const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const parseColumnDndId = (value: string) => (value.startsWith(COLUMN_PREFIX) ? value.slice(COLUMN_PREFIX.length) : null);
const parseTaskDndId = (value: string) => (value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null);
const isBoardStatus = (status: string): status is LoadedTask["status"] =>
  boardColumns.some((column) => column.status === status);

const KanbanColumn = ({ status, children }: { status: string; children: React.ReactNode }) => {
  const droppable = useDroppable({ id: columnDndId(status) });

  return (
    <div ref={droppable.setNodeRef} className={droppable.isOver ? "shrink-0 rounded-md bg-muted/40 md:shrink" : "shrink-0 rounded-md md:shrink"}>
      {children}
    </div>
  );
};

const KanbanTaskCard = ({
  entry,
  orgId,
  onSelect,
}: {
  entry: { task: LoadedTask; projectId: string | null; taskKeyPrefix: string };
  orgId: string;
  onSelect: (id: string) => void;
}) => {
  const draggable = useDraggable({ id: taskDndId(entry.task.$jazz.id) });
  const style = {
    transform: CSS.Translate.toString(draggable.transform),
  };

  return (
    <button
      ref={draggable.setNodeRef}
      style={style}
      {...draggable.attributes}
      {...draggable.listeners}
      type="button"
      className="w-full rounded-lg border border-border/70 bg-card px-2 py-2 text-left shadow-xs transition-colors hover:bg-muted/50"
      onClick={() => onSelect(entry.task.$jazz.id)}
    >
      <p className="text-sm font-medium">{entry.task.summary}</p>
      <Link
        to={entry.projectId
          ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
          : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`}
        className="text-xs font-medium text-primary hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        {getTaskDisplayId(entry.task, entry.taskKeyPrefix)}
      </Link>
    </button>
  );
};

const KanbanTaskOverlayCard = ({
  entry,
}: {
  entry: { task: LoadedTask; taskKeyPrefix: string };
}) => (
  <div className="w-[280px] max-w-[90vw] rounded-lg border border-border/70 bg-card px-2 py-2 text-left shadow-2xl">
    <p className="text-sm font-medium">{entry.task.summary}</p>
    <p className="text-xs font-medium text-primary">{getTaskDisplayId(entry.task, entry.taskKeyPrefix)}</p>
  </div>
);

export const OrganizationOverviewPage = () => {
  const { orgId } = useParams();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const profile = useAccount(Account, {
    resolve: { profile: true },
    select: (account) => (account.$isLoaded ? account.profile : null),
  });

  const organization = useCoState(Organization, orgId, {
    resolve: {
      overview: true,
      task_buckets: {
        $each: {
          tasks: {
            $each: {
              assigned_to: true,
              details: true,
            },
          },
        },
      },
      projects: {
        $each: {
          task_buckets: {
            $each: {
              tasks: {
                $each: {
                  assigned_to: true,
                  details: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const [draft, setDraft] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!organization.$isLoaded) return;
    const loadedOrganization = organization as LoadedOrganization;
    ensureDefaultBuckets(loadedOrganization);
    loadedOrganization.projects.forEach((project) => ensureDefaultBuckets(project));
  }, [organization]);

  useEffect(() => {
    if (!organization.$isLoaded) return;
    const current = organization.overview.toString();
    setDraft(current);
    setLastSaved(current);
  }, [organization.$isLoaded, organization.$isLoaded ? organization.overview.toString() : ""]);

  useEffect(() => {
    if (!organization.$isLoaded || draft === lastSaved) return;

    const timeout = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const loaded = await organization.$jazz.ensureLoaded({ resolve: { overview: true } });
        loaded.overview.$jazz.applyDiff(draft);
        setLastSaved(draft);
      } finally {
        setIsSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [organization, draft, lastSaved]);

  const activeTasks = useMemo(() => {
    if (!organization.$isLoaded) {
      return [] as Array<{
        bucket: any;
        bucketName: string;
        projectId: string | null;
        projectName: string | null;
        taskKeyPrefix: string;
        task: LoadedTask;
      }>;
    }

    return collectOrganizationTaskContainers(organization as LoadedOrganization)
      .filter((entry) => entry.bucket.type === "Active" && entry.task.status !== "Archived")
      .map((entry) => ({
        bucket: entry.bucket,
        bucketName: entry.bucket.name,
        projectId: entry.projectId,
        projectName: entry.projectName,
        taskKeyPrefix: entry.taskKeyPrefix,
        task: entry.task,
      }))
      .sort((left, right) => left.task.order - right.task.order || left.task.summary.localeCompare(right.task.summary));
  }, [organization]);

  const selectedTaskEntry = useMemo(() => {
    if (!selectedTaskId) return null;
    return activeTasks.find((entry) => entry.task.$jazz.id === selectedTaskId) ?? null;
  }, [activeTasks, selectedTaskId]);

  const draggedTaskEntry = useMemo(() => {
    if (!activeDragTaskId) return null;
    return activeTasks.find((entry) => entry.task.$jazz.id === activeDragTaskId) ?? null;
  }, [activeTasks, activeDragTaskId]);

  const selectedTask = selectedTaskEntry?.task ?? null;

  const columns = useMemo(() => {
    const initial: Record<string, Array<{ bucketName: string; projectId: string | null; taskKeyPrefix: string; task: LoadedTask }>> = {
      Backlog: [],
      "In Progress": [],
      "In-Review": [],
      Completed: [],
      Cancelled: [],
    };

    for (const entry of activeTasks) {
      if (entry.task.status in initial) {
        initial[entry.task.status].push(entry);
      }
    }

    return initial;
  }, [activeTasks]);

  const effectiveTaskView = isDesktop ? taskView : "list";

  const handleKanbanDragStart = (event: DragStartEvent) => {
    const activeTaskId = parseTaskDndId(String(event.active.id));
    setActiveDragTaskId(activeTaskId);
  };

  const handleKanbanDragCancel = (_event: DragCancelEvent) => {
    setActiveDragTaskId(null);
  };

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    setActiveDragTaskId(null);
    const activeTaskId = parseTaskDndId(String(event.active.id));
    const overRawId = event.over ? String(event.over.id) : null;
    if (!activeTaskId || !overRawId) return;

    const activeEntry = activeTasks.find((entry) => entry.task.$jazz.id === activeTaskId);
    if (!activeEntry) return;

    const overTaskId = parseTaskDndId(overRawId);

    const destinationStatus = (() => {
      const columnStatus = parseColumnDndId(overRawId);
      if (columnStatus) return columnStatus;

      if (!overTaskId) return null;
      const overEntry = activeTasks.find((entry) => entry.task.$jazz.id === overTaskId);
      return overEntry ? overEntry.task.status : null;
    })();

    if (!destinationStatus || !isBoardStatus(destinationStatus) || activeEntry.task.status === destinationStatus) return;
    activeEntry.task.$jazz.set("status", destinationStatus);

    const destinationEntries = columns[destinationStatus]
      .filter((entry) => entry.task.$jazz.id !== activeEntry.task.$jazz.id);
    const insertIndex = overTaskId
      ? Math.max(0, destinationEntries.findIndex((entry) => entry.task.$jazz.id === overTaskId))
      : destinationEntries.length;

    const normalizedIndex = overTaskId && insertIndex >= 0 ? insertIndex : destinationEntries.length;
    destinationEntries.splice(normalizedIndex, 0, activeEntry);
    destinationEntries.forEach((entry, index) => {
      entry.task.$jazz.set("order", index + 1);
    });
  };

  if (!orgId) return <div className="text-sm text-red-700">Invalid organization URL.</div>;
  if (!organization.$isLoaded) return <div className="text-sm text-muted-foreground">Loading organization summary...</div>;

  return (
    <section className="space-y-3 p-1 sm:space-y-4">
      <div className="hero-gradient-soft relative overflow-hidden rounded-2xl border border-primary/20 px-4 py-4 sm:px-5">
        <div className="absolute -right-10 -top-10 size-36 rounded-full bg-white/25 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 left-8 size-44 rounded-full bg-primary/18 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          <p className="eyebrow-label text-foreground/80">Organization Pulse</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground sm:text-3xl">Organization Summary</h1>
          <p className="mt-1 text-sm text-foreground/80">Shared context and delivery momentum across teams and projects.</p>
        </div>
      </div>

      <header>
        <h2 className="text-lg font-semibold">Overview Notes</h2>
        <p className="text-sm text-muted-foreground">Shared context and status for this organization.</p>
      </header>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-[300px] w-full resize-y rounded-md border bg-background p-3 text-sm"
        placeholder="Write an overview for this organization..."
      />

      <p className="text-xs text-muted-foreground">{isSaving ? "Saving..." : draft === lastSaved ? "All changes saved" : "Unsaved changes"}</p>

      <section className="surface-feature space-y-3 rounded-md border border-border/70 bg-card/90 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Active Tasks</h3>
            <p className="text-xs text-muted-foreground">Track organization backlog and work in progress.</p>
          </div>
          {isDesktop ? (
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button type="button" size="sm" variant={taskView === "list" ? "default" : "ghost"} onClick={() => setTaskView("list")}>List</Button>
              <Button type="button" size="sm" variant={taskView === "kanban" ? "default" : "ghost"} onClick={() => setTaskView("kanban")}>Kanban</Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_auto]">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value as "Task" | "Bug")}
          >
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
          </select>
          <Input
            value={taskSummary}
            onChange={(event) => setTaskSummary(event.target.value)}
            placeholder="Add a task to backlog"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const backlog = organization.task_buckets.find((bucket) => bucket.type === "Backlog") ?? organization.task_buckets[0];
              if (!backlog || !profile || !taskSummary.trim()) return;

              backlog.tasks.$jazz.push({
                ...allocateTaskId(organization),
                summary: taskSummary.trim(),
                type: taskType,
                assigned_to: profile,
                status: "Backlog",
                details: "",
                custom_fields: {},
                order: backlog.tasks.length + 1,
                tags: [],
              });
              setTaskSummary("");
            }}
          />
          <Button
            type="button"
            onClick={() => {
              const backlog = organization.task_buckets.find((bucket) => bucket.type === "Backlog") ?? organization.task_buckets[0];
              if (!backlog || !profile || !taskSummary.trim()) return;

              backlog.tasks.$jazz.push({
                ...allocateTaskId(organization),
                summary: taskSummary.trim(),
                type: taskType,
                assigned_to: profile,
                status: "Backlog",
                details: "",
                custom_fields: {},
                order: backlog.tasks.length + 1,
                tags: [],
              });
              setTaskSummary("");
            }}
            disabled={!profile || !taskSummary.trim()}
          >
            Add to Backlog
          </Button>
        </div>

        {effectiveTaskView === "list" ? (
          <>
            <div className="space-y-2 md:hidden">
              {activeTasks.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/80 bg-background/70 px-3 py-4 text-xs text-muted-foreground">
                  No active tasks yet.
                </div>
              ) : (
                activeTasks.map((entry) => (
                  <button
                    key={entry.task.$jazz.id}
                    type="button"
                    className="w-full rounded-md border border-border/70 bg-card px-3 py-2 text-left"
                    onClick={() => setSelectedTaskId(entry.task.$jazz.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-medium text-foreground">{entry.task.summary}</p>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs uppercase text-muted-foreground">{entry.task.status}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                      <Link
                        to={entry.projectId
                          ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
                          : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`}
                        className="font-semibold text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {getTaskDisplayId(entry.task, entry.taskKeyPrefix)}
                      </Link>
                      <span className="uppercase text-muted-foreground">{entry.task.type}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.projectId && entry.projectName ? (
                        <>
                          <Link
                            to={`/organizations/${orgId}/projects/${entry.projectId}/tasks/list`}
                            className="font-medium text-primary hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {entry.projectName}
                          </Link>{" "}
                          - {entry.bucketName}
                        </>
                      ) : (
                        <>Organization - {entry.bucketName}</>
                      )}
                    </p>
                  </button>
                ))
              )}
            </div>

            <div className="hidden overflow-hidden rounded-md border md:block">
              <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-28 px-2 py-1 text-left">Key</th>
                  <th className="px-2 py-1 text-left">Summary</th>
                  <th className="w-36 px-2 py-1 text-left">Project</th>
                  <th className="w-24 px-2 py-1 text-left">Type</th>
                  <th className="w-24 px-2 py-1 text-left">Status</th>
                  <th className="w-24 px-2 py-1 text-left">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-xs text-muted-foreground">No active tasks yet.</td>
                  </tr>
                ) : (
                  activeTasks.map((entry) => (
                    <tr key={entry.task.$jazz.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setSelectedTaskId(entry.task.$jazz.id)}>
                      <td className="px-2 py-1 text-xs font-semibold text-primary">
                        <Link
                          to={entry.projectId
                            ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
                            : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`}
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {getTaskDisplayId(entry.task, entry.taskKeyPrefix)}
                        </Link>
                      </td>
                      <td className="px-2 py-1">{entry.task.summary}</td>
                      <td className="px-2 py-1 text-xs text-primary">
                        {entry.projectId && entry.projectName ? (
                          <Link
                            to={`/organizations/${orgId}/projects/${entry.projectId}`}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {entry.projectName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Organization</span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-xs uppercase">{entry.task.type}</td>
                      <td className="px-2 py-1 text-xs uppercase">{entry.task.status}</td>
                      <td className="px-2 py-1 text-xs text-muted-foreground">{entry.bucketName}</td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleKanbanDragStart}
            onDragCancel={handleKanbanDragCancel}
            onDragEnd={handleKanbanDragEnd}
          >
            <div className="overflow-x-auto pb-2">
              <div className="flex min-w-max snap-x snap-mandatory gap-3 md:grid md:min-w-0 md:grid-cols-2 xl:grid-cols-5">
                {boardColumns.map((column) => (
                  <KanbanColumn key={column.status} status={column.status}>
                    <Card className="h-[calc(100dvh-17rem)] w-[88vw] min-w-[18rem] shrink-0 snap-start border border-border/70 bg-card/85 py-0 sm:w-[80vw] md:h-[calc(100vh-16rem)] md:w-auto md:min-w-0 md:shrink">
                      <CardHeader className="gap-2 border-b border-border/70 px-3 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-semibold text-foreground">{column.title}</CardTitle>
                          <Badge className={`h-5 px-1.5 text-xs ${column.tone}`}>{columns[column.status].length}</Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2 pt-2">
                        {columns[column.status].length === 0 ? (
                          <div className="rounded border border-dashed border-border/80 bg-background/70 p-3 text-xs text-muted-foreground">No tasks</div>
                        ) : (
                          columns[column.status].map((entry) => (
                            <KanbanTaskCard
                              key={entry.task.$jazz.id}
                              entry={entry}
                              orgId={orgId}
                              onSelect={setSelectedTaskId}
                            />
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </KanbanColumn>
                ))}
              </div>
            </div>
            <DragOverlay>
              {draggedTaskEntry ? <KanbanTaskOverlayCard entry={draggedTaskEntry} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        taskIdPrefix={selectedTaskEntry?.taskKeyPrefix}
        taskHref={selectedTaskEntry
          ? (selectedTaskEntry.projectId
            ? `/organizations/${orgId}/projects/${selectedTaskEntry.projectId}/tasks/${selectedTaskEntry.task.$jazz.id}`
            : `/organizations/${orgId}/tasks/${selectedTaskEntry.task.$jazz.id}`)
          : undefined}
        onArchive={() => {
          if (!selectedTask) return;
          selectedTask.$jazz.set("status", "Archived");
        }}
        onDelete={() => {
          if (!selectedTaskEntry) return;
          const bucket = selectedTaskEntry.bucket as any;
          const nextTasks = bucket.tasks.filter((candidate: any) => candidate.$jazz.id !== selectedTaskEntry.task.$jazz.id);
          bucket.tasks.$jazz.applyDiff(nextTasks);
          setSelectedTaskId(null);
        }}
        onClose={() => setSelectedTaskId(null)}
      />
    </section>
  );
};
