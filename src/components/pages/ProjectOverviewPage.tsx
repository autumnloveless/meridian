import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Project } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem } from "@/components/tasks/TaskView";
import { useProjectAssigneeOptions } from "@/components/tasks/useProjectAssigneeOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { handleTextareaTabKey } from "@/lib/utils";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";
import { ensureDefaultBuckets } from "@/components/tasks/organizationTasksShared";


export const ProjectOverviewPage = () => {
  const { orgId, projectId } = useParams();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const profile = useAccount(Account, {
    resolve: { profile: true },
    select: (account) => (account.$isLoaded ? account.profile : null),
  });

  const project = useCoState(Project, projectId, {
    resolve: {
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
  const remoteOverview = project.$isLoaded ? project.overview : "";

  const assigneeOptions = useProjectAssigneeOptions(project.$isLoaded ? project : null);

  const [draftOverview, setDraftOverview] = useState("");
  const [lastSavedOverview, setLastSavedOverview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const latestOverviewRef = useRef("");

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

  const saveOverview = useCallback(async () => {
    if (!project.$isLoaded) return;

    const nextOverview = latestOverviewRef.current;
    if (nextOverview === lastSavedOverview) return;

    setIsSaving(true);
    try {
      (project as any).$jazz.set("overview", nextOverview);
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
      if (bucket.type !== "Active") continue;
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
  const projectTaskPrefix = project.$isLoaded ? project.project_key : "TASK";

  const taskViewItems = useMemo<TaskViewItem[]>(() => {
    return activeTasks.map((entry) => ({
      id: entry.task.$jazz.id,
      summary: entry.task.summary,
      type: entry.task.type,
      status: entry.task.status,
      order: entry.task.order,
      taskKey: getTaskDisplayId(entry.task, projectTaskPrefix),
      taskHref:
        orgId && projectId
          ? `/organizations/${orgId}/projects/${projectId}/tasks/${entry.task.$jazz.id}`
          : undefined,
      bucketName: entry.bucketName,
      bucketType: entry.bucket.type,
      projectLabel: project.$isLoaded ? project.name : "Project",
      projectHref:
        orgId && projectId
          ? `/organizations/${orgId}/projects/${projectId}/tasks/list`
          : undefined,
      assigneeInitial:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? (entry.task.assigned_to.name[0] ?? "?").toUpperCase()
          : "?",
      assigneeName:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? entry.task.assigned_to.name
          : undefined,
    }));
  }, [activeTasks, orgId, project, projectId, projectTaskPrefix]);

  const effectiveTaskView = isDesktop ? taskView : "list";

  const handleTaskMove = ({
    taskId,
    destinationStatus,
    overTaskId,
  }: {
    taskId: string;
    destinationStatus: "Backlog" | "In Progress" | "In-Review" | "Completed" | "Cancelled";
    overTaskId: string | null;
  }) => {
    const activeEntry = activeTasks.find((entry) => entry.task.$jazz.id === taskId);
    if (!activeEntry) return;

    if (activeEntry.task.status === destinationStatus) return;
    activeEntry.task.$jazz.set("status", destinationStatus);

    const destinationEntries = activeTasks
      .filter((entry) => entry.task.status === destinationStatus)
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

  const archiveCompletedTasks = () => {
    activeTasks
      .filter((entry) => entry.task.status === "Completed" || entry.task.status === "Cancelled")
      .forEach((entry) => {
        entry.task.$jazz.set("status", "Archived");
      });
  };

  const completedTaskCount = activeTasks.filter(
    (entry) => entry.task.status === "Completed" || entry.task.status === "Cancelled"
  ).length;

  if (!projectId) return <div className="text-sm text-red-700">Invalid project URL.</div>;
  if (!project.$isLoaded) return <div className="text-sm text-muted-foreground">Loading project summary...</div>;

  return (
    <section className="space-y-3 p-1 sm:space-y-4">
      <div className="hero-gradient-soft relative overflow-hidden rounded-2xl border border-primary/20 px-4 py-4 sm:px-5">
        <div className="absolute -right-10 -top-10 size-36 rounded-full bg-white/25 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 left-8 size-44 rounded-full bg-primary/18 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          <p className="eyebrow-label text-foreground/80">Project Pulse</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground sm:text-3xl">Project Summary</h1>
          <p className="mt-1 text-sm text-foreground/80">Context, notes, and active execution in one focused view.</p>
        </div>
      </div>

      <header>
        <h2 className="text-lg font-semibold">Overview Notes</h2>
        <p className="text-sm text-muted-foreground">Quick project context and status notes.</p>
      </header>

      <textarea
        value={draftOverview}
        onChange={(event) => {
          setDraftOverview(event.target.value);
          setSaveError(null);
        }}
        onKeyDown={(event) => {
          handleTextareaTabKey(event, setDraftOverview);
          setSaveError(null);
        }}
        onBlur={() => {
          void saveOverview();
        }}
        className="min-h-[300px] w-full resize-y rounded-md border bg-background p-3 text-sm"
        placeholder="Write project context and status updates..."
      />

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

      <section className="surface-feature space-y-3 rounded-md border border-border/70 bg-card/90 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Active Tasks</h3>
            <p className="text-xs text-muted-foreground">Track project backlog and in-flight work.</p>
          </div>
          {isDesktop ? (
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button type="button" size="sm" variant={taskView === "list" ? "default" : "ghost"} onClick={() => setTaskView("list")}>List</Button>
              <Button type="button" size="sm" variant={taskView === "board" ? "default" : "ghost"} onClick={() => setTaskView("board")}>Kanban</Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_auto_auto]">
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
          <Button type="button" variant="outline" onClick={archiveCompletedTasks} disabled={completedTaskCount === 0}>
            Archive Completed Tasks
          </Button>
        </div>

        <TaskView
          tasks={taskViewItems}
          viewType={effectiveTaskView}
          combineBucketsByType
          title="Active Tasks"
          onTaskSelect={setSelectedTaskId}
          onTaskMove={handleTaskMove}
        />
      </section>

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        assigneeOptions={assigneeOptions}
        taskIdPrefix={projectTaskPrefix}
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