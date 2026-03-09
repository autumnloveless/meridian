import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Organization } from "@/schema";
import { Input } from "@/components/ui/input";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import {
  OrganizationTaskCreateBar,
  ProjectBadge,
  createTaskInTarget,
  ensureDefaultBuckets,
  getTargetById,
  type LoadedOrganization,
  type LoadedTask,
  useFilteredOrganizationTaskContainers,
} from "@/components/tasks/organizationTasksShared";

export const OrganizationTasksListPage = () => {
  const { orgId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [taskType, setTaskType] = useState<LoadedTask["type"]>("Task");
  const [selectedTargetId, setSelectedTargetId] = useState("");
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

  useEffect(() => {
    if (!organization.$isLoaded) return;
    if (!selectedTargetId) {
      setSelectedTargetId(`org:${organization.$jazz.id}`);
    }
  }, [organization, selectedTargetId]);

  const filtered = useFilteredOrganizationTaskContainers({
    organization: organization.$isLoaded ? (organization as LoadedOrganization) : null,
    search: searchQuery,
    includeArchived: false,
  });

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    const task = filtered.find((entry) => entry.task.$jazz.id === selectedTaskId)?.task ?? null;
    return task && task.$isLoaded ? task : null;
  }, [filtered, selectedTaskId]);

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
  };

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading task backlog...</div>;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Organization Backlog</h2>
        <div className="mt-2 space-y-2">
          <div className="relative w-full max-w-[260px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-7 border-stone-300 pl-7 text-xs"
              placeholder="Search tasks"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <OrganizationTaskCreateBar
            organization={organization}
            profile={profile}
            selectedTargetId={selectedTargetId || `org:${organization.$jazz.id}`}
            onTargetChange={setSelectedTargetId}
            summary={summary}
            onSummaryChange={setSummary}
            taskType={taskType}
            onTaskTypeChange={setTaskType}
            onCreate={createTask}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-stone-200 bg-white">
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-2 text-xs text-stone-500">
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const task = entry.task;
                  return (
                    <tr
                      key={task.$jazz.id}
                      className="border-b border-stone-200 bg-white hover:bg-stone-50"
                      onClick={() => setSelectedTaskId(task.$jazz.id)}
                    >
                      <td className="w-28 px-1.5 py-1 text-[11px] font-medium text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</td>
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

      <TaskDetailsPane open={Boolean(selectedTask)} task={selectedTask} onClose={() => setSelectedTaskId(null)} />
    </section>
  );
};
