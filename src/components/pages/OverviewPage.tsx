import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAccount } from "jazz-tools/react";
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

import { Account } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ensureDefaultBuckets } from "@/components/tasks/organizationTasksShared";
import { getProjectBasePath } from "@/lib/projectPaths";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-muted text-foreground" },
  { status: "In Progress", title: "In Progress", tone: "bg-primary/15 text-primary" },
  { status: "In-Review", title: "In-Review", tone: "bg-accent/25 text-foreground" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-500/18 text-emerald-700 dark:text-emerald-300" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-destructive/15 text-destructive" },
] as const;

type TaskEntry = {
  task: any;
  bucket: any;
  keyPrefix: string;
  projectId: string;
  projectLabel: string;
  projectHref?: string;
  taskHref?: string;
};

type CreateTarget = {
  id: string;
  label: string;
  owner: any;
};

const COLUMN_PREFIX = "home-kanban-col:";
const TASK_PREFIX = "home-kanban-task:";

const columnDndId = (status: string) => `${COLUMN_PREFIX}${status}`;
const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const parseColumnDndId = (value: string) => (value.startsWith(COLUMN_PREFIX) ? value.slice(COLUMN_PREFIX.length) : null);
const parseTaskDndId = (value: string) => (value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null);

const KanbanColumn = ({ status, children }: { status: string; children: React.ReactNode }) => {
  const droppable = useDroppable({ id: columnDndId(status) });

  return (
    <div
      ref={droppable.setNodeRef}
      className={droppable.isOver ? "shrink-0 rounded-md bg-muted/40 md:shrink" : "shrink-0 rounded-md md:shrink"}
    >
      {children}
    </div>
  );
};

const KanbanTaskCard = ({
  entry,
  onSelect,
}: {
  entry: TaskEntry;
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
      key={entry.task.$jazz.id}
      type="button"
      className="w-full rounded-lg border border-border/70 bg-card px-2 py-2 text-left shadow-xs transition-colors hover:bg-muted/50"
      onClick={() => onSelect(entry.task.$jazz.id)}
    >
      <p className="text-sm font-medium">{entry.task.summary}</p>
      {entry.taskHref ? (
        <Link
          to={entry.taskHref}
          className="text-xs font-medium text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {getTaskDisplayId(entry.task, entry.keyPrefix)}
        </Link>
      ) : (
        <p className="text-xs font-medium text-primary">{getTaskDisplayId(entry.task, entry.keyPrefix)}</p>
      )}
      {entry.projectHref ? (
        <Link
          to={entry.projectHref}
          className="text-xs text-muted-foreground hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {entry.projectLabel}
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">{entry.projectLabel}</p>
      )}
    </button>
  );
};

