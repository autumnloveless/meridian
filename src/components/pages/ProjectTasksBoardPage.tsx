import { Fragment, useEffect, useMemo, useState } from "react";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";
import { useParams } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Search } from "lucide-react";

import { Account, Project, Task, TaskBucket } from "@/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailsPane } from "@/components/tasks/TaskDetailsPane";

const TASK_PREFIX = "task:";
const COLUMN_PREFIX = "column:";

const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const columnDndId = (status: BoardStatus) => `${COLUMN_PREFIX}${status}`;

const parseTaskDndId = (value: string) =>
  value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null;

const parseColumnDndId = (value: string) =>
  value.startsWith(COLUMN_PREFIX)
    ? (value.slice(COLUMN_PREFIX.length) as BoardStatus)
    : null;

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-slate-100 text-slate-700" },
  {
    status: "In Progress",
    title: "In Progress",
    tone: "bg-blue-100 text-blue-700",
  },
  {
    status: "In-Review",
    title: "In-Review",
    tone: "bg-amber-100 text-amber-800",
  },
  {
    status: "Completed",
    title: "Completed",
    tone: "bg-emerald-100 text-emerald-800",
  },
  {
    status: "Cancelled",
    title: "Cancelled",
    tone: "bg-rose-100 text-rose-800",
  },
] as const;

type BoardStatus = (typeof boardColumns)[number]["status"];
type LoadedTask = co.loaded<typeof Task>;
type LoadedTaskBucket = co.loaded<typeof TaskBucket>;
type TaskType = LoadedTask["type"];

type DraftTask = {
  summary: string;
  taskType: TaskType;
};

type ColumnMap = Record<BoardStatus, LoadedTask[]>;

type ActiveDrag = {
  taskId: string;
};

const defaultDraftTask: DraftTask = {
  summary: "",
  taskType: "Task",
};

const boardStatuses = boardColumns.map((column) => column.status);

const isBoardStatus = (status: LoadedTask["status"]): status is BoardStatus =>
  boardStatuses.includes(status as BoardStatus);

function TaskCard({ task, onSelect }: { task: LoadedTask; onSelect: (task: LoadedTask) => void }) {
  const sortable = useSortable({ id: taskDndId(task.$jazz.id) });
  const assigneeInitial =
    task.assigned_to && task.assigned_to.$isLoaded
      ? (task.assigned_to.name[0] ?? "?").toUpperCase()
      : "?";

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.35 : 1,
  };

  return (
    <Card
      ref={sortable.setNodeRef}
      style={style}
      className="cursor-grab border border-stone-200 bg-white py-2 shadow-sm active:cursor-grabbing"
      onClick={() => onSelect(task)}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <CardContent className="space-y-2 px-3">
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
          <p className="line-clamp-3 text-[13px] leading-snug font-medium text-stone-800">
            {task.summary}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">
              {task.type}
            </Badge>
            <span className="text-[10px] font-medium text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</span>
          </div>

          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-200 text-[10px] font-bold text-orange-700">
            {assigneeInitial}
          </span>
        </div>

        {task.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag: string) => (
              <Badge key={`${task.$jazz.id}-${tag}`} variant="secondary" className="h-5 px-1.5 text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ColumnDropZone({
  status,
  children,
}: {
  status: BoardStatus;
  children: React.ReactNode;
}) {
  const droppable = useDroppable({ id: columnDndId(status) });

  return (
    <div
      ref={droppable.setNodeRef}
      className={`flex min-h-[12rem] flex-1 flex-col gap-2 rounded-b-lg px-2 pb-2 pt-1 transition-colors ${
        droppable.isOver ? "bg-primary/5" : ""
      }`}
    >
      {children}
    </div>
  );
}

