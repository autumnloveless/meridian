import { useMemo } from "react";
import { co } from "jazz-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Account, Organization, Project, Task, TaskBucket } from "@/schema";
import { allocateTaskId, getTaskDisplayId } from "@/lib/taskIds";

export type LoadedTask = co.loaded<typeof Task>;
export type LoadedTaskBucket = co.loaded<typeof TaskBucket>;
export type LoadedProject = co.loaded<
  typeof Project,
  {
    task_buckets: {
      $each: {
        tasks: {
          $each: {
            assigned_to: true;
            details: true;
          };
        };
      };
    };
  }
>;
export type LoadedOrganization = co.loaded<
  typeof Organization,
  {
    task_buckets: {
      $each: {
        tasks: {
          $each: {
            assigned_to: true;
            details: true;
          };
        };
      };
    };
    projects: {
      $each: {
        task_buckets: {
          $each: {
            tasks: {
              $each: {
                assigned_to: true;
                details: true;
              };
            };
          };
        };
      };
    };
  }
>;
type LoadedProfile = co.loaded<typeof Account, { profile: true }>['profile'];

export type TaskOwnerKind = "organization" | "project";

export type TaskContainer = {
  ownerKind: TaskOwnerKind;
  ownerId: string;
  ownerLabel: string;
  taskKeyPrefix: string;
  projectId: string | null;
  projectName: string | null;
  bucket: LoadedTaskBucket;
  task: LoadedTask;
};

export type CreateTarget = {
  id: string;
  kind: TaskOwnerKind;
  label: string;
  project: LoadedProject | null;
};

export const ensureDefaultBuckets = (target: LoadedOrganization | LoadedProject) => {
  const hasActive = target.task_buckets.some((bucket) => bucket.type === "Active");
  const hasBacklog = target.task_buckets.some((bucket) => bucket.type === "Backlog");

  if (!hasActive) {
    target.task_buckets.$jazz.push(
      {
        name: "Active",
        type: "Active",
        order: 0,
        tasks: [],
      }
    );
  }

  if (!hasBacklog) {
    target.task_buckets.$jazz.push(
      {
        name: "Backlog",
        type: "Backlog",
        order: 9999,
        tasks: [],
      }
    );
  }
};

const sortTasks = (tasks: LoadedTask[]) => {
  return [...tasks].sort((left, right) => left.order - right.order || left.summary.localeCompare(right.summary));
};

export const collectOrganizationTaskContainers = (organization: LoadedOrganization): TaskContainer[] => {
  const containers: TaskContainer[] = [];

  organization.task_buckets.forEach((bucket) => {
    bucket.tasks.forEach((task) => {
      containers.push({
        ownerKind: "organization",
        ownerId: organization.$jazz.id,
        ownerLabel: "Organization",
        taskKeyPrefix: organization.project_key,
        projectId: null,
        projectName: null,
        bucket,
        task,
      });
    });
  });

  organization.projects.forEach((project) => {
    project.task_buckets.forEach((bucket) => {
      bucket.tasks.forEach((task) => {
        containers.push({
          ownerKind: "project",
          ownerId: project.$jazz.id,
          ownerLabel: project.name,
          taskKeyPrefix: project.project_key,
          projectId: project.$jazz.id,
          projectName: project.name,
          bucket,
          task,
        });
      });
    });
  });

  return containers;
};

export const useFilteredOrganizationTaskContainers = ({
  organization,
  search,
  includeArchived,
}: {
  organization: LoadedOrganization | null;
  search: string;
  includeArchived: boolean;
}) => {
  return useMemo(() => {
    if (!organization) return [];

    const query = search.trim().toLowerCase();
    return collectOrganizationTaskContainers(organization)
      .filter((entry) => {
        if (!includeArchived && entry.task.status === "Archived") return false;
        if (includeArchived && entry.task.status !== "Archived") return false;

        if (!query) return true;

        const key = getTaskDisplayId(entry.task, entry.taskKeyPrefix).toLowerCase();
        const summary = entry.task.summary.toLowerCase();
        const assignee = entry.task.assigned_to && entry.task.assigned_to.$isLoaded ? entry.task.assigned_to.name.toLowerCase() : "";
        const projectLabel = (entry.projectName ?? "organization").toLowerCase();

        return summary.includes(query) || key.includes(query) || assignee.includes(query) || projectLabel.includes(query);
      })
      .sort((a, b) => {
        const projectCmp = (a.projectName ?? "").localeCompare(b.projectName ?? "");
        if (projectCmp !== 0) return projectCmp;
        return a.task.order - b.task.order || a.task.summary.localeCompare(b.task.summary);
      });
  }, [includeArchived, organization, search]);
};

export const getCreateTargets = (organization: LoadedOrganization): CreateTarget[] => {
  return [
    { id: `org:${organization.$jazz.id}`, kind: "organization", label: "Organization", project: null },
    ...organization.projects.map((project) => ({
      id: `project:${project.$jazz.id}`,
      kind: "project" as const,
      label: project.name,
      project,
    })),
  ];
};

