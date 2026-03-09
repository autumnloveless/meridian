import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Organization } from "@/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import {
  OrganizationTaskCreateBar,
  ProjectBadge,
  createTaskInTarget,
  ensureDefaultBuckets,
  getBoardColumns,
  getTargetById,
  type LoadedOrganization,
  type LoadedTask,
  useFilteredOrganizationTaskContainers,
} from "@/components/tasks/organizationTasksShared";
import { getTaskDisplayId } from "@/lib/taskIds";

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-slate-100 text-slate-700" },
  { status: "In Progress", title: "In Progress", tone: "bg-blue-100 text-blue-700" },
  { status: "In-Review", title: "In-Review", tone: "bg-amber-100 text-amber-800" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-rose-100 text-rose-800" },
] as const;

export const OrganizationTasksBoardPage = () => {
  const { orgId } = useParams();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskType, setTaskType] = useState<LoadedTask["type"]>("Task");
  const [selectedTargetId, setSelectedTargetId] = useState(() => (orgId ? `org:${orgId}` : ""));
  const [summary, setSummary] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const filtered = useFilteredOrganizationTaskContainers({
    organization: organization.$isLoaded ? (organization as LoadedOrganization) : null,
    search: searchQuery,
    includeArchived: false,
  });

  const columns = useMemo(() => getBoardColumns(filtered), [filtered]);

  const selectedTaskEntry = useMemo(() => {
    if (!selectedTaskId) return null;
    return filtered.find((entry) => entry.task.$jazz.id === selectedTaskId) ?? null;
  }, [filtered, selectedTaskId]);
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
  };

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading active board...</div>;
  }

  if (isMobile) {
    return <Navigate to="../list" replace />;
  }

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-900">Organization Active Board</h2>

        <div className="space-y-2">
          <div className="relative w-full max-w-[240px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-9 border-stone-300 pl-7 text-sm sm:h-7 sm:text-xs"
              placeholder="Search task"
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

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-2 xl:grid-cols-5">
        {boardColumns.map((column) => {
          const entries = columns[column.status];

          return (
            <Card key={column.status} className="h-[calc(100dvh-18rem)] w-[85vw] min-w-[18rem] border border-stone-200 bg-stone-100/60 py-0 md:h-[calc(100vh-16rem)] md:w-auto md:min-w-0">
              <CardHeader className="gap-2 border-b border-stone-200 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-stone-800">{column.title}</CardTitle>
                  <Badge className={`h-5 px-1.5 text-[10px] ${column.tone}`}>{entries.length}</Badge>
                </div>
              </CardHeader>

              <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2 pt-2">
                {entries.length === 0 ? (
                  <div className="rounded border border-dashed border-stone-300 bg-white/60 p-3 text-xs text-stone-500">
                    No tasks
                  </div>
                ) : (
                  entries.map((entry) => (
                    <Card
                      key={entry.task.$jazz.id}
                      className="cursor-pointer border border-stone-200 bg-white py-2 shadow-sm"
                      onClick={() => setSelectedTaskId(entry.task.$jazz.id)}
                    >
                      <CardContent className="space-y-2 px-3">
                        <p className="line-clamp-3 text-[13px] leading-snug font-medium text-stone-800">{entry.task.summary}</p>
                        <div className="flex items-center justify-between gap-2">
                          <ProjectBadge projectName={entry.projectName} />
                          {orgId ? (
                            <Link
                              to={entry.projectId
                                ? `/organizations/${orgId}/projects/${entry.projectId}/tasks/${entry.task.$jazz.id}`
                                : `/organizations/${orgId}/tasks/${entry.task.$jazz.id}`}
                              className="text-[10px] font-medium text-sky-700 hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {getTaskDisplayId(entry.task, entry.taskKeyPrefix)}
                            </Link>
                          ) : (
                            <span className="text-[10px] font-medium text-sky-700">{getTaskDisplayId(entry.task, entry.taskKeyPrefix)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">{entry.task.type}</Badge>
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
                            {(entry.task.assigned_to && entry.task.assigned_to.$isLoaded ? entry.task.assigned_to.name[0] : "?")?.toUpperCase()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
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
    </section>
  );
};
