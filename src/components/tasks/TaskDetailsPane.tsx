import { useEffect, useMemo, useState } from "react";
import { co } from "jazz-tools";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Task as TaskSchema } from "@/schema";

type LoadedTask = co.loaded<typeof TaskSchema>;

type TaskDetailsPaneProps = {
  task: LoadedTask | null;
  open: boolean;
  onClose: () => void;
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

export function TaskDetailsPane({ task, open, onClose }: TaskDetailsPaneProps) {
  const [customFieldsDraft, setCustomFieldsDraft] = useState("{}");

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
    if (!task) {
      setCustomFieldsDraft("{}");
      return;
    }

    setCustomFieldsDraft(JSON.stringify(task.custom_fields, null, 2));
  }, [task]);

  const tagsValue = useMemo(() => (task ? task.tags.join(", ") : ""), [task]);
  const detailsText = useMemo(() => {
    if (!task || !task.details.$isLoaded) return "";
    return task.details.toString();
  }, [task]);
  const customFieldsError = useMemo(() => {
    try {
      JSON.parse(customFieldsDraft || "{}");
      return null;
    } catch {
      return "Invalid JSON";
    }
  }, [customFieldsDraft]);

  if (!open || !task) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close task details"
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[420px] flex-col border-l border-stone-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              Task details
            </p>
            <p className="text-xs text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Summary</span>
            <Input
              value={task.summary}
              onChange={(event) => task.$jazz.set("summary", event.target.value)}
              placeholder="Task summary"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
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

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Custom fields (JSON)</span>
            <textarea
              className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={customFieldsDraft}
              onChange={(event) => setCustomFieldsDraft(event.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-rose-600">{customFieldsError ?? ""}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={Boolean(customFieldsError)}
                onClick={() => {
                  const parsed = JSON.parse(customFieldsDraft || "{}");
                  task.$jazz.set("custom_fields", parsed);
                }}
              >
                Apply JSON
              </Button>
            </div>
          </label>
        </div>
      </aside>
    </>
  );
}
