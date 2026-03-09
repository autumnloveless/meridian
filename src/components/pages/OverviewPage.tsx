import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAccount } from "jazz-tools/react";

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
  { status: "Backlog", title: "Backlog", tone: "bg-slate-100 text-slate-700" },
  { status: "In Progress", title: "In Progress", tone: "bg-blue-100 text-blue-700" },
  { status: "In-Review", title: "In-Review", tone: "bg-amber-100 text-amber-800" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-rose-100 text-rose-800" },
] as const;

type TaskEntry = {
  task: any;
  bucket: any;
  keyPrefix: string;
  targetId: string;
  targetLabel: string;
  taskHref?: string;
};

type CreateTarget = {
  id: string;
  label: string;
  owner: any;
};

export const OverviewPage = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "kanban">("list");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
      const orgBuckets = organization.task_buckets.map((bucket: any) => bucket);
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
            targetId: `org:${organization.$jazz.id}`,
            targetLabel: `${organization.name} (Org)`,
            taskHref: `/organizations/${organization.$jazz.id}/tasks/${task.$jazz.id}`,
          });
        }
      }

      const orgProjects = organization.projects.map((project: any) => project);
      for (const project of orgProjects) {
        const projectBuckets = project.task_buckets.map((bucket: any) => bucket);
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
              targetId: `project:${project.$jazz.id}`,
              targetLabel: `${organization.name} / ${project.name}`,
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
    <section className="mx-auto w-full max-w-6xl space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-3 border-b border-border/70 pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base">My Active Tasks</CardTitle>
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
            <div className="overflow-hidden rounded-md border">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-28 px-2 py-1 text-left">Key</th>
                    <th className="px-2 py-1 text-left">Summary</th>
                    <th className="w-32 px-2 py-1 text-left">Target</th>
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
                        <td className="px-2 py-1 text-[11px] font-medium text-sky-700">
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
                        <td className="px-2 py-1 text-xs text-muted-foreground">{entry.targetLabel}</td>
                        <td className="px-2 py-1 text-[11px] uppercase">{entry.task.type}</td>
                        <td className="px-2 py-1 text-[11px] uppercase">{entry.task.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-3">
                {boardColumns.map((column) => (
                  <div key={column.status} className="w-[18rem] rounded-md border bg-muted/20">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <p className="text-sm font-semibold">{column.title}</p>
                      <Badge className={`h-5 px-1.5 text-[10px] ${column.tone}`}>{columns[column.status].length}</Badge>
                    </div>
                    <div className="space-y-2 p-2">
                      {columns[column.status].length === 0 ? (
                        <div className="rounded border border-dashed px-2 py-3 text-xs text-muted-foreground">No tasks</div>
                      ) : (
                        columns[column.status].map((entry) => (
                          <button
                            key={entry.task.$jazz.id}
                            type="button"
                            className="w-full rounded border bg-background px-2 py-2 text-left hover:bg-muted/50"
                            onClick={() => setSelectedTaskId(entry.task.$jazz.id)}
                          >
                            <p className="text-sm font-medium">{entry.task.summary}</p>
                            {entry.taskHref ? (
                              <Link
                                to={entry.taskHref}
                                className="text-[11px] text-sky-700 hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {getTaskDisplayId(entry.task, entry.keyPrefix)}
                              </Link>
                            ) : (
                              <p className="text-[11px] text-sky-700">{getTaskDisplayId(entry.task, entry.keyPrefix)}</p>
                            )}
                            <p className="text-[11px] text-muted-foreground">{entry.targetLabel}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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