export const OverviewPage = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const account = useAccount(Account, {
    resolve: {
      profile: true,
      root: {
        personal_organization: {
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
        organizations: {
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
        },
      },
    },
  });

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const organizations = useMemo(() => {
    if (!account.$isLoaded) return [] as any[];

    const personal = account.root.personal_organization ? [account.root.personal_organization] : [];
    return [...personal, ...account.root.organizations.map((organization) => organization)];
  }, [account]);

  useEffect(() => {
    if (organizations.length === 0) return;

    for (const organization of organizations) {
      ensureDefaultBuckets(organization as any);
      for (const project of organization.projects.map((entry: any) => entry)) {
        ensureDefaultBuckets(project as any);
      }
    }
  }, [organizations]);

  const createTargets = useMemo(() => {
    const targets: CreateTarget[] = [];

    for (const organization of organizations) {
      targets.push({
        id: `org:${organization.$jazz.id}`,
        label: `${organization.name} (Org Backlog)`,
        owner: organization,
      });

      const orgProjects = organization.projects
        .map((project: any) => project)
        .sort((left: any, right: any) => left.name.localeCompare(right.name));

      for (const project of orgProjects) {
        targets.push({
          id: `project:${project.$jazz.id}`,
          label: `${organization.name} / ${project.name}`,
          owner: project,
        });
      }
    }

    return targets;
  }, [organizations]);

  useEffect(() => {
    if (createTargets.length === 0) return;
    if (selectedTargetId) return;
    setSelectedTargetId(createTargets[0].id);
  }, [createTargets, selectedTargetId]);

  const assignedActiveTasks = useMemo(() => {
    if (!account.$isLoaded || !account.profile.$isLoaded) return [] as TaskEntry[];

    const myProfileId = account.profile.$jazz.id;
    const entries: TaskEntry[] = [];

    for (const organization of organizations) {
      const orgBuckets = organization.task_buckets
        .map((bucket: any) => bucket)
        .filter((bucket: any) => bucket.type === "Active");
      for (const bucket of orgBuckets) {
        const tasks = bucket.tasks.map((task: any) => task);
        for (const task of tasks) {
          if (task.status === "Archived") continue;
          if (!task.assigned_to || !task.assigned_to.$isLoaded) continue;
          if (task.assigned_to.$jazz.id !== myProfileId) continue;

          entries.push({
            task,
            bucket,
            keyPrefix: organization.project_key,
            projectId: `org:${organization.$jazz.id}`,
            projectLabel: `${organization.name} (Org)`,
            projectHref: `/organizations/${organization.$jazz.id}/tasks/list`,
            taskHref: `/organizations/${organization.$jazz.id}/tasks/${task.$jazz.id}`,
          });
        }
      }

      const orgProjects = organization.projects.map((project: any) => project);
      for (const project of orgProjects) {
        const projectBuckets = project.task_buckets
          .map((bucket: any) => bucket)
          .filter((bucket: any) => bucket.type === "Active");
        for (const bucket of projectBuckets) {
          const tasks = bucket.tasks.map((task: any) => task);
          for (const task of tasks) {
            if (task.status === "Archived") continue;
            if (!task.assigned_to || !task.assigned_to.$isLoaded) continue;
            if (task.assigned_to.$jazz.id !== myProfileId) continue;

            entries.push({
              task,
              bucket,
              keyPrefix: project.project_key,
              projectId: `project:${project.$jazz.id}`,
              projectLabel: `${organization.name} / ${project.name}`,
              projectHref: `${getProjectBasePath(project.$jazz.id, organization.$jazz.id)}/tasks/list`,
              taskHref: `${getProjectBasePath(project.$jazz.id, organization.$jazz.id)}/tasks/${task.$jazz.id}`,
            });
          }
        }
      }
    }

    return entries.sort((left, right) => left.task.order - right.task.order || left.task.summary.localeCompare(right.task.summary));
  }, [account, organizations]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return assignedActiveTasks.find((entry) => entry.task.$jazz.id === selectedTaskId) ?? null;
  }, [assignedActiveTasks, selectedTaskId]);

  const columns = useMemo(() => {
    const initial: Record<string, TaskEntry[]> = {
      Backlog: [],
      "In Progress": [],
      "In-Review": [],
      Completed: [],
      Cancelled: [],
    };

    for (const entry of assignedActiveTasks) {
      if (entry.task.status in initial) {
        initial[entry.task.status].push(entry);
      }
    }

    return initial;
  }, [assignedActiveTasks]);

  const effectiveTaskView = isDesktop ? taskView : "list";

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    const activeTaskId = parseTaskDndId(String(event.active.id));
    const overRawId = event.over ? String(event.over.id) : null;
    if (!activeTaskId || !overRawId) return;

    const activeEntry = assignedActiveTasks.find((entry) => entry.task.$jazz.id === activeTaskId);
    if (!activeEntry) return;

    const overTaskId = parseTaskDndId(overRawId);

    const destinationStatus = (() => {
      const columnStatus = parseColumnDndId(overRawId);
      if (columnStatus) return columnStatus;

      if (!overTaskId) return null;
      const overEntry = assignedActiveTasks.find((entry) => entry.task.$jazz.id === overTaskId);
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

  const createTask = () => {
    const target = createTargets.find((entry) => entry.id === selectedTargetId);
    if (!target || !account.$isLoaded || !account.profile.$isLoaded) return;
    if (!taskSummary.trim()) return;

    const owner = target.owner;
    const backlog = owner.task_buckets.find((bucket: any) => bucket.type === "Backlog") ?? owner.task_buckets[0];
    if (!backlog) return;

    backlog.tasks.$jazz.push({
      ...allocateTaskId(owner),
      summary: taskSummary.trim(),
      type: taskType,
      assigned_to: account.profile,
      status: "Backlog",
      details: "",
      custom_fields: {},
      order: backlog.tasks.length + 1,
      tags: [],
    });

    setTaskSummary("");
  };

  if (!account.$isLoaded) {
    return <div className="p-4 text-sm text-muted-foreground">Loading workspace overview...</div>;
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6">
      <div className="hero-gradient-soft relative overflow-hidden rounded-2xl border border-primary/20 px-4 py-4 sm:px-5">
        <div className="absolute -right-12 -top-12 size-36 rounded-full bg-white/25 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-16 left-8 size-44 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative z-10">
          <p className="eyebrow-label text-foreground/80">Daily Focus</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground sm:text-3xl">My Active Tasks</h1>
          <p className="mt-1 text-sm text-foreground/80">Keep momentum with high-contrast task views and fast updates.</p>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-3 border-b border-border/70 pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">Current Work Queue</CardTitle>
              <p className="text-xs text-muted-foreground">Tasks currently assigned to you.</p>
            </div>
            {isDesktop ? (
              <div className="flex items-center gap-1 rounded-md border p-1">
                <Button type="button" size="sm" variant={taskView === "list" ? "default" : "ghost"} onClick={() => setTaskView("list")}>List</Button>
                <Button type="button" size="sm" variant={taskView === "kanban" ? "default" : "ghost"} onClick={() => setTaskView("kanban")}>Kanban</Button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_minmax(220px,1fr)_1fr_auto]">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as "Task" | "Bug")}
            >
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
            </select>

            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={selectedTargetId}
              onChange={(event) => setSelectedTargetId(event.target.value)}
            >
              {createTargets.map((target) => (
                <option key={target.id} value={target.id}>{target.label}</option>
              ))}
            </select>

            <Input
              value={taskSummary}
              onChange={(event) => setTaskSummary(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createTask();
              }}
              placeholder="Add a task to backlog"
            />

            <Button type="button" onClick={createTask} disabled={!account.profile.$isLoaded || !taskSummary.trim() || createTargets.length === 0}>
              Add Task
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          {effectiveTaskView === "list" ? (
            <>
              <div className="space-y-2 md:hidden">
                {assignedActiveTasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/80 bg-background/70 px-3 py-4 text-xs text-muted-foreground">
                    No active tasks assigned to you.
                  </div>
                ) : (
                  assignedActiveTasks.map((entry) => (
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
                        {entry.taskHref ? (
                          <Link to={entry.taskHref} className="font-semibold text-primary hover:underline" onClick={(event) => event.stopPropagation()}>
                            {getTaskDisplayId(entry.task, entry.keyPrefix)}
                          </Link>
                        ) : (
                          <span className="font-semibold text-primary">{getTaskDisplayId(entry.task, entry.keyPrefix)}</span>
                        )}
                        <span className="uppercase text-muted-foreground">{entry.task.type}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.projectHref ? (
                          <Link
                            to={entry.projectHref}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {entry.projectLabel}
                          </Link>
                        ) : (
                          entry.projectLabel
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
                    <th className="w-32 px-2 py-1 text-left">Project</th>
                    <th className="w-24 px-2 py-1 text-left">Type</th>
                    <th className="w-24 px-2 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedActiveTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-3 text-xs text-muted-foreground">No active tasks assigned to you.</td>
                    </tr>
                  ) : (
                    assignedActiveTasks.map((entry) => (
                      <tr key={entry.task.$jazz.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setSelectedTaskId(entry.task.$jazz.id)}>
                        <td className="px-2 py-1 text-xs font-semibold text-primary">
                          {entry.taskHref ? (
                            <Link
                              to={entry.taskHref}
                              className="hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {getTaskDisplayId(entry.task, entry.keyPrefix)}
                            </Link>
                          ) : (
                            getTaskDisplayId(entry.task, entry.keyPrefix)
                          )}
                        </td>
                        <td className="px-2 py-1">{entry.task.summary}</td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">
                          {entry.projectHref ? (
                            <Link
                              to={entry.projectHref}
                              className="hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {entry.projectLabel}
                            </Link>
                          ) : (
                            entry.projectLabel
                          )}
                        </td>
                        <td className="px-2 py-1 text-xs uppercase">{entry.task.type}</td>
                        <td className="px-2 py-1 text-xs uppercase">{entry.task.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleKanbanDragEnd}>
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
                              <KanbanTaskCard key={entry.task.$jazz.id} entry={entry} onSelect={setSelectedTaskId} />
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </KanbanColumn>
                  ))}
                </div>
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask?.task ?? null}
        taskIdPrefix={selectedTask?.keyPrefix}
        taskHref={selectedTask?.taskHref}
        onArchive={() => {
          if (!selectedTask) return;
          selectedTask.task.$jazz.set("status", "Archived");
        }}
        onDelete={() => {
          if (!selectedTask) return;
          const bucket = selectedTask.bucket as any;
          const nextTasks = bucket.tasks.filter((candidate: any) => candidate.$jazz.id !== selectedTask.task.$jazz.id);
          bucket.tasks.$jazz.applyDiff(nextTasks);
          setSelectedTaskId(null);
        }}
        onClose={() => setSelectedTaskId(null)}
      />
    </section>
  );
};