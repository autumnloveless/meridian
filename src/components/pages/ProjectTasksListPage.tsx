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
import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Account, Project, Task, TaskBucket } from "@/schema";

type BucketType = "Active" | "Backlog" | "Custom";
type TaskType = Task["type"];

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

function TaskRow({ task, bucketId }: { task: Task; bucketId: string }) {
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
      className="border-b bg-background hover:bg-muted/30"
    >
      <td className="w-10 px-2 py-1.5 align-middle">
        <button
          type="button"
          aria-label={`Drag ${task.summary}`}
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="w-24 px-2 py-1.5 text-xs text-muted-foreground">{task.type}</td>
      <td className="px-2 py-1.5 text-sm text-foreground">{task.summary}</td>
      <td className="w-36 px-2 py-1.5 text-xs text-muted-foreground">{task.status}</td>
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

function DragTaskPreview({ task }: { task: Task }) {
  return (
    <div className="w-[520px] max-w-[90vw] rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
      <div className="grid grid-cols-[24px_96px_minmax(0,1fr)_140px] items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{task.type}</span>
        <span className="truncate text-foreground">{task.summary}</span>
        <span className="text-xs text-muted-foreground">{task.status}</span>
      </div>
    </div>
  );
}

function InsertionIndicatorRow() {
  return (
    <tr>
      <td colSpan={4} className="px-2 py-0">
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
          tasks: { $each: true },
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
        TaskBucket.create({
          name: "Active",
          type: "Active",
          order: 0,
          tasks: [],
        })
      );
    }

    if (!hasBacklog) {
      project.task_buckets.$jazz.push(
        TaskBucket.create({
          name: "Backlog",
          type: "Backlog",
          order: 9999,
          tasks: [],
        })
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

  const bucketTypeToTaskStatus = (bucketType: BucketType): Task["status"] =>
    bucketType === "Active" ? "In Progress" : "Backlog";

  const getDraftTask = (bucketId: string): DraftTask =>
    draftTasksByBucketId[bucketId] ?? defaultDraftTask;

  const setDraftTask = (bucketId: string, nextDraft: DraftTask) => {
    setDraftTasksByBucketId((current) => ({ ...current, [bucketId]: nextDraft }));
  };

  const normalizeTaskOrder = (bucket: TaskBucket) => {
    bucket.tasks.forEach((task, index) => {
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
      Task.create({
        summary,
        type: draftTask.taskType,
        assigned_to: profile,
        status: bucketTypeToTaskStatus(bucket.type),
        details: co.richText().create(""),
        custom_fields: {},
        order: bucket.tasks.length + 1,
      })
    );

    setDraftTask(bucketId, { ...draftTask, summary: "" });
  };

  const findBucketByTaskId = (taskId: string) =>
    project.task_buckets.find((bucket) => bucket.tasks.some((task) => task.$jazz.id === taskId));

  const resolveDropTarget = (overId: string) => {
    const overTaskId = parseTaskDndId(overId);
    const overBucketId = parseBucketDndId(overId);

    let targetBucket: TaskBucket | undefined;
    let targetIndex = -1;

    if (overTaskId) {
      targetBucket = findBucketByTaskId(overTaskId);
      if (targetBucket) {
        targetIndex = targetBucket.tasks.findIndex((task) => task.$jazz.id === overTaskId);
      }
    } else if (overBucketId) {
      targetBucket = project.task_buckets.find((bucket) => bucket.$jazz.id === overBucketId);
      if (targetBucket) {
        targetIndex = targetBucket.tasks.length;
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

    const insertAt = Math.min(Math.max(targetIndex, 0), targetBucket.tasks.length);
    targetBucket.tasks.$jazz.splice(insertAt, 0, movedTask);
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

    return (
      <div className="flex items-center justify-between gap-2">
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
          <CardTitle>{bucket.name}</CardTitle>
        )}

        {!isEditing ? (
          <div className="ml-auto flex items-center gap-1">
            {bucket.type === "Backlog" ? (
              <Button size="sm" onClick={createCustomBucket}>
                Create new bucket
              </Button>
            ) : null}

            {isCustom ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "up")}
                  disabled={customIndex <= 0}
                  aria-label={`Move ${bucket.name} up`}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "down")}
                  disabled={customIndex < 0 || customIndex >= customBuckets.length - 1}
                  aria-label={`Move ${bucket.name} down`}
                >
                  Down
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditBucket(bucket.$jazz.id, bucket.name)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeCustomBucket(bucket.$jazz.id)}
                >
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const draggedTask = activeDrag
    ? project.task_buckets
        .flatMap((bucket) => bucket.tasks)
        .find((task) => task.$jazz.id === activeDrag.taskId)
    : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Backlog</h2>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-4">
          {orderedBuckets.map((bucket) => {
            const taskIds = bucket.tasks.map((task) => taskDndId(task.$jazz.id));
            const draftTask = getDraftTask(bucket.$jazz.id);
            const indicatorIndex =
              dropIndicator && dropIndicator.bucketId === bucket.$jazz.id
                ? dropIndicator.index
                : null;

            return (
              <Card key={bucket.$jazz.id} size="sm" className="!gap-0">
                <CardHeader className="border-b">{renderBucketHeader(bucket)}</CardHeader>

                <CardContent className="!p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <thead className="bg-muted/40 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                        <tr>
                          <th className="w-10 px-2 py-1.5 text-left">Drag</th>
                          <th className="w-24 px-2 py-1.5 text-left">Type</th>
                          <th className="px-2 py-1.5 text-left">Summary</th>
                          <th className="w-36 px-2 py-1.5 text-left">Status</th>
                        </tr>
                      </thead>

                      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        <BucketBody bucketId={bucket.$jazz.id}>
                          {bucket.tasks.length === 0 && indicatorIndex === null ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-3 text-sm text-muted-foreground">
                                No tasks in this bucket.
                              </td>
                            </tr>
                          ) : (
                            <>
                              {bucket.tasks.map((task, index) => (
                                <Fragment key={task.$jazz.id}>
                                  {indicatorIndex === index ? <InsertionIndicatorRow /> : null}
                                  <TaskRow task={task} bucketId={bucket.$jazz.id} />
                                </Fragment>
                              ))}
                              {indicatorIndex === bucket.tasks.length ? <InsertionIndicatorRow /> : null}
                            </>
                          )}
                        </BucketBody>
                      </SortableContext>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 border-t px-3 py-3">
                    <select
                      value={draftTask.taskType}
                      onChange={(event) =>
                        setDraftTask(bucket.$jazz.id, {
                          ...draftTask,
                          taskType: event.target.value as TaskType,
                        })
                      }
                      className="h-9 rounded-md border border-stone-300 bg-white px-2 text-sm text-stone-900"
                      aria-label={`Task type for ${bucket.name}`}
                    >
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                    </select>

                    <Input
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
                      placeholder="Add task"
                      aria-label={`New task name for ${bucket.name}`}
                    />

                    <Button
                      onClick={() => createTaskInBucket(bucket.$jazz.id)}
                      disabled={!profile || !draftTask.summary.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DragOverlay>
          {draggedTask ? <DragTaskPreview task={draggedTask} /> : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
};
