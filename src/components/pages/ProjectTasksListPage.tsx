import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus, Search } from "lucide-react";
import { useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem, type TaskViewListSection, type TaskViewListTaskMovePayload } from "@/components/tasks/TaskView";
import { type LoadedProject, type LoadedTask, type LoadedTaskBucket } from "@/components/tasks/organizationTasksShared";
import { useProjectAssigneeOptions } from "@/components/tasks/useProjectAssigneeOptions";
import { Account, Project, TaskBucket } from "@/schema";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";

type TaskType = "Task" | "Bug";
type DraftTask = {
  summary: string;
  taskType: TaskType;
  bucketId: string;
};

const defaultDraftTask: DraftTask = {
  summary: "",
  taskType: "Task",
  bucketId: "",
};

export const ProjectTasksListPage = () => {
  const { orgId, projectId } = useParams();
  const [createDraft, setCreateDraft] = useState<DraftTask>(defaultDraftTask);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [desktopTaskType, setDesktopTaskType] = useState<TaskType>("Task");
  const [desktopTaskSummary, setDesktopTaskSummary] = useState("");
  const [desktopTargetBucketId, setDesktopTargetBucketId] = useState("");

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

  const loadedProject = project.$isLoaded ? (project as LoadedProject) : null;

  useEffect(() => {
    if (!loadedProject) return;

    const hasActive = loadedProject.task_buckets.some((bucket) => bucket.type === "Active");
    const hasBacklog = loadedProject.task_buckets.some((bucket) => bucket.type === "Backlog");

    if (!hasActive) {
      loadedProject.task_buckets.$jazz.push({
        name: "Active",
        type: "Active",
        order: 0,
        tasks: [],
      });
    }

    if (!hasBacklog) {
      loadedProject.task_buckets.$jazz.push({
        name: "Backlog",
        type: "Backlog",
        order: 9999,
        tasks: [],
      });
    }
  }, [loadedProject]);

  const orderedBuckets = useMemo(() => {
    if (!loadedProject) return [] as LoadedTaskBucket[];

    const active = loadedProject.task_buckets.find((bucket) => bucket.type === "Active");
    const backlog = loadedProject.task_buckets.find((bucket) => bucket.type === "Backlog");
    const custom = loadedProject.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

    const buckets: LoadedTaskBucket[] = [];
    if (active) buckets.push(active);
    buckets.push(...custom);
    if (backlog) buckets.push(backlog);
    return buckets;
  }, [loadedProject]);

  const customBuckets = useMemo(
    () => orderedBuckets.filter((bucket) => bucket.type === "Custom"),
    [orderedBuckets]
  );

  const createTargetBuckets = useMemo(
    () => orderedBuckets.filter((bucket) => bucket.type !== "Active"),
    [orderedBuckets]
  );

  useEffect(() => {
    if (!isCreateDialogOpen || createDraft.bucketId) return;

    const defaultBucket = createTargetBuckets.find((bucket) => bucket.type === "Backlog") ?? createTargetBuckets[0];
    if (!defaultBucket) return;

    setCreateDraft((current) => ({ ...current, bucketId: defaultBucket.$jazz.id }));
  }, [createDraft.bucketId, createTargetBuckets, isCreateDialogOpen]);

  useEffect(() => {
    if (createTargetBuckets.length === 0) {
      if (desktopTargetBucketId) setDesktopTargetBucketId("");
      return;
    }

    const currentExists = createTargetBuckets.some((bucket) => bucket.$jazz.id === desktopTargetBucketId);
    if (currentExists) return;

    const defaultBucket = createTargetBuckets.find((bucket) => bucket.type === "Backlog") ?? createTargetBuckets[0];
    if (defaultBucket) setDesktopTargetBucketId(defaultBucket.$jazz.id);
  }, [createTargetBuckets, desktopTargetBucketId]);

  const assigneeOptions = useProjectAssigneeOptions(loadedProject);
  const projectTaskPrefix = loadedProject ? loadedProject.project_key : "TASK";

  const getBucketTasks = (bucket: LoadedTaskBucket) => bucket.tasks as unknown as LoadedTask[];

  const normalizeTaskOrder = (bucket: LoadedTaskBucket) => {
    getBucketTasks(bucket).forEach((task, index) => {
      const nextOrder = index + 1;
      if (task.order !== nextOrder) {
        task.$jazz.set("order", nextOrder);
      }
    });
  };

  const syncStatusForTargetBucket = (task: LoadedTask, bucketType: LoadedTaskBucket["type"]) => {
    if (bucketType === "Backlog" && task.status !== "Backlog") {
      task.$jazz.set("status", "Backlog");
    }
  };

  const createCustomBucket = () => {
    if (!loadedProject) return;

    const nextIndex = customBuckets.length + 1;
    loadedProject.task_buckets.$jazz.push(
      TaskBucket.create({
        name: `Bucket ${nextIndex}`,
        type: "Custom",
        order: nextIndex,
        tasks: [],
      })
    );
  };

  const renameCustomBucket = (bucketId: string, nextName: string) => {
    if (!loadedProject) return;

    const bucket = loadedProject.task_buckets.find((candidate) => candidate.$jazz.id === bucketId);
    if (!bucket || bucket.type !== "Custom") return;

    const normalized = nextName.trim();
    if (!normalized) return;
    bucket.$jazz.set("name", normalized);
  };

  const removeCustomBucket = (bucketId: string) => {
    if (!loadedProject) return;

    loadedProject.task_buckets.$jazz.remove((bucket) => bucket.$jazz.id === bucketId && bucket.type === "Custom");

    const remaining = loadedProject.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order);

    remaining.forEach((bucket, index) => {
      bucket.$jazz.set("order", index + 1);
    });
  };

  const moveCustomBucket = (bucketId: string, direction: "up" | "down") => {
    if (!loadedProject) return;

    const orderedCustomIds = customBuckets.map((bucket) => bucket.$jazz.id);
    const currentIndex = orderedCustomIds.findIndex((id) => id === bucketId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedCustomIds.length) return;

    const nextIds = [...orderedCustomIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    nextIds.forEach((id, index) => {
      const bucket = loadedProject.task_buckets.find((candidate) => candidate.$jazz.id === id);
      if (bucket && bucket.type === "Custom") {
        bucket.$jazz.set("order", index + 1);
      }
    });
  };

  const createTaskInBucket = (bucketId: string, summary: string, taskType: TaskType) => {
    if (!profile || !loadedProject) return;

    const bucket = loadedProject.task_buckets.find((candidate) => candidate.$jazz.id === bucketId);
    if (!bucket) return;

    const normalizedSummary = summary.trim();
    if (!normalizedSummary) return;

    bucket.tasks.$jazz.push({
      ...allocateTaskId(loadedProject),
      summary: normalizedSummary,
      type: taskType,
      assigned_to: profile,
      status: "Backlog",
      details: "",
      custom_fields: {},
      order: bucket.tasks.length + 1,
      tags: [],
    });
  };

  const createTaskFromDesktopBar = () => {
    if (!desktopTargetBucketId) return;
    createTaskInBucket(desktopTargetBucketId, desktopTaskSummary, desktopTaskType);
    setDesktopTaskSummary("");
  };

  const submitCreateTask = () => {
    if (!createDraft.bucketId) return;
    createTaskInBucket(createDraft.bucketId, createDraft.summary, createDraft.taskType);
    setIsCreateDialogOpen(false);
    setCreateDraft((current) => ({ ...current, summary: "" }));
  };

  const openCreateDialog = (taskType: TaskType) => {
    setCreateDraft((current) => ({
      ...current,
      taskType,
      summary: "",
      bucketId:
        current.bucketId ||
        createTargetBuckets.find((bucket) => bucket.type === "Backlog")?.$jazz.id ||
        createTargetBuckets[0]?.$jazz.id ||
        "",
    }));
    setIsCreateDialogOpen(true);
  };

  const moveTask = ({ taskId, sourceBucketId, targetBucketId, targetIndex }: TaskViewListTaskMovePayload) => {
    if (!loadedProject) return;

    const sourceBucket = loadedProject.task_buckets.find((bucket) => bucket.$jazz.id === sourceBucketId);
    const targetBucket = loadedProject.task_buckets.find((bucket) => bucket.$jazz.id === targetBucketId);
    if (!sourceBucket || !targetBucket) return;

    const sourceIndex = sourceBucket.tasks.findIndex((task) => task.$jazz.id === taskId);
    if (sourceIndex < 0) return;

    if (sourceBucket.$jazz.id === targetBucket.$jazz.id) {
      const normalizedTargetIndex = Math.min(targetIndex, Math.max(sourceBucket.tasks.length - 1, 0));
      if (sourceIndex === normalizedTargetIndex) return;

      sourceBucket.tasks.$jazz.applyDiff(arrayMove([...sourceBucket.tasks], sourceIndex, normalizedTargetIndex));
      normalizeTaskOrder(sourceBucket);
      return;
    }

    const removed = sourceBucket.tasks.$jazz.splice(sourceIndex, 1);
    const movedTask = removed[0];
    if (!movedTask) return;

    const insertAt = Math.min(targetIndex, targetBucket.tasks.length);
    (targetBucket.tasks.$jazz as { splice: (start: number, deleteCount: number, ...items: LoadedTask[]) => void }).splice(insertAt, 0, movedTask);
    syncStatusForTargetBucket(movedTask, targetBucket.type);

    normalizeTaskOrder(sourceBucket);
    normalizeTaskOrder(targetBucket);
  };

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !loadedProject) return null;
    return loadedProject.task_buckets.flatMap((bucket) => [...bucket.tasks]).find((task) => task.$jazz.id === selectedTaskId) ?? null;
  }, [loadedProject, selectedTaskId]);

  const selectedTaskBucket = useMemo(() => {
    if (!selectedTaskId || !loadedProject) return null;
    return loadedProject.task_buckets.find((bucket) => bucket.tasks.some((task) => task.$jazz.id === selectedTaskId)) ?? null;
  }, [loadedProject, selectedTaskId]);

  const listSections = useMemo<TaskViewListSection[]>(() => {
    if (!loadedProject) return [];

    return [
      {
        id: loadedProject.$jazz.id,
        buckets: orderedBuckets.map((bucket) => {
          const customIndex = customBuckets.findIndex((candidate) => candidate.$jazz.id === bucket.$jazz.id);
          const visibleCompletedTasks = getBucketTasks(bucket).filter((task) => {
            if (bucket.type !== "Active") return false;

            const query = searchQuery.trim().toLowerCase();
            const matchesQuery = !query || [
              getTaskDisplayId(task, projectTaskPrefix).toLowerCase(),
              task.summary.toLowerCase(),
              task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name.toLowerCase() : "",
            ].some((value) => value.includes(query));

            return matchesQuery && (task.status === "Completed" || task.status === "Cancelled");
          });

          return {
            id: bucket.$jazz.id,
            name: bucket.name,
            type: bucket.type,
            order: bucket.order,
            tasks: getBucketTasks(bucket).map<TaskViewItem>((task) => ({
              id: task.$jazz.id,
              summary: task.summary,
              type: task.type,
              status: task.status,
              order: task.order,
              taskKey: getTaskDisplayId(task, projectTaskPrefix),
              taskHref: orgId && projectId ? `/organizations/${orgId}/projects/${projectId}/tasks/${task.$jazz.id}` : undefined,
              bucketName: bucket.name,
              bucketType: bucket.type,
              assigneeInitial: task.assigned_to && task.assigned_to.$isLoaded ? (task.assigned_to.name[0] ?? "?").toUpperCase() : "?",
              assigneeName: task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name : undefined,
              tags: [...task.tags],
            })),
            onArchiveCompleted: bucket.type === "Active"
              ? () => {
                  visibleCompletedTasks.forEach((task) => {
                    task.$jazz.set("status", "Archived");
                  });
                }
              : undefined,
            archiveCompletedDisabled: bucket.type === "Active" ? visibleCompletedTasks.length === 0 : undefined,
            onCreateBucket: bucket.type === "Backlog" ? createCustomBucket : undefined,
            onRename: bucket.type === "Custom" ? (name: string) => renameCustomBucket(bucket.$jazz.id, name) : undefined,
            onMoveBucket: bucket.type === "Custom" ? (direction: "up" | "down") => moveCustomBucket(bucket.$jazz.id, direction) : undefined,
            onDeleteBucket: bucket.type === "Custom" ? () => removeCustomBucket(bucket.$jazz.id) : undefined,
            canMoveUp: customIndex > 0,
            canMoveDown: customIndex >= 0 && customIndex < customBuckets.length - 1,
          };
        }),
      },
    ];
  }, [customBuckets, loadedProject, orderedBuckets, orgId, projectId, projectTaskPrefix, searchQuery]);

  const allTaskItems = useMemo(
    () => listSections.flatMap((section) => section.buckets.flatMap((bucket) => bucket.tasks)),
    [listSections]
  );

  if (!loadedProject) {
    return <div className="text-sm text-muted-foreground">Loading task backlog...</div>;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Backlog</h2>
        <div className="font-[Inter] surface-feature mt-2 flex flex-col gap-2 sm:rounded-lg sm:border sm:border-border/70 sm:bg-card/90 sm:px-2 sm:py-1.5 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-[220px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-7 text-sm sm:h-7 sm:text-xs"
              placeholder="Search by summary, key, assignee"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="hidden min-w-0 flex-1 md:flex md:flex-wrap md:items-center md:gap-2">
            <select
              value={desktopTaskType}
              onChange={(event) => setDesktopTaskType(event.target.value as TaskType)}
              className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground"
              aria-label="Task type"
            >
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
            </select>

            <select
              value={desktopTargetBucketId}
              onChange={(event) => setDesktopTargetBucketId(event.target.value)}
              className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground"
              aria-label="Target bucket"
            >
              {createTargetBuckets.map((bucket) => (
                <option key={bucket.$jazz.id} value={bucket.$jazz.id}>
                  {bucket.name}
                </option>
              ))}
            </select>

            <Input
              className="h-7 min-w-[220px] flex-1 text-xs"
              value={desktopTaskSummary}
              onChange={(event) => setDesktopTaskSummary(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createTaskFromDesktopBar();
              }}
              placeholder="Create task"
              aria-label="Create task"
            />

            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={createTaskFromDesktopBar}
              disabled={!profile || !desktopTaskSummary.trim() || !desktopTargetBucketId}
            >
              Create task
            </Button>
          </div>
        </div>
      </div>

      <TaskView
        tasks={allTaskItems}
        viewType="list"
        combineBucketsByType={false}
        title="Backlog"
        searchQuery={searchQuery}
        listSections={listSections}
        onTaskSelect={setSelectedTaskId}
        onListTaskMove={moveTask}
      />

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        assigneeOptions={assigneeOptions}
        taskIdPrefix={projectTaskPrefix}
        taskHref={selectedTask && orgId && projectId ? `/organizations/${orgId}/projects/${projectId}/tasks/${selectedTask.$jazz.id}` : undefined}
        onArchive={() => {
          if (!selectedTask) return;
          selectedTask.$jazz.set("status", "Archived");
        }}
        onDelete={() => {
          if (!selectedTask || !selectedTaskBucket) return;
          const nextTasks = selectedTaskBucket.tasks.filter((candidate) => candidate.$jazz.id !== selectedTask.$jazz.id);
          selectedTaskBucket.tasks.$jazz.applyDiff(nextTasks);
          setSelectedTaskId(null);
        }}
        onClose={() => setSelectedTaskId(null)}
      />

      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon-lg" className="size-12 rounded-full shadow-lg" aria-label="Create issue">
              <Plus className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openCreateDialog("Task")}>New task</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openCreateDialog("Bug")}>New bug</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="h-dvh w-dvw max-w-none rounded-none border-0 p-4 sm:h-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-xl sm:border">
          <DialogHeader>
            <DialogTitle>Create issue</DialogTitle>
            <DialogDescription>Create a new item and place it into a backlog bucket.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createDraft.taskType}
                onChange={(event) => setCreateDraft((current) => ({ ...current, taskType: event.target.value as TaskType }))}
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bucket</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={createDraft.bucketId}
                onChange={(event) => setCreateDraft((current) => ({ ...current, bucketId: event.target.value }))}
              >
                {createTargetBuckets.map((bucket) => (
                  <option key={bucket.$jazz.id} value={bucket.$jazz.id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
              <Input
                className="h-10"
                value={createDraft.summary}
                onChange={(event) => setCreateDraft((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Describe the issue"
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitCreateTask} disabled={!profile || !createDraft.summary.trim() || !createDraft.bucketId}>
              Create issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
