import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Organization, Task as TaskSchema } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem } from "@/components/tasks/TaskView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";
import {
  collectOrganizationTaskContainers,
  ensureDefaultBuckets,
  type LoadedOrganization,
} from "@/components/tasks/organizationTasksShared";

type LoadedTask = co.loaded<typeof TaskSchema>;

export const OrganizationOverviewPage = () => {
  const { orgId } = useParams();
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  const selectedTask = selectedTaskEntry?.task ?? null;

  const taskViewItems = useMemo<TaskViewItem[]>(() => {
    return activeTasks.map((entry) => ({
      id: entry.task.$jazz.id,
      summary: entry.task.summary,
      type: entry.task.type,
      status: entry.task.status,
      order: entry.task.order,
      taskKey: getTaskDisplayId(entry.task, entry.taskKeyPrefix),
      taskHref: entry.projectId
        ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
        : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`,
      bucketName: entry.bucketName,
      bucketType: entry.bucket.type,
      projectLabel: entry.projectName ?? "Organization",
      projectHref: entry.projectId
        ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/list`
        : `/organizations/${orgId}/tasks/list`,
      assigneeInitial:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? (entry.task.assigned_to.name[0] ?? "?").toUpperCase()
          : "?",
      assigneeName:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? entry.task.assigned_to.name
          : undefined,
    }));
  }, [activeTasks, orgId]);

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
