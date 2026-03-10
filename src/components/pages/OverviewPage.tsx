import { useEffect, useMemo, useState } from "react";
import { useAccount } from "jazz-tools/react";

import { Account } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem } from "@/components/tasks/TaskView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ensureDefaultBuckets } from "@/components/tasks/organizationTasksShared";
import { getProjectBasePath } from "@/lib/projectPaths";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";

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


export const OverviewPage = () => {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);
  const [taskView, setTaskView] = useState<"list" | "board">("list");
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

  const taskViewItems = useMemo<TaskViewItem[]>(() => {
    return assignedActiveTasks.map((entry) => ({
      id: entry.task.$jazz.id,
      summary: entry.task.summary,
      type: entry.task.type,
      status: entry.task.status,
      order: entry.task.order,
      taskKey: getTaskDisplayId(entry.task, entry.keyPrefix),
      taskHref: entry.taskHref,
      bucketName: entry.bucket.name,
      bucketType: entry.bucket.type,
      projectLabel: entry.projectLabel,
      projectHref: entry.projectHref,
      assigneeInitial:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? (entry.task.assigned_to.name[0] ?? "?").toUpperCase()
          : "?",
      assigneeName:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? entry.task.assigned_to.name
          : undefined,
    }));
  }, [assignedActiveTasks]);

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
    const activeEntry = assignedActiveTasks.find((entry) => entry.task.$jazz.id === taskId);
    if (!activeEntry) return;

    if (activeEntry.task.status === destinationStatus) return;
    activeEntry.task.$jazz.set("status", destinationStatus);

    const destinationEntries = assignedActiveTasks
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

  const archiveCompletedTasks = () => {
    assignedActiveTasks
      .filter((entry) => entry.task.status === "Completed" || entry.task.status === "Cancelled")
      .forEach((entry) => {
        entry.task.$jazz.set("status", "Archived");
      });
  };

  const completedTaskCount = assignedActiveTasks.filter(
    (entry) => entry.task.status === "Completed" || entry.task.status === "Cancelled"
  ).length;

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
                <Button type="button" size="sm" variant={taskView === "board" ? "default" : "ghost"} onClick={() => setTaskView("board")}>Kanban</Button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px_minmax(220px,1fr)_1fr_auto_auto]">
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
            <Button type="button" variant="outline" onClick={archiveCompletedTasks} disabled={completedTaskCount === 0}>
              Archive Completed Tasks
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          <TaskView
            tasks={taskViewItems}
            viewType={effectiveTaskView}
            combineBucketsByType
            title="Current Work Queue"
            onTaskSelect={setSelectedTaskId}
            onTaskMove={handleTaskMove}
          />
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