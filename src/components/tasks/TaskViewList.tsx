import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  TaskViewItem,
  TaskViewListSection,
  TaskViewListTaskMovePayload,
} from "@/components/tasks/TaskView.types";

const TASK_PREFIX = "task-view-list-task:";
const BUCKET_PREFIX = "task-view-list-bucket:";

const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const bucketDndId = (bucketId: string) => `${BUCKET_PREFIX}${bucketId}`;
const parseTaskDndId = (value: string) => (value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null);
const parseBucketDndId = (value: string) => (value.startsWith(BUCKET_PREFIX) ? value.slice(BUCKET_PREFIX.length) : null);

const matchesTaskQuery = (task: TaskViewItem, searchQuery: string) => {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) return true;

  return [
    task.summary,
    task.taskKey,
    task.type,
    task.status,
    task.bucketName ?? "",
    task.projectLabel ?? "",
    task.assigneeName ?? "",
  ].some((value) => value.toLowerCase().includes(normalized));
};

const TaskListRow = ({ task, onSelect }: { task: TaskViewItem; onSelect?: (taskId: string) => void }) => {
  const isCompleted = task.status === "Completed";

  return (
    <tr className="cursor-pointer border-t hover:bg-muted/40" onClick={() => onSelect?.(task.id)}>
      <td className={`px-2 py-1 text-xs font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}>
        {task.taskHref ? (
          <Link to={task.taskHref} className="hover:underline" onClick={(event) => event.stopPropagation()}>
            {task.taskKey}
          </Link>
        ) : (
          task.taskKey
        )}
      </td>
      <td className={`px-2 py-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.summary}</td>
      <td className={`px-2 py-1 text-xs text-muted-foreground ${isCompleted ? "line-through" : ""}`}>
        {task.projectHref ? (
          <Link to={task.projectHref} className="hover:text-foreground hover:underline" onClick={(event) => event.stopPropagation()}>
            {task.projectLabel ?? "Organization"}
          </Link>
        ) : (
          task.projectLabel ?? "Organization"
        )}
      </td>
      <td className="px-2 py-1 text-xs text-right text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
          {(task.assigneeInitial ?? "?").toUpperCase()}
        </span>
      </td>
      <td className="px-2 py-1 text-xs uppercase">{task.status}</td>
    </tr>
  );
};

function BucketBody({
  bucketId,
  children,
}: {
  bucketId: string;
  children: React.ReactNode;
}) {
  const droppable = useDroppable({ id: bucketDndId(bucketId) });

  return (
    <tbody ref={droppable.setNodeRef} className={droppable.isOver ? "bg-muted/40" : undefined}>
      {children}
    </tbody>
  );
}

function InsertionIndicatorRow() {
  return (
    <tr>
      <td colSpan={7} className="px-1.5 py-0">
        <div className="h-0.5 w-full rounded bg-primary" />
      </td>
    </tr>
  );
}

