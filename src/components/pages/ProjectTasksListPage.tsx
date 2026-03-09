import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, MoreHorizontal, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";
import { Account, Project, Task, TaskBucket } from "@/schema";

type BucketType = "Active" | "Backlog" | "Custom";
type LoadedTask = co.loaded<typeof Task>;
type TaskType = "Task" | "Bug";

type DraftTask = {
  summary: string;
  taskType: TaskType;
};

type ActiveDrag = {
  taskId: string;
  sourceBucketId: string;
};

type DropIndicator = {
  bucketId: string;
  index: number;
};

const defaultDraftTask: DraftTask = {
  summary: "",
  taskType: "Task",
};

const TASK_PREFIX = "task:";
const BUCKET_PREFIX = "bucket:";

const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const bucketDndId = (bucketId: string) => `${BUCKET_PREFIX}${bucketId}`;

const parseTaskDndId = (value: string) =>
  value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null;

const parseBucketDndId = (value: string) =>
  value.startsWith(BUCKET_PREFIX) ? value.slice(BUCKET_PREFIX.length) : null;

const isLoadedTask = (task: unknown): task is LoadedTask =>
  Boolean(task && typeof task === "object" && "$isLoaded" in task && (task as { $isLoaded?: boolean }).$isLoaded);

function TaskRow({
  task,
  bucketId,
  onSelect,
}: {
  task: LoadedTask;
  bucketId: string;
  onSelect: (task: LoadedTask) => void;
}) {
  const sortable = useSortable({
    id: taskDndId(task.$jazz.id),
    data: { taskId: task.$jazz.id, bucketId },
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={sortable.setNodeRef}
      style={style}
      className="border-b border-stone-200 bg-white hover:bg-stone-50"
      onClick={() => onSelect(task)}
    >
      <td className="w-9 px-1.5 py-1 align-middle">
        <button
          type="button"
          aria-label={`Drag ${task.summary}`}
          className="inline-flex h-4 w-4 items-center justify-center rounded text-stone-500 hover:bg-stone-100"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td className="w-28 px-1.5 py-1 text-[11px] font-medium text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</td>
      <td className="px-1.5 py-1 text-[13px] text-stone-800">{task.summary}</td>
      <td className="w-24 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
        {task.tags.length > 0 ? (
          <span className="inline-flex rounded bg-stone-200 px-1.5 py-0.5 text-stone-700">
            {task.tags[0]}
          </span>
        ) : (
          <span className="text-stone-400">-</span>
        )}
      </td>
      <td className="w-28 px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
        {task.status}
      </td>
      <td className="w-12 px-1.5 py-1 text-right text-stone-500">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
          {(task.assigned_to && task.assigned_to.$isLoaded
            ? task.assigned_to.name[0]
            : "?")?.toUpperCase()}
        </span>
      </td>
    </tr>
  );
}

function BucketBody({
  bucketId,
  children,
}: {
  bucketId: string;
  children: React.ReactNode;
}) {
  const droppable = useDroppable({ id: bucketDndId(bucketId) });

  return (
    <tbody
      ref={droppable.setNodeRef}
      className={droppable.isOver ? "bg-muted/40" : undefined}
    >
      {children}
    </tbody>
  );
}

function DragTaskPreview({ task }: { task: LoadedTask }) {
  return (
    <div className="w-[760px] max-w-[94vw] rounded border border-stone-300 bg-white px-2 py-1 text-sm shadow-2xl">
      <div className="grid grid-cols-[20px_96px_minmax(0,1fr)_88px_96px_40px] items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-stone-500" />
        <span className="text-[11px] font-medium text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</span>
        <span className="truncate text-[13px] text-stone-800">{task.summary}</span>
        <span className="text-[10px] font-semibold uppercase text-stone-600">{task.tags[0] ?? "-"}</span>
        <span className="text-[10px] font-semibold uppercase text-stone-600">{task.status}</span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
          {(task.assigned_to && task.assigned_to.$isLoaded
            ? task.assigned_to.name[0]
            : "?")?.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function InsertionIndicatorRow() {
  return (
    <tr>
      <td colSpan={6} className="px-1.5 py-0">
        <div className="h-0.5 w-full rounded bg-primary" />
      </td>
    </tr>
  );
}

export const ProjectTasksListPage = () => {
  const { projectId } = useParams();
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editingBucketName, setEditingBucketName] = useState("");
  const [draftTasksByBucketId, setDraftTasksByBucketId] = useState<Record<string, DraftTask>>({});
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState<"All" | TaskType>("All");
  const [collapsedBucketIds, setCollapsedBucketIds] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

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
      project.task_buckets.$jazz.push(
        {
          name: "Active",
          type: "Active",
          order: 0,
          tasks: [],
        }
      );
    }

    if (!hasBacklog) {
      project.task_buckets.$jazz.push(
        {
          name: "Backlog",
          type: "Backlog",
          order: 9999,
          tasks: [],
        }
      );
    }
  }, [project]);

  const orderedBuckets = useMemo(() => {
    if (!project.$isLoaded) return [];

    const active = project.task_buckets.find((bucket) => bucket.type === "Active");
    const backlog = project.task_buckets.find((bucket) => bucket.type === "Backlog");
    const custom = project.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

    return [active, ...custom, backlog].filter((bucket): bucket is typeof custom[number] => Boolean(bucket));
  }, [project]);

  const customBuckets = useMemo(
    () => orderedBuckets.filter((bucket) => bucket.type === "Custom"),
    [orderedBuckets]
  );

  const bucketTypeToTaskStatus = (bucketType: BucketType): LoadedTask["status"] =>
    bucketType === "Active" ? "In Progress" : "Backlog";

  const getTaskKey = (task: LoadedTask) => `NUC-${Math.max(task.order, 1)}`;

  const isBucketCollapsed = (bucketId: string) => collapsedBucketIds.has(bucketId);

  const toggleBucketCollapsed = (bucketId: string) => {
    setCollapsedBucketIds((current) => {
      const next = new Set(current);
      if (next.has(bucketId)) {
        next.delete(bucketId);
      } else {
        next.add(bucketId);
      }
      return next;
    });
  };

  const getDraftTask = (bucketId: string): DraftTask =>
    draftTasksByBucketId[bucketId] ?? defaultDraftTask;

  const setDraftTask = (bucketId: string, nextDraft: DraftTask) => {
    setDraftTasksByBucketId((current) => ({ ...current, [bucketId]: nextDraft }));
  };

  const normalizeTaskOrder = (bucket: co.loaded<typeof TaskBucket>) => {
    const tasks = bucket.tasks as unknown as LoadedTask[];

    tasks.forEach((task, index) => {
      const nextOrder = index + 1;
      if (task.order !== nextOrder) {
        task.$jazz.set("order", nextOrder);
      }
    });
  };

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading task backlog...</div>;
  }

  const createCustomBucket = () => {
    const nextIndex = customBuckets.length + 1;
    project.task_buckets.$jazz.push(
      TaskBucket.create({
        name: `Bucket ${nextIndex}`,
        type: "Custom",
        order: nextIndex,
        tasks: [],
      })
    );
  };

  const startEditBucket = (bucketId: string, currentName: string) => {
    setEditingBucketId(bucketId);
    setEditingBucketName(currentName);
  };

  const saveBucketName = () => {
    if (!editingBucketId) return;

    const nextName = editingBucketName.trim();
    if (!nextName) return;

    const bucket = project.task_buckets.find((item) => item.$jazz.id === editingBucketId);
    if (!bucket || bucket.type !== "Custom") return;

    bucket.$jazz.set("name", nextName);
    setEditingBucketId(null);
    setEditingBucketName("");
  };

  const cancelEditBucket = () => {
    setEditingBucketId(null);
    setEditingBucketName("");
  };

  const removeCustomBucket = (bucketId: string) => {
    project.task_buckets.$jazz.remove(
      (bucket) => bucket.$jazz.id === bucketId && bucket.type === "Custom"
    );

    const remaining = project.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order);

    remaining.forEach((bucket, index) => {
      bucket.$jazz.set("order", index + 1);
    });

    if (editingBucketId === bucketId) {
      cancelEditBucket();
    }
  };

  const moveCustomBucket = (bucketId: string, direction: "up" | "down") => {
    const orderedCustomIds = customBuckets.map((bucket) => bucket.$jazz.id);
    const currentIndex = orderedCustomIds.findIndex((id) => id === bucketId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedCustomIds.length) return;

    const nextIds = [...orderedCustomIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    nextIds.forEach((id, index) => {
      const bucket = project.task_buckets.find((item) => item.$jazz.id === id);
      if (bucket && bucket.type === "Custom") {
        bucket.$jazz.set("order", index + 1);
      }
    });
  };

  const createTaskInBucket = (bucketId: string) => {
    if (!profile) return;

    const bucket = project.task_buckets.find((item) => item.$jazz.id === bucketId);
    if (!bucket) return;

    const draftTask = getDraftTask(bucketId);
    const summary = draftTask.summary.trim();
    if (!summary) return;

    bucket.tasks.$jazz.push(
      {
        summary,
        type: draftTask.taskType,
        assigned_to: profile,
        status: bucketTypeToTaskStatus(bucket.type),
        details: "",
        custom_fields: {},
        order: bucket.tasks.length + 1,
        tags: [],
      }
    );

    setDraftTask(bucketId, { ...draftTask, summary: "" });
  };

  const findBucketByTaskId = (taskId: string) =>
    project.task_buckets.find((bucket) => bucket.tasks.some((task) => task.$jazz.id === taskId));

  const resolveDropTarget = (overId: string) => {
    const overTaskId = parseTaskDndId(overId);
    const overBucketId = parseBucketDndId(overId);

    let targetBucket: co.loaded<typeof TaskBucket> | undefined;
    let targetIndex = -1;

    if (overTaskId) {
      targetBucket = findBucketByTaskId(overTaskId);
      if (targetBucket) {
        const tasks = targetBucket.tasks as unknown as LoadedTask[];
        targetIndex = tasks.findIndex((task) => task.$jazz.id === overTaskId);
      }
    } else if (overBucketId) {
      targetBucket = project.task_buckets.find((bucket) => bucket.$jazz.id === overBucketId);
      if (targetBucket) {
        const tasks = targetBucket.tasks as unknown as LoadedTask[];
        targetIndex = tasks.length;
      }
    }

    return {
      targetBucket,
      targetIndex,
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseTaskDndId(String(event.active.id));
    if (!taskId) return;

    const sourceBucket = findBucketByTaskId(taskId);
    if (!sourceBucket) return;

    setActiveDrag({ taskId, sourceBucketId: sourceBucket.$jazz.id });
    setDropIndicator({
      bucketId: sourceBucket.$jazz.id,
      index: sourceBucket.tasks.findIndex((task) => task.$jazz.id === taskId),
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || !activeDrag) {
      setDropIndicator(null);
      return;
    }

    const { targetBucket, targetIndex } = resolveDropTarget(overId);

    if (!targetBucket || targetIndex < 0) {
      setDropIndicator(null);
      return;
    }

    setDropIndicator({
      bucketId: targetBucket.$jazz.id,
      index: targetIndex,
    });
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDrag(null);
    setDropIndicator(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeTaskId = parseTaskDndId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : null;

    if (!activeTaskId || !overId || !activeDrag) {
      setActiveDrag(null);
      return;
    }

    const sourceBucket = project.task_buckets.find(
      (bucket) => bucket.$jazz.id === activeDrag.sourceBucketId
    );
    if (!sourceBucket) {
      setActiveDrag(null);
      return;
    }

    const overTaskId = parseTaskDndId(overId);
    const { targetBucket, targetIndex } = resolveDropTarget(overId);

    if (!targetBucket || targetIndex < 0) {
      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const sourceIndex = sourceBucket.tasks.findIndex((task) => task.$jazz.id === activeTaskId);
    if (sourceIndex < 0) {
      setActiveDrag(null);
      return;
    }

    const sameBucket = sourceBucket.$jazz.id === targetBucket.$jazz.id;

    if (sameBucket) {
      const ids = sourceBucket.tasks.map((task) => task.$jazz.id);
      const oldIndex = ids.indexOf(activeTaskId);
      const newIndex = overTaskId ? targetIndex : sourceBucket.tasks.length - 1;

      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        const reordered = arrayMove([...sourceBucket.tasks], oldIndex, newIndex);
        sourceBucket.tasks.$jazz.applyDiff(reordered);
        normalizeTaskOrder(sourceBucket);
      }

      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const removed = sourceBucket.tasks.$jazz.splice(sourceIndex, 1);
    const movedTask = removed[0];
    if (!movedTask) {
      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const targetTasks = targetBucket.tasks as unknown as LoadedTask[];
    const insertAt = Math.min(Math.max(targetIndex, 0), targetTasks.length);
    (targetBucket.tasks.$jazz as { splice: (start: number, deleteCount: number, ...items: LoadedTask[]) => void }).splice(insertAt, 0, movedTask);
    movedTask.$jazz.set("status", bucketTypeToTaskStatus(targetBucket.type));

    normalizeTaskOrder(sourceBucket);
    normalizeTaskOrder(targetBucket);

    setActiveDrag(null);
    setDropIndicator(null);
  };

  const renderBucketHeader = (bucket: (typeof orderedBuckets)[number]) => {
    const isCustom = bucket.type === "Custom";
    const customIndex = customBuckets.findIndex((item) => item.$jazz.id === bucket.$jazz.id);
    const isEditing = editingBucketId === bucket.$jazz.id;
    const collapsed = isBucketCollapsed(bucket.$jazz.id);
    const taskTypeCounts = bucket.tasks.reduce(
      (counts, task) => {
        const normalizedType = String((task as { type?: string }).type ?? "").toLowerCase();
        if (normalizedType === "task") counts.task += 1;
        if (normalizedType === "bug") counts.bug += 1;
        return counts;
      },
      { task: 0, bug: 0 }
    );

    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5">
        {isEditing ? (
          <div className="flex w-full items-center gap-2">
            <Input
              value={editingBucketName}
              onChange={(event) => setEditingBucketName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveBucketName();
                if (event.key === "Escape") cancelEditBucket();
              }}
              className="h-8"
              autoFocus
            />
            <Button size="sm" onClick={saveBucketName}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEditBucket}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900"
            onClick={() => toggleBucketCollapsed(bucket.$jazz.id)}
            aria-expanded={!collapsed}
            aria-label={`${collapsed ? "Expand" : "Collapse"} bucket ${bucket.name}`}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`} />
            <span className="font-semibold text-stone-800">{bucket.name}</span>
            <span>{`${bucket.tasks.length} issue${bucket.tasks.length === 1 ? "" : "s"}`}</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[10px] font-semibold text-sky-700">
                {taskTypeCounts.task}
              </span>
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-semibold text-red-700">
                {taskTypeCounts.bug}
              </span>
            </span>
          </button>
        )}

        {!isEditing ? (
          <div className="ml-auto flex items-center gap-1">
            {bucket.type === "Backlog" ? (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={createCustomBucket}>
                Create new bucket
              </Button>
            ) : null}

            {bucket.type !== "Backlog" ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-stone-600">
                Archive completed tasks
              </Button>
            ) : null}

            {isCustom ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "up")}
                  disabled={customIndex <= 0}
                  aria-label={`Move ${bucket.name} up`}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "down")}
                  disabled={customIndex < 0 || customIndex >= customBuckets.length - 1}
                  aria-label={`Move ${bucket.name} down`}
                >
                  Down
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => startEditBucket(bucket.$jazz.id, bucket.name)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs"
                  onClick={() => removeCustomBucket(bucket.$jazz.id)}
                >
                  Delete
                </Button>
              </>
            ) : null}

            <Button size="sm" variant="ghost" className="h-7 w-7 px-0 text-stone-600" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  const draggedTask = activeDrag
    ? project.task_buckets
        .flatMap((bucket) => bucket.tasks)
        .find((task): task is LoadedTask => task.$jazz.id === activeDrag.taskId && isLoadedTask(task)) ?? null
    : null;

  const selectedTask = selectedTaskId
    ? project.task_buckets
        .flatMap((bucket) => bucket.tasks)
        .find((task): task is LoadedTask => task.$jazz.id === selectedTaskId && isLoadedTask(task)) ?? null
    : null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">Backlog</h2>
        <div className="font-[Inter] mt-2 flex flex-wrap items-center gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1.5">
          <div className="relative w-full max-w-[220px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-7 border-stone-300 pl-7 text-xs"
              placeholder="Search by summary, key, assignee"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <select
            className="h-7 rounded border border-stone-300 bg-white px-2 text-xs text-stone-700"
            value={ticketTypeFilter}
            onChange={(event) => setTicketTypeFilter(event.target.value as "All" | TaskType)}
            aria-label="Filter by ticket type"
          >
            <option value="All">All types</option>
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
          </select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-3 font-[Inter]">
          {orderedBuckets.map((bucket) => {
            const normalizedQuery = searchQuery.trim().toLowerCase();
            const filteredTasks = bucket.tasks.filter((task) => {
              if (ticketTypeFilter !== "All" && task.type !== ticketTypeFilter) {
                return false;
              }

              if (!normalizedQuery) return true;

              const keyText = getTaskKey(task).toLowerCase();
              const summaryText = task.summary.toLowerCase();
              const assigneeText =
                task.assigned_to && task.assigned_to.$isLoaded
                  ? task.assigned_to.name.toLowerCase()
                  : "";

              return (
                summaryText.includes(normalizedQuery) ||
                keyText.includes(normalizedQuery) ||
                assigneeText.includes(normalizedQuery)
              );
            });

            const taskIds = filteredTasks.map((task) => taskDndId(task.$jazz.id));
            const draftTask = getDraftTask(bucket.$jazz.id);
            const collapsed = isBucketCollapsed(bucket.$jazz.id);
            const indicatorIndex =
              dropIndicator && dropIndicator.bucketId === bucket.$jazz.id
                ? dropIndicator.index
                : null;

            return (
              <div key={bucket.$jazz.id} className="overflow-hidden rounded-sm border border-stone-200 bg-white">
                <div className="border-b border-stone-200 bg-stone-100">
                  {renderBucketHeader(bucket)}
                </div>

                {!collapsed ? (
                  <div className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed border-collapse text-sm">
                        <thead className="bg-stone-100 text-[10px] uppercase tracking-[0.07em] text-stone-600">
                          <tr>
                            <th className="w-9 px-1.5 py-1 text-left" />
                            <th className="w-28 px-1.5 py-1 text-left">Key</th>
                            <th className="px-1.5 py-1 text-left">Summary</th>
                            <th className="w-24 px-1.5 py-1 text-left">Tag</th>
                            <th className="w-28 px-1.5 py-1 text-left">Status</th>
                            <th className="w-12 px-1.5 py-1 text-right">Asg</th>
                          </tr>
                        </thead>

                        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                          <BucketBody bucketId={bucket.$jazz.id}>
                            {filteredTasks.length === 0 && indicatorIndex === null ? (
                              <tr>
                                <td colSpan={6} className="px-2 py-2 text-xs text-stone-500">
                                  No tasks in this bucket.
                                </td>
                              </tr>
                            ) : (
                              <>
                                {filteredTasks.map((task, index) => (
                                  <Fragment key={task.$jazz.id}>
                                    {indicatorIndex === index ? <InsertionIndicatorRow /> : null}
                                    <TaskRow
                                      task={task}
                                      bucketId={bucket.$jazz.id}
                                      onSelect={(nextTask) => setSelectedTaskId(nextTask.$jazz.id)}
                                    />
                                  </Fragment>
                                ))}
                                {indicatorIndex === filteredTasks.length ? <InsertionIndicatorRow /> : null}
                              </>
                            )}
                          </BucketBody>
                        </SortableContext>
                      </table>
                    </div>

                    <div className="flex items-center gap-2 border-t border-stone-200 bg-stone-50 px-2 py-1.5">
                      <select
                        value={draftTask.taskType}
                        onChange={(event) =>
                          setDraftTask(bucket.$jazz.id, {
                            ...draftTask,
                            taskType: event.target.value as TaskType,
                          })
                        }
                        className="h-7 rounded border border-stone-300 bg-white px-2 text-xs text-stone-800"
                        aria-label={`Task type for ${bucket.name}`}
                      >
                        <option value="Task">Task</option>
                        <option value="Bug">Bug</option>
                      </select>

                      <Input
                        className="h-7 text-xs"
                        value={draftTask.summary}
                        onChange={(event) =>
                          setDraftTask(bucket.$jazz.id, {
                            ...draftTask,
                            summary: event.target.value,
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            createTaskInBucket(bucket.$jazz.id);
                          }
                        }}
                        placeholder="Create issue"
                        aria-label={`New task name for ${bucket.name}`}
                      />

                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => createTaskInBucket(bucket.$jazz.id)}
                        disabled={!profile || !draftTask.summary.trim()}
                      >
                        Create issue
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {draggedTask ? <DragTaskPreview task={draggedTask} /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailsPane
        open={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
      />
    </section>
  );
};
