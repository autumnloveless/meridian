import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BoardStatus, TaskMovePayload, TaskViewItem } from "@/components/tasks/TaskView.types";

const boardColumns = [
  { status: "Backlog", title: "Backlog", tone: "bg-muted text-foreground" },
  { status: "In Progress", title: "In Progress", tone: "bg-primary/15 text-primary" },
  { status: "In-Review", title: "In-Review", tone: "bg-accent/25 text-foreground" },
  { status: "Completed", title: "Completed", tone: "bg-emerald-500/18 text-emerald-700 dark:text-emerald-300" },
  { status: "Cancelled", title: "Cancelled", tone: "bg-destructive/15 text-destructive" },
] as const;

const COLUMN_PREFIX = "task-view-col:";
const TASK_PREFIX = "task-view-task:";

const columnDndId = (status: BoardStatus) => `${COLUMN_PREFIX}${status}`;
const taskDndId = (taskId: string) => `${TASK_PREFIX}${taskId}`;
const parseColumnDndId = (value: string) =>
  value.startsWith(COLUMN_PREFIX) ? (value.slice(COLUMN_PREFIX.length) as BoardStatus) : null;
const parseTaskDndId = (value: string) =>
  value.startsWith(TASK_PREFIX) ? value.slice(TASK_PREFIX.length) : null;

const TaskBoardColumn = ({ status, children }: { status: BoardStatus; children: React.ReactNode }) => {
  const droppable = useDroppable({ id: columnDndId(status) });

  return (
    <div ref={droppable.setNodeRef} className={droppable.isOver ? "shrink-0 rounded-md bg-muted/40 md:shrink" : "shrink-0 rounded-md md:shrink"}>
      {children}
    </div>
  );
};

const TaskBoardCard = ({
  task,
  onSelect,
}: {
  task: TaskViewItem;
  onSelect?: (taskId: string) => void;
}) => {
  const draggable = useDraggable({ id: taskDndId(task.id) });
  const isCompleted = task.status === "Completed";
  const style = {
    transform: CSS.Translate.toString(draggable.transform),
  };

  return (
    <button
      ref={draggable.setNodeRef}
      style={style}
      {...draggable.attributes}
      {...draggable.listeners}
      type="button"
      className="w-full rounded-lg border border-border/70 bg-card px-2 py-2 text-left shadow-xs transition-colors hover:bg-muted/50"
      onClick={() => onSelect?.(task.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{task.summary}</p>
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
          {(task.assigneeInitial ?? "?").toUpperCase()}
        </span>
      </div>
      {task.taskHref ? (
        <Link
          to={task.taskHref}
          className={`text-xs font-medium hover:underline ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}
          onClick={(event) => event.stopPropagation()}
        >
          {task.taskKey}
        </Link>
      ) : (
        <p className={`text-xs font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-primary"}`}>{task.taskKey}</p>
      )}
      {task.projectLabel ? (
        task.projectHref ? (
          <Link to={task.projectHref} className={`text-xs hover:underline ${isCompleted ? "text-muted-foreground line-through" : "text-muted-foreground"}`} onClick={(event) => event.stopPropagation()}>
            {task.projectLabel}
          </Link>
        ) : (
          <p className={`text-xs text-muted-foreground ${isCompleted ? "line-through" : ""}`}>{task.projectLabel}</p>
        )
      ) : null}
    </button>
  );
};

export const TaskViewBoard = ({
  tasks,
  onTaskSelect,
  onTaskMove,
}: {
  tasks: TaskViewItem[];
  onTaskSelect?: (taskId: string) => void;
  onTaskMove?: (payload: TaskMovePayload) => void;
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null);

  const columns = useMemo(() => {
    const initial: Record<BoardStatus, TaskViewItem[]> = {
      Backlog: [],
      "In Progress": [],
      "In-Review": [],
      Completed: [],
      Cancelled: [],
    };

    tasks.forEach((task) => {
      if (task.status in initial) {
        initial[task.status as BoardStatus].push(task);
      }
    });

    (Object.keys(initial) as BoardStatus[]).forEach((status) => {
      initial[status] = [...initial[status]].sort(
        (left, right) => left.order - right.order || left.summary.localeCompare(right.summary)
      );
    });

    return initial;
  }, [tasks]);

  const draggedTask = useMemo(
    () => (activeDragTaskId ? tasks.find((task) => task.id === activeDragTaskId) ?? null : null),
    [activeDragTaskId, tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeTaskId = parseTaskDndId(String(event.active.id));
    setActiveDragTaskId(activeTaskId);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveDragTaskId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTaskId(null);

    const activeTaskId = parseTaskDndId(String(event.active.id));
    const overRawId = event.over ? String(event.over.id) : null;
    if (!activeTaskId || !overRawId) return;

    const overTaskId = parseTaskDndId(overRawId);
    const destinationStatus = (() => {
      const columnStatus = parseColumnDndId(overRawId);
      if (columnStatus) return columnStatus;

      if (!overTaskId) return null;
      const overTask = tasks.find((task) => task.id === overTaskId);
      return overTask ? (overTask.status as BoardStatus) : null;
    })();

    if (!destinationStatus) return;

    onTaskMove?.({
      taskId: activeTaskId,
      destinationStatus,
      overTaskId,
    });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragCancel={handleDragCancel} onDragEnd={handleDragEnd}>
      <div className="font-[Inter] overflow-x-auto pb-2">
        <div className="flex min-w-max snap-x snap-mandatory gap-3 md:grid md:min-w-0 md:grid-cols-2 xl:grid-cols-5">
          {boardColumns.map((column) => (
            <TaskBoardColumn key={column.status} status={column.status}>
              <Card className="h-[calc(100dvh-17rem)] w-[88vw] min-w-[18rem] shrink-0 snap-start border border-border/70 bg-card/85 py-0 sm:w-[80vw] md:h-[calc(100vh-16rem)] md:w-auto md:min-w-0 md:shrink">
                <CardHeader className="gap-2 border-b border-border/70 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground">{column.title}</CardTitle>
                    <Badge className={`h-5 px-1.5 text-xs ${column.tone}`}>{columns[column.status].length}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 pb-2 pt-2">
                  {columns[column.status].length === 0 ? (
                    <div className="rounded border border-dashed border-border/80 bg-background/70 p-3 text-xs text-muted-foreground">No tasks</div>
                  ) : (
                    columns[column.status].map((task) => (
                      <TaskBoardCard key={task.id} task={task} onSelect={onTaskSelect} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TaskBoardColumn>
          ))}
        </div>
      </div>

      <DragOverlay>
        {draggedTask ? (
          <div className="w-[280px] max-w-[90vw] rounded-lg border border-border/70 bg-card px-2 py-2 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-2">
              <p className={`text-sm font-medium ${draggedTask.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>{draggedTask.summary}</p>
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                {(draggedTask.assigneeInitial ?? "?").toUpperCase()}
              </span>
            </div>
            <p className={`text-xs font-medium ${draggedTask.status === "Completed" ? "text-muted-foreground line-through" : "text-primary"}`}>{draggedTask.taskKey}</p>
            {draggedTask.projectLabel ? <p className={`text-xs text-muted-foreground ${draggedTask.status === "Completed" ? "line-through" : ""}`}>{draggedTask.projectLabel}</p> : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
