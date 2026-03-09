import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { MoreHorizontal, Search } from "lucide-react";
import { useCoState } from "jazz-tools/react";

import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "@/schema";
import { getTaskDisplayId } from "@/lib/taskIds";

type ArchivedTaskEntry = {
  task: any;
  bucket: any;
};

export const ProjectTasksArchivePage = () => {
  const { orgId, projectId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ArchivedTaskEntry | null>(null);

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
    if (!pendingDelete) return;

    const stillExists = project.$isLoaded
      ? project.task_buckets.some((bucket) =>
          bucket.tasks.some((task) => task.$jazz.id === pendingDelete.task.$jazz.id),
        )
      : false;

    if (!stillExists) {
      setPendingDelete(null);
    }
  }, [pendingDelete, project]);

  const archived = useMemo(() => {
    if (!project.$isLoaded) return [] as ArchivedTaskEntry[];

    const query = searchQuery.trim().toLowerCase();
    const entries: ArchivedTaskEntry[] = [];

    for (const bucket of project.task_buckets.map((entry) => entry)) {
      for (const task of bucket.tasks.map((entry) => entry)) {
        if (task.status !== "Archived") continue;

        if (query) {
          const key = getTaskDisplayId(task, project.project_key).toLowerCase();
          const summary = task.summary.toLowerCase();
          const assignee = task.assigned_to?.$isLoaded ? task.assigned_to.name.toLowerCase() : "";
          if (!key.includes(query) && !summary.includes(query) && !assignee.includes(query)) {
            continue;
          }
        }

        entries.push({ task, bucket });
      }
    }

    return entries.sort((a, b) => a.task.order - b.task.order || a.task.summary.localeCompare(b.task.summary));
  }, [project, searchQuery]);

  if (!orgId || !projectId) {
    return <div className="text-sm text-red-700">Invalid project URL.</div>;
  }

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading archived tasks...</div>;
  }

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-900">Archived Tasks</h2>

        <div className="relative w-full sm:max-w-[260px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
          <Input
            className="h-9 border-stone-300 pl-7 text-sm sm:h-7 sm:text-xs"
            placeholder="Search archived tasks"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
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
                <th className="w-24 px-1.5 py-1 text-left">Type</th>
                <th className="w-28 px-1.5 py-1 text-left">Status</th>
                <th className="w-12 px-1.5 py-1 text-right">Asg</th>
                <th className="w-12 px-1.5 py-1 text-right" />
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
                    <tr key={task.$jazz.id} className="border-b border-stone-200 bg-white hover:bg-stone-50">
                      <td className="w-28 px-1.5 py-1 text-[11px] font-medium text-sky-700">
                        <Link
                          to={`/organizations/${orgId}/projects/${projectId}/tasks/${task.$jazz.id}`}
                          className="hover:underline"
                        >
                          {getTaskDisplayId(task, project.project_key)}
                        </Link>
                      </td>
                      <td className="px-1.5 py-1 text-[13px] text-stone-800">{task.summary}</td>
                      <td className="w-24 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-700">{task.type}</td>
                      <td className="w-28 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">{task.status}</td>
                      <td className="w-12 px-1.5 py-1 text-right text-stone-500">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
                          {(task.assigned_to && task.assigned_to.$isLoaded ? task.assigned_to.name[0] : "?")?.toUpperCase()}
                        </span>
                      </td>
                      <td className="w-12 px-1.5 py-1 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="icon-sm" variant="ghost" aria-label="Task actions">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                task.$jazz.set("status", "Backlog");
                              }}
                            >
                              Restore
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => setPendingDelete(entry)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete task"
        description="This will permanently remove the archived task."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!pendingDelete) return;
          const nextTasks = pendingDelete.bucket.tasks.filter((candidate: any) => candidate.$jazz.id !== pendingDelete.task.$jazz.id);
          pendingDelete.bucket.tasks.$jazz.applyDiff(nextTasks);
          setPendingDelete(null);
        }}
      />
    </section>
  );
};