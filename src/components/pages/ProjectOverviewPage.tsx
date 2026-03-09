import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useAccount, useCoState } from "jazz-tools/react";
import {
  DndContext,
  PointerSensor,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Account, Project } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { useProjectAssigneeOptions } from "@/components/tasks/useProjectAssigneeOptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";
import { ensureDefaultBuckets } from "@/components/tasks/organizationTasksShared";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-slate-100 text-slate-700" },
  { status: "In Progress", title: "In Progress", tone: "bg-blue-100 text-blue-700" },
  { status: "In-Review", title: "In-Review", tone: "bg-amber-100 text-amber-800" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-rose-100 text-rose-800" },
] as const;

const COLUMN_PREFIX = "project-overview-col:";
const TASK_PREFIX = "project-overview-task:";

const columnDndId = (status: string) => `${COLUMN_PREFIX}${status}`;
const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const parseColumnDndId = (value: string) => (value.startsWith(COLUMN_PREFIX) ? value.slice(COLUMN_PREFIX.length) : null);
const parseTaskDndId = (value: string) => (value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null);

const KanbanColumn = ({ status, children }: { status: string; children: React.ReactNode }) => {
  const droppable = useDroppable({ id: columnDndId(status) });

  return (
    <div ref={droppable.setNodeRef} className={droppable.isOver ? "rounded-md bg-muted/40" : "rounded-md"}>
      {children}
    </div>
  );
};

const KanbanTaskCard = ({
  entry,
  orgId,
  projectId,
  projectKey,
  onSelect,
}: {
  entry: { task: any };
  orgId?: string;
  projectId?: string;
  projectKey: string;
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
      className="w-full rounded border bg-background px-2 py-2 text-left hover:bg-muted/50"
      onClick={() => onSelect(entry.task.$jazz.id)}
    >
      <p className="text-sm font-medium">{entry.task.summary}</p>
      {orgId && projectId ? (
        <Link
          to={`/organizations/${orgId}/projects/${projectId}/tasks/${entry.task.$jazz.id}`}
          className="text-[11px] text-sky-700 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {getTaskDisplayId(entry.task, projectKey)}
        </Link>
      ) : (
        <p className="text-[11px] text-sky-700">{getTaskDisplayId(entry.task, projectKey)}</p>
      )}
    </button>
  );
};

