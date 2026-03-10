import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Project } from "@/schema";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem } from "@/components/tasks/TaskView";
import { useProjectAssigneeOptions } from "@/components/tasks/useProjectAssigneeOptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";

export const ProjectTasksBoardPage = () => {
  const { orgId, projectId } = useParams();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskType, setTaskType] = useState<"Task" | "Bug">("Task");
  const [taskSummary, setTaskSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  useEffect(() => {
    if (!project.$isLoaded) return;

    const hasActive = project.task_buckets.some((bucket) => bucket.type === "Active");
    const hasBacklog = project.task_buckets.some((bucket) => bucket.type === "Backlog");

    if (!hasActive) {
      project.task_buckets.$jazz.push({
        name: "Active",
        type: "Active",
        order: 0,
        tasks: [],
      });
    }

    if (!hasBacklog) {
      project.task_buckets.$jazz.push({
        name: "Backlog",
        type: "Backlog",
        order: 9999,
        tasks: [],
      });
    }
  }, [project]);

  const activeBucket = useMemo(() => {
    if (!project.$isLoaded) return null;
    return project.task_buckets.find((bucket) => bucket.type === "Active") ?? null;
  }, [project]);

  const projectTaskPrefix = project.$isLoaded ? project.project_key : "TASK";

  const boardTasks = useMemo<TaskViewItem[]>(() => {
    if (!activeBucket) return [];
    const query = searchQuery.trim().toLowerCase();

    return activeBucket.tasks
      .filter((task) => task.status !== "Archived")
      .filter((task) => {
        if (!query) return true;
        const key = getTaskDisplayId(task, projectTaskPrefix).toLowerCase();
        const summary = task.summary.toLowerCase();
        const assignee = task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name.toLowerCase() : "";
        return key.includes(query) || summary.includes(query) || assignee.includes(query);
      })
      .map((task) => ({
        id: task.$jazz.id,
        summary: task.summary,
        type: task.type,
        status: task.status,
        order: task.order,
        taskKey: getTaskDisplayId(task, projectTaskPrefix),
        taskHref:
          orgId && projectId
            ? `/organizations/${orgId}/projects/${projectId}/tasks/${task.$jazz.id}`
            : undefined,
        bucketName: activeBucket.name,
        bucketType: activeBucket.type,
        assigneeInitial:
          task.assigned_to && task.assigned_to.$isLoaded ? (task.assigned_to.name[0] ?? "?").toUpperCase() : "?",
        assigneeName:
          task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name : undefined,
      }));
  }, [activeBucket, orgId, projectId, projectTaskPrefix, searchQuery]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId || !activeBucket) return null;
    return activeBucket.tasks.find((task) => task.$jazz.id === selectedTaskId) ?? null;
  }, [activeBucket, selectedTaskId]);

  const assigneeOptions = useProjectAssigneeOptions(project.$isLoaded ? project : null);

  const handleTaskMove = ({
    taskId,
    destinationStatus,
    overTaskId,
  }: {
    taskId: string;
    destinationStatus: "Backlog" | "In Progress" | "In-Review" | "Completed" | "Cancelled";
    overTaskId: string | null;
  }) => {
    if (!activeBucket) return;

    const movingTask = activeBucket.tasks.find((task) => task.$jazz.id === taskId);
    if (!movingTask) return;

    if (movingTask.status !== destinationStatus) {
      movingTask.$jazz.set("status", destinationStatus);
    }

    const destinationTasks = activeBucket.tasks
      .filter((task) => task.status === destinationStatus)
      .filter((task) => task.$jazz.id !== movingTask.$jazz.id);

    const insertIndex = overTaskId
      ? Math.max(0, destinationTasks.findIndex((task) => task.$jazz.id === overTaskId))
      : destinationTasks.length;

    const normalizedIndex = overTaskId && insertIndex >= 0 ? insertIndex : destinationTasks.length;
    destinationTasks.splice(normalizedIndex, 0, movingTask);

    destinationTasks.forEach((task, index) => {
      task.$jazz.set("order", index + 1);
    });
  };

  const createTask = () => {
    if (!project.$isLoaded || !profile || !taskSummary.trim()) return;
    const bucket = activeBucket ?? project.task_buckets.find((candidate) => candidate.type === "Backlog") ?? project.task_buckets[0];
    if (!bucket) return;

    bucket.tasks.$jazz.push({
      ...allocateTaskId(project),
      summary: taskSummary.trim(),
      type: taskType,
      assigned_to: profile,
      status: "Backlog",
      details: "",
      custom_fields: {},
      order: bucket.tasks.length + 1,
      tags: [],
    });

    setTaskSummary("");
  };

  const archiveCompletedTasks = () => {
    if (!activeBucket) return;

    boardTasks
      .filter((task) => task.status === "Completed" || task.status === "Cancelled")
      .forEach((task) => {
        const matchedTask = activeBucket.tasks.find((candidate) => candidate.$jazz.id === task.id);
        matchedTask?.$jazz.set("status", "Archived");
      });
  };

  const completedTaskCount = boardTasks.filter(
    (task) => task.status === "Completed" || task.status === "Cancelled"
  ).length;

  if (isMobile) {
    return <Navigate to="../list" replace />;
  }

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading active board...</div>;
  }

  if (!activeBucket) {
    return <div className="text-sm text-muted-foreground">Preparing active board...</div>;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Active Board</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-border/70 bg-card/90 px-2 py-1.5">
          <Input
            className="h-8 min-w-[220px] flex-1 text-xs"
            placeholder="Search by summary, key, assignee"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <select
            className="h-8 rounded border border-input bg-background px-2 text-xs"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value as "Task" | "Bug")}
          >
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
          </select>
          <Input
            className="h-8 min-w-[220px] flex-1 text-xs"
            placeholder="Create issue in backlog"
            value={taskSummary}
            onChange={(event) => setTaskSummary(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createTask();
            }}
          />
          <Button size="sm" className="h-8 text-xs" onClick={createTask} disabled={!profile || !taskSummary.trim()}>
            Add
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={archiveCompletedTasks} disabled={completedTaskCount === 0}>
            Archive Completed Tasks
          </Button>
        </div>
      </div>

      <TaskView
        tasks={boardTasks}
        viewType="board"
        combineBucketsByType
        title="Active Board"
        onTaskSelect={setSelectedTaskId}
        onTaskMove={handleTaskMove}
      />

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
          if (!selectedTask || !activeBucket) return;
          const nextTasks = activeBucket.tasks.filter((task) => task.$jazz.id !== selectedTask.$jazz.id);
          activeBucket.tasks.$jazz.applyDiff(nextTasks as any);
          setSelectedTaskId(null);
        }}
        onClose={() => setSelectedTaskId(null)}
      />
    </section>
  );
};
