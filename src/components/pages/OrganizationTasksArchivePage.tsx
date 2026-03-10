import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Link, useParams } from "react-router";
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
import {
  ProjectBadge,
  createTaskInTarget,
  ensureDefaultBuckets,
  getTargetById,
  type LoadedOrganization,
  type LoadedTask,
  useFilteredOrganizationTaskContainers,
} from "@/components/tasks/organizationTasksShared";
import { getTaskDisplayId } from "@/lib/taskIds";

export const OrganizationTasksArchivePage = () => {
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

  useEffect(() => {
    if (!organization.$isLoaded) return;
    const loadedOrganization = organization as LoadedOrganization;
    ensureDefaultBuckets(loadedOrganization);
    loadedOrganization.projects.forEach((project) => ensureDefaultBuckets(project));
  }, [organization]);

  const archived = useFilteredOrganizationTaskContainers({
    organization: organization.$isLoaded ? (organization as LoadedOrganization) : null,
    search: searchQuery,
    includeArchived: true,
  });

  const selectedTaskEntry = useMemo(() => {
    if (!selectedTaskId) return null;
    return archived.find((entry) => entry.task.$jazz.id === selectedTaskId) ?? null;
  }, [archived, selectedTaskId]);
  const selectedTask = selectedTaskEntry?.task && selectedTaskEntry.task.$isLoaded ? selectedTaskEntry.task : null;

  const createTask = () => {
    if (!organization.$isLoaded) return;
    const loadedOrganization = organization as LoadedOrganization;
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

  const openCreateDialog = (nextType: LoadedTask["type"]) => {
    setTaskType(nextType);
    setSummary("");
    setIsCreateDialogOpen(true);
  };

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading archived tasks...</div>;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Archived Tasks</h2>
        <div className="mt-2 space-y-2">
          <div className="relative w-full sm:max-w-[260px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-9 border-stone-300 pl-7 text-sm sm:h-7 sm:text-xs"
              placeholder="Search archived tasks"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="hidden md:block">
            <div className="font-[Inter] flex flex-wrap items-center gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1.5">
              <select
                value={taskType}
                onChange={(event) => setTaskType(event.target.value as LoadedTask["type"])}
                className="h-7 rounded border border-stone-300 bg-white px-2 text-xs text-stone-800"
                aria-label="Task type"
              >
                <option value="Task">Task</option>
                <option value="Bug">Bug</option>
              </select>

              <select
                value={selectedTargetId || `org:${organization.$jazz.id}`}
                onChange={(event) => setSelectedTargetId(event.target.value)}
                className="h-7 rounded border border-stone-300 bg-white px-2 text-xs text-stone-800"
                aria-label="Target project"
              >
                <option value={`org:${organization.$jazz.id}`}>Organization Backlog</option>
                {[...organization.projects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => (
                  <option key={project.$jazz.id} value={`project:${project.$jazz.id}`}>
                    {project.name}
                  </option>
                ))}
              </select>

              <Input
                className="h-7 min-w-[220px] flex-1 text-xs"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") createTask();
                }}
                placeholder="Create task"
                aria-label="Create task"
              />

              <Button size="sm" className="h-7 text-xs" onClick={createTask} disabled={!profile || !summary.trim()}>
                Create task
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="md:hidden">
        {archived.length === 0 ? (
          <div className="border border-stone-200 bg-white px-3 py-3 text-xs text-stone-500">No archived tasks found.</div>
        ) : (
          <div className="overflow-hidden border border-stone-200 bg-white">
            {archived.map((entry) => {
              const task = entry.task;
              return (
                <button
                  key={task.$jazz.id}
                  type="button"
                  className="w-full border-b border-stone-200 px-2.5 py-2 text-left last:border-b-0"
                  onClick={() => setSelectedTaskId(task.$jazz.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-sky-700">{getTaskDisplayId(task, entry.taskKeyPrefix)}</span>
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
                      {(task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name[0] : "?")?.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-stone-800">{task.summary}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {orgId && entry.projectId ? (
                      <Link
                        to={`/organizations/${orgId}/projects/${entry.projectId}/tasks/list`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex"
                      >
                        <ProjectBadge projectName={entry.projectName} />
                      </Link>
                    ) : (
                      <ProjectBadge projectName={entry.projectName} />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-700">{task.type}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-sm border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-stone-100 text-[10px] uppercase tracking-[0.07em] text-stone-600">
              <tr>
                <th className="w-28 px-1.5 py-1 text-left">Key</th>
                <th className="px-1.5 py-1 text-left">Summary</th>
                <th className="w-28 px-1.5 py-1 text-left">Project</th>
                <th className="w-24 px-1.5 py-1 text-left">Type</th>
                <th className="w-28 px-1.5 py-1 text-left">Status</th>
                <th className="w-12 px-1.5 py-1 text-right">Asg</th>
              </tr>
            </thead>
            <tbody>
              {archived.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-2 text-xs text-stone-500">
                    No archived tasks found.
                  </td>
                </tr>
              ) : (
                archived.map((entry) => {
                  const task = entry.task;
                  return (
                    <tr
                      key={task.$jazz.id}
                      className="border-b border-stone-200 bg-white hover:bg-stone-50"
                      onClick={() => setSelectedTaskId(task.$jazz.id)}
                    >
                      <td className="w-28 px-1.5 py-1 text-[11px] font-medium text-sky-700">
                        {orgId ? (
                          <Link
                            to={entry.projectId
                              ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${task.$jazz.id}`
                              : `/organizations/${orgId}/tasks/${task.$jazz.id}`}
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {getTaskDisplayId(task, entry.taskKeyPrefix)}
                          </Link>
                        ) : (
                          getTaskDisplayId(task, entry.taskKeyPrefix)
                        )}
                      </td>
                      <td className="px-1.5 py-1 text-[13px] text-stone-800">{task.summary}</td>
                      <td className="w-28 px-1.5 py-1"><ProjectBadge projectName={entry.projectName} /></td>
                      <td className="w-24 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-700">{task.type}</td>
                      <td className="w-28 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">{task.status}</td>
                      <td className="w-12 px-1.5 py-1 text-right text-stone-500">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
                          {(task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name[0] : "?")?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Type</span>
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
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Target</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedTargetId || `org:${organization.$jazz.id}`}
                onChange={(event) => setSelectedTargetId(event.target.value)}
              >
                <option value={`org:${organization.$jazz.id}`}>Organization Backlog</option>
                {[...organization.projects].sort((a, b) => a.name.localeCompare(b.name)).map((project) => (
                  <option key={project.$jazz.id} value={`project:${project.$jazz.id}`}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Summary</span>
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
