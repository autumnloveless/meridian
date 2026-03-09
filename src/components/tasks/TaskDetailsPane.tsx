import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { co } from "jazz-tools";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ObjectFieldsEditor } from "@/components/ui/object-fields-editor";
import { Task as TaskSchema } from "@/schema";
import type { TaskAssigneeOption } from "@/components/tasks/useProjectAssigneeOptions";
import { getTaskDisplayId } from "@/lib/taskIds";

type LoadedTask = co.loaded<typeof TaskSchema>;

type TaskDetailsPaneProps = {
  task: LoadedTask | null;
  open: boolean;
  onClose: () => void;
  assigneeOptions?: TaskAssigneeOption[];
  taskIdPrefix?: string;
  taskHref?: string;
  onArchive?: () => void;
  onDelete?: () => void;
};

const taskStatuses: LoadedTask["status"][] = [
  "Backlog",
  "In Progress",
  "In-Review",
  "Completed",
  "Cancelled",
  "Archived",
];

const taskTypes: LoadedTask["type"][] = ["Task", "Bug"];

export function TaskDetailsPane({ task, open, onClose, assigneeOptions = [], taskIdPrefix, taskHref, onArchive, onDelete }: TaskDetailsPaneProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setIsDeleteConfirmOpen(false);
    }
  }, [open]);

  const tagsValue = useMemo(() => (task ? task.tags.join(", ") : ""), [task]);
  const detailsText = useMemo(() => {
    if (!task || !task.details.$isLoaded) return "";
    return task.details.toString();
  }, [task]);
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

  if (!open || !task) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close task details"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      <aside className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] w-full flex-col rounded-t-xl border border-stone-200 bg-white shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:max-w-[420px] md:rounded-none md:border-l md:border-t-0">
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Task details
            </p>
            <p className="text-xs text-sky-700">{getTaskDisplayId(task, taskIdPrefix)}</p>
          </div>
          <div className="flex items-center gap-2">
            {taskHref ? (
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={taskHref}>Open page</Link>
              </Button>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" aria-label="Task actions">
                  <MoreHorizontal className="size-4" />
                  More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    if (onArchive) {
                      onArchive();
                    } else {
                      task.$jazz.set("status", "Archived");
                    }
                    onClose();
                  }}
                >
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={!onDelete}
                  onSelect={() => {
                    if (!onDelete) return;
                    setIsDeleteConfirmOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Summary</span>
            <Input
              value={task.summary}
              onChange={(event) => task.$jazz.set("summary", event.target.value)}
              placeholder="Task summary"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Type</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={task.type}
                onChange={(event) => task.$jazz.set("type", event.target.value as LoadedTask["type"])}
              >
                {taskTypes.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={task.status}
                onChange={(event) =>
                  task.$jazz.set("status", event.target.value as LoadedTask["status"])
                }
              >
                {taskStatuses.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Assignee</span>
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
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tags</span>
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
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Details</span>
            <textarea
              className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={detailsText}
              onChange={(event) => {
                if (task.details.$isLoaded) {
                  task.details.$jazz.applyDiff(event.target.value);
                }
              }}
              placeholder="Write task details"
            />
          </label>

          <div className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Custom fields (JSON)</span>
            <ObjectFieldsEditor
              key={task.$jazz.id}
              value={task.custom_fields}
              addLabel="Add custom field"
              onChange={(nextObject) => {
                task.$jazz.set("custom_fields", nextObject);
              }}
            />
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title="Delete task"
        description="This will permanently remove the task."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          if (!onDelete) return;
          onDelete();
          setIsDeleteConfirmOpen(false);
          onClose();
        }}
      />
    </>
  );
}