function DragTaskPreview({ task }: { task: LoadedTask }) {
  return (
    <Card className="w-[260px] border border-stone-300 bg-white py-2 shadow-2xl">
      <CardContent className="space-y-2 px-3">
        <p className="text-[13px] leading-snug font-medium text-stone-800">{task.summary}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">
            {task.type}
          </Badge>
          <span className="text-[10px] font-medium text-sky-700">{`NUC-${Math.max(task.order, 1)}`}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export const ProjectTasksBoardPage = () => {
  const { projectId } = useParams();
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [draftTask, setDraftTask] = useState<DraftTask>(defaultDraftTask);
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
    if (hasActive) return;

    project.task_buckets.$jazz.push(
      {
        name: "Active",
        type: "Active",
        order: 0,
        tasks: [],
      }
    );
  }, [project]);

  const activeBucket = useMemo(() => {
    if (!project.$isLoaded) return null;
    return project.task_buckets.find((bucket) => bucket.type === "Active") ?? null;
  }, [project]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleTasks = useMemo(() => {
    if (!activeBucket) return [];

    const ordered = [...activeBucket.tasks].sort(
      (left, right) => left.order - right.order || left.summary.localeCompare(right.summary)
    );

    if (!normalizedQuery) return ordered;

    return ordered.filter((task) => {
      const keyText = `NUC-${Math.max(task.order, 1)}`.toLowerCase();
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
  }, [activeBucket, normalizedQuery]);

  const columnTasks = useMemo<ColumnMap>(() => {
    const initial: ColumnMap = {
      Backlog: [],
      "In Progress": [],
      "In-Review": [],
      Completed: [],
      Cancelled: [],
    };

    for (const task of visibleTasks) {
      if (isBoardStatus(task.status)) {
        initial[task.status].push(task);
      }
    }

    return initial;
  }, [visibleTasks]);

  const normalizeTaskOrder = (bucket: LoadedTaskBucket) => {
    const orderedTasks = bucket.tasks as unknown as LoadedTask[];
    orderedTasks.forEach((task: LoadedTask, index: number) => {
      const nextOrder = index + 1;
      if (task.order !== nextOrder) {
        task.$jazz.set("order", nextOrder);
      }
    });
  };

  const findTaskById = (taskId: string) => activeBucket?.tasks.find((task) => task.$jazz.id === taskId);

  const createTask = () => {
    if (!activeBucket || !profile) return;

    const summary = draftTask.summary.trim();
    if (!summary) return;

    activeBucket.tasks.$jazz.push(
      {
        summary,
        type: draftTask.taskType,
        assigned_to: profile,
        status: "Backlog",
        details: "",
        custom_fields: {},
        order: activeBucket.tasks.length + 1,
        tags: [],
      }
    );

    setDraftTask((current) => ({ ...current, summary: "" }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = parseTaskDndId(String(event.active.id));
    if (!taskId) return;
    setActiveDrag({ taskId });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = parseTaskDndId(String(event.active.id));
    const overRawId = event.over ? String(event.over.id) : null;

    setActiveDrag(null);

    if (!activeBucket || !activeId || !overRawId) return;

    const movingTask = findTaskById(activeId);
    if (!movingTask || !isBoardStatus(movingTask.status)) return;

    const overTaskId = parseTaskDndId(overRawId);
    const overColumnStatus = parseColumnDndId(overRawId);
    const overTask = overTaskId ? findTaskById(overTaskId) : null;
    const destinationStatus =
      overColumnStatus ?? (overTask && isBoardStatus(overTask.status) ? overTask.status : null);

    if (!destinationStatus) return;

    const currentColumns: Record<BoardStatus, LoadedTask[]> = {
      Backlog: [],
      "In Progress": [],
      "In-Review": [],
      Completed: [],
      Cancelled: [],
    };

    const nonBoardTasks: LoadedTask[] = [];
    activeBucket.tasks.forEach((task: LoadedTask) => {
      if (isBoardStatus(task.status)) {
        currentColumns[task.status].push(task);
      } else {
        nonBoardTasks.push(task);
      }
    });

    const sourceStatus = movingTask.status;
    const sourceList = currentColumns[sourceStatus].filter((task) => task.$jazz.id !== movingTask.$jazz.id);
    currentColumns[sourceStatus] = sourceList;

    const targetList = [...currentColumns[destinationStatus]];
    const overIndex = overTaskId
      ? targetList.findIndex((task) => task.$jazz.id === overTaskId)
      : targetList.length;
    const insertIndex = overIndex < 0 ? targetList.length : overIndex;

    targetList.splice(insertIndex, 0, movingTask);
    currentColumns[destinationStatus] = targetList;

    if (movingTask.status !== destinationStatus) {
      movingTask.$jazz.set("status", destinationStatus);
    }

    const nextTasks = [
      ...currentColumns.Backlog,
      ...currentColumns["In Progress"],
      ...currentColumns["In-Review"],
      ...currentColumns.Completed,
      ...currentColumns.Cancelled,
      ...nonBoardTasks,
    ];

    if (nextTasks.length === activeBucket.tasks.length) {
      // Ensure array identity changes only when order changed.
      const sameOrder = nextTasks.every((task, index) => task.$jazz.id === activeBucket.tasks[index]?.$jazz.id);
      if (!sameOrder) {
        activeBucket.tasks.$jazz.applyDiff(nextTasks as any);
      }
    } else {
      activeBucket.tasks.$jazz.applyDiff(nextTasks as any);
    }

    normalizeTaskOrder(activeBucket);
  };

  if (!project.$isLoaded) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`column-skeleton-${index}`} className="h-64 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (!activeBucket) {
    return <div className="text-sm text-muted-foreground">Preparing active board...</div>;
  }

  const draggedTask = activeDrag ? findTaskById(activeDrag.taskId) : null;
  const selectedTask = selectedTaskId ? findTaskById(selectedTaskId) ?? null : null;
  const loadedSelectedTask = selectedTask && selectedTask.$isLoaded ? selectedTask : null;

  return (
    <section className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-stone-900">Active board</h2>

        <div className="font-[Inter] flex flex-wrap items-center gap-2 rounded border border-stone-200 bg-stone-50 px-2 py-1.5">
          <div className="relative w-full max-w-[240px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500" />
            <Input
              className="h-9 border-stone-300 pl-7 text-sm sm:h-7 sm:text-xs"
              placeholder="Search task"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <select
            value={draftTask.taskType}
            onChange={(event) =>
              setDraftTask((current) => ({
                ...current,
                taskType: event.target.value as TaskType,
              }))
            }
            className="h-9 w-full rounded border border-stone-300 bg-white px-2 text-sm text-stone-800 sm:h-7 sm:w-auto sm:text-xs"
            aria-label="Task type"
          >
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
          </select>

          <Input
            className="h-9 w-full flex-1 text-sm sm:h-7 sm:min-w-[220px] sm:text-xs"
            value={draftTask.summary}
            onChange={(event) =>
              setDraftTask((current) => ({ ...current, summary: event.target.value }))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                createTask();
              }
            }}
            placeholder="Create issue in backlog"
            aria-label="Create task"
          />

          <Button
            size="sm"
            className="h-9 w-full text-sm sm:h-7 sm:w-auto sm:text-xs"
            onClick={createTask}
            disabled={!profile || !draftTask.summary.trim()}
          >
            Create issue
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3 md:grid md:min-w-0 md:grid-cols-2 xl:grid-cols-5">
          {boardColumns.map((column) => {
            const tasks = columnTasks[column.status];
            const taskIds = tasks.map((task) => taskDndId(task.$jazz.id));

            return (
              <Card key={column.status} className="h-[calc(100dvh-18rem)] w-[85vw] min-w-[18rem] border border-stone-200 bg-stone-100/60 py-0 md:h-[calc(100vh-16rem)] md:w-auto md:min-w-0">
                <CardHeader className="gap-2 border-b border-stone-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-stone-800">{column.title}</CardTitle>
                    <Badge className={`h-5 px-1.5 text-[10px] ${column.tone}`}>{tasks.length}</Badge>
                  </div>
                </CardHeader>

                <SortableContext items={taskIds} strategy={rectSortingStrategy}>
                  <ColumnDropZone status={column.status}>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {tasks.length === 0 ? (
                        <div className="rounded border border-dashed border-stone-300 bg-white/60 p-3 text-xs text-stone-500">
                          Drop tasks here
                        </div>
                      ) : (
                        tasks.map((task) => (
                          <Fragment key={task.$jazz.id}>
                            <TaskCard task={task} onSelect={(nextTask) => setSelectedTaskId(nextTask.$jazz.id)} />
                          </Fragment>
                        ))
                      )}
                    </div>
                  </ColumnDropZone>
                </SortableContext>
              </Card>
            );
          })}
          </div>
        </div>

        <DragOverlay>{draggedTask ? <DragTaskPreview task={draggedTask} /> : null}</DragOverlay>
      </DndContext>

      <TaskDetailsPane
        open={Boolean(loadedSelectedTask)}
        task={loadedSelectedTask}
        onClose={() => setSelectedTaskId(null)}
      />
    </section>
  );
};