export const createTaskInTarget = ({
  organization,
  profile,
  target,
  summary,
  taskType,
}: {
  organization: LoadedOrganization;
  profile: LoadedProfile | null;
  target: CreateTarget;
  summary: string;
  taskType: LoadedTask["type"];
}) => {
  if (!profile) return;

  const normalized = summary.trim();
  if (!normalized) return;

  const owner = target.kind === "project" && target.project ? target.project : organization;
  ensureDefaultBuckets(owner);
  const backlogBucket = owner.task_buckets.find((bucket) => bucket.type === "Backlog") ?? owner.task_buckets[0];
  if (!backlogBucket) return;

  backlogBucket.tasks.$jazz.push(
    {
      ...allocateTaskId(owner),
      summary: normalized,
      type: taskType,
      assigned_to: profile,
      status: "Backlog",
      details: "",
      custom_fields: {},
      order: backlogBucket.tasks.length + 1,
      tags: [],
    }
  );
};

export const ProjectBadge = ({ projectName }: { projectName: string | null }) => {
  return (
    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">
      {projectName ?? "Org"}
    </Badge>
  );
};

export const OrganizationTaskCreateBar = ({
  organization,
  profile,
  selectedTargetId,
  onTargetChange,
  summary,
  onSummaryChange,
  taskType,
  onTaskTypeChange,
  onCreate,
}: {
  organization: LoadedOrganization;
  profile: LoadedProfile | null;
  selectedTargetId: string;
  onTargetChange: (value: string) => void;
  summary: string;
  onSummaryChange: (value: string) => void;
  taskType: LoadedTask["type"];
  onTaskTypeChange: (value: LoadedTask["type"]) => void;
  onCreate: () => void;
}) => {
  const targets = getCreateTargets(organization);

  return (
    <div className="font-[Inter] flex flex-col gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1.5 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        value={taskType}
        onChange={(event) => onTaskTypeChange(event.target.value as LoadedTask["type"])}
        className="h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm text-stone-800 sm:h-7 sm:w-auto sm:text-xs"
        aria-label="Task type"
      >
        <option value="Task">Task</option>
        <option value="Bug">Bug</option>
      </select>

      <select
        value={selectedTargetId}
        onChange={(event) => onTargetChange(event.target.value)}
        className="h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm text-stone-800 sm:h-7 sm:w-auto sm:text-xs"
        aria-label="Target project"
      >
        {targets.map((target) => (
          <option key={target.id} value={target.id}>
            {target.label}
          </option>
        ))}
      </select>

      <Input
        className="h-9 w-full flex-1 text-sm sm:h-7 sm:min-w-[220px] sm:text-xs"
        value={summary}
        onChange={(event) => onSummaryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCreate();
        }}
        placeholder="Create task"
        aria-label="Create task"
      />

      <Button size="sm" className="h-9 w-full text-sm sm:h-7 sm:w-auto sm:text-xs" onClick={onCreate} disabled={!profile || !summary.trim()}>
        Create task
      </Button>
    </div>
  );
};

export const getTargetById = (organization: LoadedOrganization, targetId: string): CreateTarget => {
  const targets = getCreateTargets(organization);
  return targets.find((target) => target.id === targetId) ?? targets[0];
};

export const getBoardColumns = (containers: TaskContainer[]) => {
  const map: Record<"Backlog" | "In Progress" | "In-Review" | "Completed" | "Cancelled", TaskContainer[]> = {
    Backlog: [],
    "In Progress": [],
    "In-Review": [],
    Completed: [],
    Cancelled: [],
  };

  for (const container of containers) {
    if (container.task.status === "Backlog") map.Backlog.push(container);
    if (container.task.status === "In Progress") map["In Progress"].push(container);
    if (container.task.status === "In-Review") map["In-Review"].push(container);
    if (container.task.status === "Completed") map.Completed.push(container);
    if (container.task.status === "Cancelled") map.Cancelled.push(container);
  }

  return {
    Backlog: sortTasks(map.Backlog.map((entry) => entry.task)).map((task) => containers.find((entry) => entry.task.$jazz.id === task.$jazz.id)!),
    "In Progress": sortTasks(map["In Progress"].map((entry) => entry.task)).map((task) => containers.find((entry) => entry.task.$jazz.id === task.$jazz.id)!),
    "In-Review": sortTasks(map["In-Review"].map((entry) => entry.task)).map((task) => containers.find((entry) => entry.task.$jazz.id === task.$jazz.id)!),
    Completed: sortTasks(map.Completed.map((entry) => entry.task)).map((task) => containers.find((entry) => entry.task.$jazz.id === task.$jazz.id)!),
    Cancelled: sortTasks(map.Cancelled.map((entry) => entry.task)).map((task) => containers.find((entry) => entry.task.$jazz.id === task.$jazz.id)!),
  };
};