function DragTaskPreview({ task }: { task: TaskViewItem }) {
  const isCompleted = task.status === "Completed";

  return (
    <div className="w-[680px] max-w-[96vw] rounded border border-border bg-card px-2 py-1 text-sm shadow-2xl">
      <div className="grid grid-cols-[20px_90px_minmax(0,1fr)_74px_88px_40px] items-center gap-1.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        <span className={`text-xs font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}>{task.taskKey}</span>
        <span className={`truncate text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.summary}</span>
        <span className="text-xs font-semibold uppercase text-muted-foreground">{task.tags?.[0] ?? "-"}</span>
        <span className="text-xs font-semibold uppercase text-muted-foreground">{task.status}</span>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          {(task.assigneeInitial ?? "?").toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function DetailedTaskRow({
  task,
  bucketId,
  canMoveUp,
  canMoveDown,
  onSelect,
  onMoveUp,
  onMoveDown,
}: {
  task: TaskViewItem;
  bucketId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect?: (taskId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const sortable = useSortable({
    id: taskDndId(task.id),
    data: { taskId: task.id, bucketId },
  });
  const isCompleted = task.status === "Completed";

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={sortable.setNodeRef}
      style={style}
      className="border-b border-border/70 bg-card hover:bg-muted/40"
      onClick={() => onSelect?.(task.id)}
    >
      <td className="w-9 px-1.5 py-1 align-middle">
        <button
          type="button"
          aria-label={`Drag ${task.summary}`}
          className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td className={`w-28 px-1.5 py-1 text-xs font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}>
        {task.taskHref ? (
          <Link to={task.taskHref} className="hover:underline" onClick={(event) => event.stopPropagation()}>
            {task.taskKey}
          </Link>
        ) : (
          task.taskKey
        )}
      </td>
      <td className={`px-1.5 py-1 text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.summary}</td>
      <td className="w-24 px-1.5 py-1 text-xs font-semibold uppercase tracking-wide">
        {task.tags && task.tags.length > 0 ? (
          <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-foreground">{task.tags[0]}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="w-28 px-1.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{task.status}</td>
      <td className="w-12 px-1.5 py-1 text-right text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          {(task.assigneeInitial ?? "?").toUpperCase()}
        </span>
      </td>
      <td className="w-16 px-1.5 py-1">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
            disabled={!canMoveUp}
            aria-label={`Move ${task.summary} up`}
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
            disabled={!canMoveDown}
            aria-label={`Move ${task.summary} down`}
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DetailedBucketSection({
  section,
  searchQuery,
  collapsedBucketIds,
  editingBucketId,
  editingBucketName,
  onEditingBucketNameChange,
  onToggleCollapsed,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onTaskSelect,
  onListTaskMove,
  dropIndicator,
}: {
  section: TaskViewListSection;
  searchQuery: string;
  collapsedBucketIds: Set<string>;
  editingBucketId: string | null;
  editingBucketName: string;
  onEditingBucketNameChange: (value: string) => void;
  onToggleCollapsed: (bucketId: string) => void;
  onStartEdit: (bucketId: string, currentName: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onTaskSelect?: (taskId: string) => void;
  onListTaskMove?: (payload: TaskViewListTaskMovePayload) => void;
  dropIndicator: { bucketId: string; overTaskId: string | null } | null;
}) {
  const visibleBuckets = section.buckets.map((bucket) => ({
    ...bucket,
    visibleTasks: bucket.tasks.filter((task) => matchesTaskQuery(task, searchQuery)),
  }));
  const taskBucketOptions = section.buckets.map((bucket) => ({ id: bucket.id, name: bucket.name }));

  return (
    <div className="space-y-3">
      {section.title ? (
        <div className="px-0.5">
          {section.titleHref ? (
            <Link to={section.titleHref} className="text-sm font-semibold text-foreground hover:underline">
              {section.title}
            </Link>
          ) : (
            <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
          )}
        </div>
      ) : null}

      {visibleBuckets.map((bucket) => {
        const isEditing = editingBucketId === bucket.id;
        const isCollapsed = collapsedBucketIds.has(bucket.id);
        const indicatorIndex = dropIndicator && dropIndicator.bucketId === bucket.id
          ? (dropIndicator.overTaskId
            ? bucket.visibleTasks.findIndex((task) => task.id === dropIndicator.overTaskId)
            : bucket.visibleTasks.length)
          : null;

        return (
          <div key={bucket.id} className="overflow-hidden rounded-md border border-border/70 bg-card">
            <div className="border-b border-border/70 bg-muted/55">
              <div className="flex items-center justify-between gap-2 px-3 py-1.5">
                {isEditing ? (
                  <div className="flex w-full items-center gap-2">
                    <Input
                      value={editingBucketName}
                      onChange={(event) => onEditingBucketNameChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onSaveEdit();
                        if (event.key === "Escape") onCancelEdit();
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" onClick={onSaveEdit}>Save</Button>
                    <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => onToggleCollapsed(bucket.id)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${isCollapsed ? "Expand" : "Collapse"} bucket ${bucket.name}`}
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`} />
                    <span className="font-semibold text-foreground">{bucket.name}</span>
                    <span>{`${bucket.tasks.length} issue${bucket.tasks.length === 1 ? "" : "s"}`}</span>
                  </button>
                )}

                {!isEditing ? (
                  <div className="ml-auto flex items-center gap-1">
                    {bucket.onCreateBucket ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 px-0 text-xs sm:w-auto sm:px-2"
                        onClick={bucket.onCreateBucket}
                        aria-label="Create new bucket"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Create new bucket</span>
                      </Button>
                    ) : null}

                    {bucket.onArchiveCompleted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={bucket.onArchiveCompleted}
                        disabled={bucket.archiveCompletedDisabled}
                      >
                        Archive Completed Tasks
                      </Button>
                    ) : null}

                    {bucket.onMoveBucket ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => bucket.onMoveBucket?.("up")}
                          disabled={!bucket.canMoveUp}
                          aria-label={`Move ${bucket.name} up`}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => bucket.onMoveBucket?.("down")}
                          disabled={!bucket.canMoveDown}
                          aria-label={`Move ${bucket.name} down`}
                        >
                          Down
                        </Button>
                      </>
                    ) : null}

                    {bucket.onRename ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onStartEdit(bucket.id, bucket.name)}>
                        Edit
                      </Button>
                    ) : null}

                    {bucket.onDeleteBucket ? (
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={bucket.onDeleteBucket}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {!isCollapsed ? (
              <div className="p-0">
                <div className="space-y-0 md:hidden">
                  {bucket.visibleTasks.length === 0 ? (
                    <div className="border-b border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground last:border-b-0">
                      {bucket.emptyMessage ?? "No tasks in this bucket."}
                    </div>
                  ) : (
                    bucket.visibleTasks.map((task) => {
                      const currentIndex = bucket.tasks.findIndex((candidate) => candidate.id === task.id);

                      return (
                        <div
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          className="w-full border-b border-border/70 bg-card px-2.5 py-2 text-left last:border-b-0"
                          onClick={() => onTaskSelect?.(task.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onTaskSelect?.(task.id);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-primary">{task.taskKey}</span>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                              {(task.assigneeInitial ?? "?").toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-foreground">{task.summary}</p>

                          <div className="mt-1.5 flex items-center gap-1.5">
                            <select
                              id={`bucket-move-${task.id}`}
                              className="h-8 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs text-foreground"
                              value={bucket.id}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                event.stopPropagation();
                                onListTaskMove?.({
                                  taskId: task.id,
                                  sourceBucketId: bucket.id,
                                  targetBucketId: event.target.value,
                                  targetIndex: Number.MAX_SAFE_INTEGER,
                                });
                              }}
                            >
                              {taskBucketOptions.map((candidateBucket) => (
                                <option key={candidateBucket.id} value={candidateBucket.id}>
                                  {candidateBucket.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-foreground disabled:opacity-40"
                              disabled={currentIndex <= 0}
                              aria-label={`Move ${task.summary} up`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onListTaskMove?.({
                                  taskId: task.id,
                                  sourceBucketId: bucket.id,
                                  targetBucketId: bucket.id,
                                  targetIndex: currentIndex - 1,
                                });
                              }}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded border border-border text-foreground disabled:opacity-40"
                              disabled={currentIndex >= bucket.tasks.length - 1}
                              aria-label={`Move ${task.summary} down`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onListTaskMove?.({
                                  taskId: task.id,
                                  sourceBucketId: bucket.id,
                                  targetBucketId: bucket.id,
                                  targetIndex: currentIndex + 1,
                                });
                              }}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead className="bg-muted/70 text-xs uppercase tracking-[0.07em] text-muted-foreground">
                      <tr>
                        <th className="w-9 px-1.5 py-1 text-left" />
                        <th className="w-28 px-1.5 py-1 text-left">Key</th>
                        <th className="px-1.5 py-1 text-left">Summary</th>
                        <th className="w-24 px-1.5 py-1 text-left">Tag</th>
                        <th className="w-28 px-1.5 py-1 text-left">Status</th>
                        <th className="w-12 px-1.5 py-1 text-right">Asg</th>
                        <th className="w-16 px-1.5 py-1 text-right">Move</th>
                      </tr>
                    </thead>

                    <SortableContext items={bucket.visibleTasks.map((task) => taskDndId(task.id))} strategy={verticalListSortingStrategy}>
                      <BucketBody bucketId={bucket.id}>
                        {bucket.visibleTasks.length === 0 && indicatorIndex === null ? (
                          <tr>
                            <td colSpan={7} className="px-2 py-2 text-xs text-muted-foreground">
                              {bucket.emptyMessage ?? "No tasks in this bucket."}
                            </td>
                          </tr>
                        ) : (
                          <>
                            {bucket.visibleTasks.map((task) => {
                              const currentIndex = bucket.tasks.findIndex((candidate) => candidate.id === task.id);

                              return (
                                <Fragment key={task.id}>
                                  {indicatorIndex !== null && dropIndicator?.overTaskId === task.id ? <InsertionIndicatorRow /> : null}
                                  <DetailedTaskRow
                                    task={task}
                                    bucketId={bucket.id}
                                    canMoveUp={currentIndex > 0}
                                    canMoveDown={currentIndex < bucket.tasks.length - 1}
                                    onSelect={onTaskSelect}
                                    onMoveUp={() => onListTaskMove?.({ taskId: task.id, sourceBucketId: bucket.id, targetBucketId: bucket.id, targetIndex: currentIndex - 1 })}
                                    onMoveDown={() => onListTaskMove?.({ taskId: task.id, sourceBucketId: bucket.id, targetBucketId: bucket.id, targetIndex: currentIndex + 1 })}
                                  />
                                </Fragment>
                              );
                            })}
                            {indicatorIndex === bucket.visibleTasks.length ? <InsertionIndicatorRow /> : null}
                          </>
                        )}
                      </BucketBody>
                    </SortableContext>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export const TaskViewList = ({
  tasks,
  combineBucketsByType,
  title,
  searchQuery = "",
  listSections,
  onTaskSelect,
  onListTaskMove,
}: {
  tasks: TaskViewItem[];
  combineBucketsByType: boolean;
  title: string;
  searchQuery?: string;
  listSections?: TaskViewListSection[];
  onTaskSelect?: (taskId: string) => void;
  onListTaskMove?: (payload: TaskViewListTaskMovePayload) => void;
}) => {
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editingBucketName, setEditingBucketName] = useState("");
  const [collapsedBucketIds, setCollapsedBucketIds] = useState<Set<string>>(new Set());
  const [activeDrag, setActiveDrag] = useState<{ taskId: string; sourceBucketId: string; sourceSectionId: string } | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ bucketId: string; overTaskId: string | null } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    if (combineBucketsByType) return [{ key: "all", label: title, tasks }];

    const byBucket = new Map<string, TaskViewItem[]>();
    tasks.forEach((task) => {
      const key = task.bucketName ?? "Unbucketed";
      const existing = byBucket.get(key) ?? [];
      existing.push(task);
      byBucket.set(key, existing);
    });

    return [...byBucket.entries()].map(([label, bucketTasks]) => ({ key: label, label, tasks: bucketTasks }));
  }, [combineBucketsByType, tasks, title]);

  const simpleGroups = useMemo(() => {
    if (listSections) return [];

    return grouped.map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => matchesTaskQuery(task, searchQuery)),
    }));
  }, [grouped, listSections, searchQuery]);

  const draggedTask = useMemo(() => {
    if (!activeDrag || !listSections) return null;
    for (const section of listSections) {
      for (const bucket of section.buckets) {
        const match = bucket.tasks.find((task) => task.id === activeDrag.taskId);
        if (match) return match;
      }
    }
    return null;
  }, [activeDrag, listSections]);

  const findBucketReference = (bucketId: string) => {
    if (!listSections) return null;

    for (const section of listSections) {
      const bucket = section.buckets.find((candidate) => candidate.id === bucketId);
      if (bucket) return { section, bucket };
    }

    return null;
  };

  const findTaskReference = (taskId: string) => {
    if (!listSections) return null;

    for (const section of listSections) {
      for (const bucket of section.buckets) {
        const task = bucket.tasks.find((candidate) => candidate.id === taskId);
        if (task) return { section, bucket, task };
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!listSections) return;

    const taskId = parseTaskDndId(String(event.active.id));
    if (!taskId) return;

    const taskReference = findTaskReference(taskId);
    if (!taskReference) return;

    setActiveDrag({
      taskId,
      sourceBucketId: taskReference.bucket.id,
      sourceSectionId: taskReference.section.id,
    });
    setDropIndicator({ bucketId: taskReference.bucket.id, overTaskId: taskId });
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!listSections || !activeDrag) {
      setDropIndicator(null);
      return;
    }

    const overId = event.over ? String(event.over.id) : null;
    if (!overId) {
      setDropIndicator(null);
      return;
    }

    const overTaskId = parseTaskDndId(overId);
    if (overTaskId) {
      const taskReference = findTaskReference(overTaskId);
      if (!taskReference || taskReference.section.id !== activeDrag.sourceSectionId) {
        setDropIndicator(null);
        return;
      }

      setDropIndicator({ bucketId: taskReference.bucket.id, overTaskId });
      return;
    }

    const overBucketId = parseBucketDndId(overId);
    if (!overBucketId) {
      setDropIndicator(null);
      return;
    }

    const bucketReference = findBucketReference(overBucketId);
    if (!bucketReference || bucketReference.section.id !== activeDrag.sourceSectionId) {
      setDropIndicator(null);
      return;
    }

    setDropIndicator({ bucketId: overBucketId, overTaskId: null });
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDrag(null);
    setDropIndicator(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!listSections || !activeDrag || !onListTaskMove) {
      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const taskId = parseTaskDndId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : null;
    if (!taskId || !overId) {
      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const sourceReference = findBucketReference(activeDrag.sourceBucketId);
    if (!sourceReference) {
      setActiveDrag(null);
      setDropIndicator(null);
      return;
    }

    const overTaskId = parseTaskDndId(overId);
    if (overTaskId) {
      const targetTaskReference = findTaskReference(overTaskId);
      if (!targetTaskReference || targetTaskReference.section.id !== activeDrag.sourceSectionId) {
        setActiveDrag(null);
        setDropIndicator(null);
        return;
      }

      const targetIndex = targetTaskReference.bucket.tasks.findIndex((candidate) => candidate.id === overTaskId);
      if (targetIndex >= 0) {
        onListTaskMove({
          taskId,
          sourceBucketId: activeDrag.sourceBucketId,
          targetBucketId: targetTaskReference.bucket.id,
          targetIndex,
        });
      }
    } else {
      const overBucketId = parseBucketDndId(overId);
      const targetBucketReference = overBucketId ? findBucketReference(overBucketId) : null;
      if (!targetBucketReference || targetBucketReference.section.id !== activeDrag.sourceSectionId) {
        setActiveDrag(null);
        setDropIndicator(null);
        return;
      }

      onListTaskMove({
        taskId,
        sourceBucketId: activeDrag.sourceBucketId,
        targetBucketId: targetBucketReference.bucket.id,
        targetIndex: targetBucketReference.bucket.tasks.length,
      });
    }

    setActiveDrag(null);
    setDropIndicator(null);
  };

  const toggleBucketCollapsed = (bucketId: string) => {
    setCollapsedBucketIds((current) => {
      const next = new Set(current);
      if (next.has(bucketId)) next.delete(bucketId);
      else next.add(bucketId);
      return next;
    });
  };

  const startEditBucket = (bucketId: string, currentName: string) => {
    setEditingBucketId(bucketId);
    setEditingBucketName(currentName);
  };

  const cancelEditBucket = () => {
    setEditingBucketId(null);
    setEditingBucketName("");
  };

  const saveBucketName = () => {
    if (!editingBucketId || !listSections) return;

    const nextName = editingBucketName.trim();
    if (!nextName) return;

    const bucketReference = findBucketReference(editingBucketId);
    bucketReference?.bucket.onRename?.(nextName);
    cancelEditBucket();
  };

  if (listSections) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="font-[Inter] space-y-5">
          {listSections.map((section) => (
            <DetailedBucketSection
              key={section.id}
              section={section}
              searchQuery={searchQuery}
              collapsedBucketIds={collapsedBucketIds}
              editingBucketId={editingBucketId}
              editingBucketName={editingBucketName}
              onEditingBucketNameChange={setEditingBucketName}
              onToggleCollapsed={toggleBucketCollapsed}
              onStartEdit={startEditBucket}
              onSaveEdit={saveBucketName}
              onCancelEdit={cancelEditBucket}
              onTaskSelect={onTaskSelect}
              onListTaskMove={onListTaskMove}
              dropIndicator={dropIndicator}
            />
          ))}
        </div>

        <DragOverlay>{draggedTask ? <DragTaskPreview task={draggedTask} /> : null}</DragOverlay>
      </DndContext>
    );
  }

  return (
    <div className="font-[Inter] space-y-3">
      {simpleGroups.map((group) => (
        <div key={group.key} className="overflow-hidden rounded-md border">
          {!combineBucketsByType ? (
            <div className="border-b bg-muted/50 px-2 py-1 text-xs font-semibold text-muted-foreground">{group.label}</div>
          ) : null}

          <div className="space-y-2 p-2 md:hidden">
            {group.tasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/80 bg-background/70 px-3 py-4 text-xs text-muted-foreground">
                No tasks.
              </div>
            ) : (
              group.tasks.map((task) => (
                (() => {
                  const isCompleted = task.status === "Completed";

                  return (
                <button
                  key={task.id}
                  type="button"
                  className="w-full rounded-md border border-border/70 bg-card px-3 py-2 text-left"
                  onClick={() => onTaskSelect?.(task.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`line-clamp-2 text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.summary}</p>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs uppercase text-muted-foreground">{task.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    {task.taskHref ? (
                      <Link to={task.taskHref} className={`font-semibold hover:underline ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`} onClick={(event) => event.stopPropagation()}>
                        {task.taskKey}
                      </Link>
                    ) : (
                      <span className={`font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}>{task.taskKey}</span>
                    )}
                    {task.projectHref ? (
                      <Link to={task.projectHref} className={`text-muted-foreground hover:text-foreground hover:underline ${isCompleted ? "line-through" : ""}`} onClick={(event) => event.stopPropagation()}>
                        {task.projectLabel ?? "Organization"}
                      </Link>
                    ) : (
                      <span className={`text-muted-foreground ${isCompleted ? "line-through" : ""}`}>{task.projectLabel ?? "Organization"}</span>
                    )}
                  </div>
                </button>
                  );
                })()
              ))
            )}
          </div>

          <div className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-28 px-2 py-1 text-left">Key</th>
                  <th className="px-2 py-1 text-left">Summary</th>
                  <th className="w-32 px-2 py-1 text-left">Project</th>
                  <th className="w-14 px-2 py-1 text-right">Asg</th>
                  <th className="w-24 px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {group.tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-xs text-muted-foreground">No tasks.</td>
                  </tr>
                ) : (
                  group.tasks.map((task) => <TaskListRow key={task.id} task={task} onSelect={onTaskSelect} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};