export const ProjectOverviewPage = () => {
  const { orgId, projectId } = useParams();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const profile = useAccount(Account, {
    resolve: { profile: true },
    select: (account) => (account.$isLoaded ? account.profile : null),
  });

  const project = useCoState(Project, projectId, {
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
    },
  });
  const remoteOverview = project.$isLoaded ? project.overview.toString() : "";

  const assigneeOptions = useProjectAssigneeOptions(project.$isLoaded ? project : null);

  const editor = useCreateBlockNote();
  const [draftOverview, setDraftOverview] = useState("");
  const [lastSavedOverview, setLastSavedOverview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const latestOverviewRef = useRef("");
  const isHydratingEditorRef = useRef(false);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!project.$isLoaded) return;
    ensureDefaultBuckets(project as any);
  }, [project]);

  useEffect(() => {
    latestOverviewRef.current = draftOverview;
  }, [draftOverview]);

  useEffect(() => {
    if (!project.$isLoaded) return;

    setDraftOverview(remoteOverview);
    setLastSavedOverview(remoteOverview);
    setSaveError(null);
  }, [project.$isLoaded, remoteOverview]);

  useEffect(() => {
    if (!project.$isLoaded) return;
    if (remoteOverview === latestOverviewRef.current) return;

    let canceled = false;

    const hydrateEditor = async () => {
      isHydratingEditorRef.current = true;
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(remoteOverview);
        if (canceled) return;
        editor.replaceBlocks(editor.document, blocks.length > 0 ? blocks : []);
      } finally {
        if (!canceled) isHydratingEditorRef.current = false;
      }
    };

    void hydrateEditor();

    return () => {
      canceled = true;
    };
  }, [project.$isLoaded, remoteOverview, editor]);

  const saveOverview = useCallback(async () => {
    if (!project.$isLoaded) return;

    const nextOverview = latestOverviewRef.current;
    if (nextOverview === lastSavedOverview) return;

    setIsSaving(true);
    try {
      const loadedProject = await project.$jazz.ensureLoaded({ resolve: { overview: true } });
      if (!loadedProject.overview.$isLoaded) return;
      loadedProject.overview.$jazz.applyDiff(nextOverview);
      setLastSavedOverview(nextOverview);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save summary.");
    } finally {
      setIsSaving(false);
    }
  }, [project, lastSavedOverview]);

  useEffect(() => {
    if (!project.$isLoaded || draftOverview === lastSavedOverview) return;

    const timeout = window.setTimeout(() => {
      void saveOverview();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [project, draftOverview, lastSavedOverview, saveOverview]);

  const activeTasks = useMemo(() => {
    if (!project.$isLoaded) return [] as Array<{ bucket: any; bucketName: string; task: any }>;

    const tasks: Array<{ bucket: any; bucketName: string; task: any }> = [];
    for (const bucket of project.task_buckets.map((entry) => entry)) {
      for (const task of bucket.tasks.map((entry) => entry)) {
        if (task.status === "Archived") continue;
        tasks.push({ bucket, bucketName: bucket.name, task });
      }
    }

    return tasks.sort((left, right) => left.task.order - right.task.order || left.task.summary.localeCompare(right.task.summary));
  }, [project]);

  const selectedTaskEntry = useMemo(() => {
    if (!selectedTaskId) return null;
    return activeTasks.find((entry) => entry.task.$jazz.id === selectedTaskId) ?? null;
  }, [activeTasks, selectedTaskId]);

  const selectedTask = selectedTaskEntry?.task ?? null;

  const columns = useMemo(() => {
    const initial: Record<string, Array<{ bucketName: string; task: any }>> = {
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

  const handleKanbanDragEnd = (event: DragEndEvent) => {
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

    if (!destinationStatus || activeEntry.task.status === destinationStatus) return;
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

  if (!projectId) return <div className="text-sm text-red-700">Invalid project URL.</div>;
  if (!project.$isLoaded) return <div className="text-sm text-muted-foreground">Loading project summary...</div>;

  return (
    <section className="space-y-3 p-1 sm:space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Project Summary</h2>
        <p className="text-sm text-muted-foreground">Quick project context and status notes.</p>
      </header>

      <div className="h-[36vh] min-h-[260px] max-h-[46vh] overflow-hidden rounded-md border bg-background sm:h-[30vh] sm:max-h-[33vh]">
        <BlockNoteView
          editor={editor}
          onChange={async () => {
            if (isHydratingEditorRef.current) return;

            try {
              const markdown = await editor.blocksToMarkdownLossy(editor.document);
              setDraftOverview(markdown);
              setSaveError(null);
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : "Unable to read summary content.");
            }
          }}
          className="h-full blocknote-readable-links"
        />
      </div>

      <footer className="flex flex-col items-start justify-between gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span>
          {isSaving
            ? "Saving..."
            : draftOverview !== lastSavedOverview
              ? "Unsaved changes"
              : "All changes saved"}
        </span>
        {saveError ? <span className="text-red-700">{saveError}</span> : null}
      </footer>

      <section className="space-y-3 rounded-md border bg-card p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Active Tasks</h3>
            <p className="text-xs text-muted-foreground">Track project backlog and in-flight work.</p>
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
              const backlog = project.task_buckets.find((bucket) => bucket.type === "Backlog") ?? project.task_buckets[0];
              if (!backlog || !profile || !taskSummary.trim()) return;

              backlog.tasks.$jazz.push({
                ...allocateTaskId(project),
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
              const backlog = project.task_buckets.find((bucket) => bucket.type === "Backlog") ?? project.task_buckets[0];
              if (!backlog || !profile || !taskSummary.trim()) return;

              backlog.tasks.$jazz.push({
                ...allocateTaskId(project),
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
          <div className="overflow-hidden rounded-md border">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-28 px-2 py-1 text-left">Key</th>
                  <th className="px-2 py-1 text-left">Summary</th>
                  <th className="w-24 px-2 py-1 text-left">Type</th>
                  <th className="w-24 px-2 py-1 text-left">Status</th>
                  <th className="w-24 px-2 py-1 text-left">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-xs text-muted-foreground">No active tasks yet.</td>
                  </tr>
                ) : (
                  activeTasks.map((entry) => (
                    <tr key={entry.task.$jazz.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setSelectedTaskId(entry.task.$jazz.id)}>
                      <td className="px-2 py-1 text-[11px] font-medium text-sky-700">
                        {orgId && projectId ? (
                          <Link
                            to={`/organizations/${orgId}/projects/${projectId}/tasks/${entry.task.$jazz.id}`}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {getTaskDisplayId(entry.task, project.project_key)}
                          </Link>
                        ) : (
                          getTaskDisplayId(entry.task, project.project_key)
                        )}
                      </td>
                      <td className="px-2 py-1">{entry.task.summary}</td>
                      <td className="px-2 py-1 text-[11px] uppercase">{entry.task.type}</td>
                      <td className="px-2 py-1 text-[11px] uppercase">{entry.task.status}</td>
                      <td className="px-2 py-1 text-xs text-muted-foreground">{entry.bucketName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleKanbanDragEnd}>
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-3">
                {boardColumns.map((column) => (
                  <KanbanColumn key={column.status} status={column.status}>
                    <div className="w-[18rem] rounded-md border bg-muted/20">
                      <div className="flex items-center justify-between border-b px-3 py-2">
                        <p className="text-sm font-semibold">{column.title}</p>
                        <Badge className={`h-5 px-1.5 text-[10px] ${column.tone}`}>{columns[column.status].length}</Badge>
                      </div>
                      <div className="space-y-2 p-2">
                        {columns[column.status].length === 0 ? (
                          <div className="rounded border border-dashed px-2 py-3 text-xs text-muted-foreground">No tasks</div>
                        ) : (
                          columns[column.status].map((entry) => (
                            <KanbanTaskCard
                              key={entry.task.$jazz.id}
                              entry={entry}
                              orgId={orgId}
                              projectId={projectId}
                              projectKey={project.project_key}
                              onSelect={setSelectedTaskId}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </KanbanColumn>
                ))}
              </div>
            </div>
          </DndContext>
        )}
      </section>

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        assigneeOptions={assigneeOptions}
        taskIdPrefix={project.project_key}
        taskHref={
          selectedTask && orgId && projectId
            ? `/organizations/${orgId}/projects/${projectId}/tasks/${selectedTask.$jazz.id}`
            : undefined
        }
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