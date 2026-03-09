import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Group, co } from "jazz-tools";
import { useCoState } from "jazz-tools/react";
import { MoreHorizontal } from "lucide-react";

import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ObjectFieldsEditor } from "@/components/ui/object-fields-editor";
import { Account, Organization } from "@/schema";
import { getTaskDisplayId } from "@/lib/taskIds";

type TaskAssigneeOption = {
  id: string;
  name: string;
  profile: co.loaded<typeof Account, { profile: true }>["profile"];
};

const canAssignRole = (role: string | undefined) =>
  role === "reader" || role === "writer" || role === "manager" || role === "admin";

const taskStatuses = [
  "Backlog",
  "In Progress",
  "In-Review",
  "Completed",
  "Cancelled",
  "Archived",
] as const;

const taskTypes = ["Task", "Bug"] as const;

export const OrganizationTaskDetailsPage = () => {
  const { orgId, taskId } = useParams();
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState<TaskAssigneeOption[]>([]);

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
    },
  });

  const ownerGroup = useCoState(
    Group,
    organization.$isLoaded ? organization.$jazz.owner.$jazz.id : undefined,
  );

  const memberRoleKey = useMemo(() => {
    if (!ownerGroup.$isLoaded) return "";
    return ownerGroup.members
      .map((member) => `${member.id}:${ownerGroup.getRoleOf(member.id) ?? ""}`)
      .sort((left, right) => left.localeCompare(right))
      .join("|");
  }, [ownerGroup.$isLoaded, ownerGroup.$isLoaded ? ownerGroup.members.length : 0]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!ownerGroup.$isLoaded) {
        setAssigneeOptions([]);
        return;
      }

      const eligibleIds = ownerGroup.members
        .map((member) => member.id)
        .filter((memberId) => canAssignRole(ownerGroup.getRoleOf(memberId)));

      if (eligibleIds.length === 0) {
        setAssigneeOptions([]);
        return;
      }

      const loadedAccounts = await Promise.all(
        eligibleIds.map((memberId) =>
          Account.load(memberId, { resolve: { profile: true } }).catch(() => null),
        ),
      );

      if (cancelled) return;

      const next = loadedAccounts
        .filter((account): account is co.loaded<typeof Account, { profile: true }> =>
          Boolean(account && account.$isLoaded && account.profile && account.profile.$isLoaded),
        )
        .map((account) => ({
          id: account.profile.$jazz.id,
          name: account.profile.name || account.$jazz.id,
          profile: account.profile,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      setAssigneeOptions(next);
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [memberRoleKey, ownerGroup.$isLoaded]);

  const taskWithBucket = useMemo(() => {
    if (!organization.$isLoaded || !taskId) return null;

    const buckets = organization.task_buckets.map((bucket) => bucket);
    for (const bucket of buckets) {
      const task = bucket.tasks.find((candidate: any) => candidate.$jazz.id === taskId);
      if (task) {
        return { bucket, task };
      }
    }

    return null;
  }, [organization, taskId]);

  const task = taskWithBucket?.task ?? null;
  const bucket = taskWithBucket?.bucket ?? null;
  const detailsText = task && task.details.$isLoaded ? task.details.toString() : "";
  const tagsValue = task ? task.tags.join(", ") : "";
  const selectedAssigneeId = task?.assigned_to?.$isLoaded ? task.assigned_to.$jazz.id : "";
  const selectedAssigneeName = task?.assigned_to?.$isLoaded ? task.assigned_to.name : "Unassigned";

  const assigneeSelectOptions = useMemo(() => {
    if (!selectedAssigneeId || assigneeOptions.some((option) => option.id === selectedAssigneeId)) {
      return assigneeOptions;
    }

    if (!task?.assigned_to?.$isLoaded) {
      return assigneeOptions;
    }

    return [
      { id: selectedAssigneeId, name: selectedAssigneeName || selectedAssigneeId, profile: task.assigned_to },
      ...assigneeOptions,
    ];
  }, [assigneeOptions, selectedAssigneeId, selectedAssigneeName, task]);

  if (!orgId || !taskId) {
    return <div className="text-sm text-red-700">Invalid task URL.</div>;
  }

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading task details...</div>;
  }

  if (!task || !bucket) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">Task not found in this organization.</p>
        <Button type="button" variant="outline" asChild>
          <Link to={`/organizations/${orgId}/tasks/list`}>Back to Tasks</Link>
        </Button>
      </section>
    );
  }

  const taskDisplayId = getTaskDisplayId(task, organization.project_key);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Task</p>
          <h2 className="text-xl font-semibold text-foreground">{task.summary}</h2>
          <p className="text-xs text-sky-700">{taskDisplayId}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={`/organizations/${orgId}/tasks/list`}>Back</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Task actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  task.$jazz.set("status", "Archived");
                  navigate(`/organizations/${orgId}/tasks/archive`);
                }}
              >
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setIsDeleteOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
            <Input
              value={task.summary}
              onChange={(event) => task.$jazz.set("summary", event.target.value)}
              placeholder="Task summary"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={task.type}
                onChange={(event) => task.$jazz.set("type", event.target.value as typeof taskTypes[number])}
              >
                {taskTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={task.status}
                onChange={(event) => task.$jazz.set("status", event.target.value as typeof taskStatuses[number])}
              >
                {taskStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignee</span>
              {assigneeSelectOptions.length > 0 ? (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedAssigneeId}
                  onChange={(event) => {
                    const next = assigneeSelectOptions.find((option) => option.id === event.target.value);
                    if (!next) return;
                    task.$jazz.set("assigned_to", next.profile);
                  }}
                >
                  {assigneeSelectOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input value={selectedAssigneeName} readOnly />
              )}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bucket</span>
              <Input value={bucket.name} readOnly />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</span>
            <Input
              value={tagsValue}
              onChange={(event) => {
                const nextTags = event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);

                task.$jazz.set("tags", nextTags);
              }}
              placeholder="tag-a, tag-b"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
            <textarea
              className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={detailsText}
              onChange={(event) => {
                if (task.details.$isLoaded) {
                  task.details.$jazz.applyDiff(event.target.value);
                }
              }}
              placeholder="Write task details"
            />
          </label>

          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom fields (Object)</span>
            <ObjectFieldsEditor
              key={task.$jazz.id}
              value={task.custom_fields}
              addLabel="Add custom field"
              onChange={(nextObject) => task.$jazz.set("custom_fields", nextObject)}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete task"
        description="This will permanently remove the task from this organization."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          const nextTasks = bucket.tasks.filter((candidate: any) => candidate.$jazz.id !== task.$jazz.id);
          bucket.tasks.$jazz.applyDiff(nextTasks);
          setIsDeleteOpen(false);
          navigate(`/organizations/${orgId}/tasks/list`);
        }}
      />
    </section>
  );
};
