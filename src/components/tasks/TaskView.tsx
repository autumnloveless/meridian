import { useMemo } from "react";

import { TaskViewBoard } from "@/components/tasks/TaskViewBoard";
import { TaskViewList } from "@/components/tasks/TaskViewList";
import type { TaskViewProps } from "@/components/tasks/TaskView.types";

export type {
  BoardStatus,
  TaskBucketType,
  TaskMovePayload,
  TaskStatus,
  TaskViewItem,
  TaskViewListBucket,
  TaskViewListSection,
  TaskViewListTaskMovePayload,
  TaskViewProps,
  TaskViewType,
} from "@/components/tasks/TaskView.types";

export const TaskView = ({
  tasks,
  viewType,
  combineBucketsByType,
  title,
  searchQuery,
  listSections,
  onTaskSelect,
  onTaskMove,
  onListTaskMove,
}: TaskViewProps) => {
  const scopedTasks = useMemo(() => {
    const filtered = tasks.filter((task) => (viewType === "archive" ? task.status === "Archived" : task.status !== "Archived"));
    return [...filtered].sort((left, right) => left.order - right.order || left.summary.localeCompare(right.summary));
  }, [tasks, viewType]);

  const scopedListSections = useMemo(() => {
    if (!listSections) return undefined;

    return listSections.map((section) => ({
      ...section,
      buckets: section.buckets.map((bucket) => ({
        ...bucket,
        tasks: [...bucket.tasks]
          .filter((task) => (viewType === "archive" ? task.status === "Archived" : task.status !== "Archived"))
          .sort((left, right) => left.order - right.order || left.summary.localeCompare(right.summary)),
      })),
    }));
  }, [listSections, viewType]);

  if (viewType === "board") {
    return <TaskViewBoard tasks={scopedTasks} onTaskSelect={onTaskSelect} onTaskMove={onTaskMove} />;
  }

  return (
    <TaskViewList
      tasks={scopedTasks}
      combineBucketsByType={combineBucketsByType}
      title={title}
      searchQuery={searchQuery}
      listSections={scopedListSections}
      onTaskSelect={onTaskSelect}
      onListTaskMove={onListTaskMove}
    />
  );
};
