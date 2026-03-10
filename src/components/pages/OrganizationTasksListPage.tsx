import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Organization } from "@/schema";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { TaskView, type TaskViewItem } from "@/components/tasks/TaskView";
import {
  OrganizationTaskCreateBar,
  collectOrganizationTaskContainers,
  createTaskInTarget,
  ensureDefaultBuckets,
  getTargetById,
  type LoadedOrganization,
  type LoadedTask,
} from "@/components/tasks/organizationTasksShared";
import { getTaskDisplayId } from "@/lib/taskIds";

export const OrganizationTasksListPage = () => {
  const { orgId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [taskType, setTaskType] = useState<LoadedTask["type"]>("Task");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState(() => (orgId ? `org:${orgId}` : ""));
  const [summary, setSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const profile = useAccount(Account, {
    resolve: { profile: true },
    select: (account) => (account.$isLoaded ? account.profile : null),
  });

  const organization = useCoState(Organization, orgId, {
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

  const loadedOrganization = organization.$isLoaded ? (organization as LoadedOrganization) : null;

  useEffect(() => {
    if (!loadedOrganization) return;
    ensureDefaultBuckets(loadedOrganization);
    loadedOrganization.projects.forEach((project) => ensureDefaultBuckets(project));
  }, [loadedOrganization]);

  const activeTasks = useMemo(() => {
    if (!loadedOrganization) return [];

    const query = searchQuery.trim().toLowerCase();
    return collectOrganizationTaskContainers(loadedOrganization)
      .filter((entry) => entry.bucket.type === "Active" && entry.task.status !== "Archived")
      .filter((entry) => {
        if (!query) return true;

        const key = getTaskDisplayId(entry.task, entry.taskKeyPrefix).toLowerCase();
        const summaryText = entry.task.summary.toLowerCase();
        const assigneeText = entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? entry.task.assigned_to.name.toLowerCase()
          : "";
        const projectText = (entry.projectName ?? "organization").toLowerCase();

        return (
          key.includes(query) ||
          summaryText.includes(query) ||
          assigneeText.includes(query) ||
          projectText.includes(query)
        );
      })
      .sort((left, right) => left.task.order - right.task.order || left.task.summary.localeCompare(right.task.summary));
  }, [loadedOrganization, searchQuery]);

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
      taskHref: orgId
        ? (entry.projectId
          ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
          : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`)
        : undefined,
      bucketName: entry.bucket.name,
      bucketType: entry.bucket.type,
      projectLabel: entry.projectName ?? "Organization",
      projectHref: orgId
        ? (entry.projectId
          ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/list`
          : `/organizations/${orgId}/tasks/list`)
        : undefined,
      assigneeInitial:
        entry.task.assigned_to && entry.task.assigned_to.$isLoaded
          ? (entry.task.assigned_to.name[0] ?? "?").toUpperCase()
          : "?",
      assigneeName: entry.task.assigned_to && entry.task.assigned_to.$isLoaded ? entry.task.assigned_to.name : undefined,
      tags: [...entry.task.tags],
    }));
  }, [activeTasks, orgId]);

  const createTask = () => {
    if (!loadedOrganization) return;
    const target = getTargetById(loadedOrganization, selectedTargetId || `org:${loadedOrganization.$jazz.id}`);
    createTaskInTarget({
      organization: loadedOrganization,
      profile,
      target,
      summary,
      taskType,
    });
    setSummary("");
    setIsCreateDialogOpen(false);
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

  const openCreateDialog = (nextType: LoadedTask["type"]) => {
    setTaskType(nextType);
    setSummary("");
    setIsCreateDialogOpen(true);
  };

  if (!loadedOrganization) {
    return <div className="text-sm text-muted-foreground">Loading active tasks...</div>;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Organization Active Tasks</h2>
        <div className="mt-2 space-y-2">
          <div className="relative w-full sm:max-w-[260px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-7 text-sm sm:h-7 sm:text-xs"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="hidden md:block">
            <OrganizationTaskCreateBar
              organization={loadedOrganization}
              profile={profile}
              selectedTargetId={selectedTargetId || `org:${loadedOrganization.$jazz.id}`}
              onTargetChange={setSelectedTargetId}
              summary={summary}
              onSummaryChange={setSummary}
              taskType={taskType}
              onTaskTypeChange={setTaskType}
              onCreate={createTask}
              trailingActions={(
                <Button type="button" size="sm" variant="outline" className="h-9 w-full text-sm sm:h-7 sm:w-auto sm:text-xs" onClick={archiveCompletedTasks} disabled={completedTaskCount === 0}>
                  Archive Completed Tasks
                </Button>
              )}
            />
          </div>
        </div>
      </div>

      <TaskView
        tasks={taskViewItems}
        viewType="list"
        combineBucketsByType
        title="Active Tasks"
        onTaskSelect={setSelectedTaskId}
      />

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        taskIdPrefix={selectedTaskEntry?.taskKeyPrefix}
        taskHref={orgId && selectedTaskEntry
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
            <DialogDescription>Create a new item and place it in a target backlog.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={taskType}
                onChange={(event) => setTaskType(event.target.value as LoadedTask["type"])}
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTargetId || `org:${loadedOrganization.$jazz.id}`}
                onChange={(event) => setSelectedTargetId(event.target.value)}
              >
                <option value={`org:${loadedOrganization.$jazz.id}`}>Organization Backlog</option>
                {[...loadedOrganization.projects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => (
                  <option key={project.$jazz.id} value={`project:${project.$jazz.id}`}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
              <Input
                className="h-10"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Describe the issue"
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createTask} disabled={!profile || !summary.trim()}>
              Create issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
