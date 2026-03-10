export type TaskViewType = "list" | "board" | "archive";
export type TaskStatus = "Backlog" | "In Progress" | "In-Review" | "Completed" | "Cancelled" | "Archived";
export type BoardStatus = Exclude<TaskStatus, "Archived">;
export type TaskBucketType = "Backlog" | "Active" | "Custom";

export type TaskViewItem = {
  id: string;
  summary: string;
  type: "Task" | "Bug";
  status: TaskStatus;
  order: number;
  taskKey: string;
  taskHref?: string;
  bucketName?: string;
  bucketType?: TaskBucketType;
  projectLabel?: string;
  projectHref?: string;
  assigneeInitial?: string;
  assigneeName?: string;
  tags?: string[];
};

export type TaskMovePayload = {
  taskId: string;
  destinationStatus: BoardStatus;
  overTaskId: string | null;
};

export type TaskViewListTaskMovePayload = {
  taskId: string;
  sourceBucketId: string;
  targetBucketId: string;
  targetIndex: number;
};

export type TaskViewListBucket = {
  id: string;
  name: string;
  type: TaskBucketType;
  order: number;
  tasks: TaskViewItem[];
  emptyMessage?: string;
  onArchiveCompleted?: () => void;
  archiveCompletedDisabled?: boolean;
  onCreateBucket?: () => void;
  onRename?: (name: string) => void;
  onMoveBucket?: (direction: "up" | "down") => void;
  onDeleteBucket?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
};

export type TaskViewListSection = {
  id: string;
  title?: string;
  titleHref?: string;
  buckets: TaskViewListBucket[];
};

export type TaskViewProps = {
  tasks: TaskViewItem[];
  viewType: TaskViewType;
  combineBucketsByType: boolean;
  title: string;
  searchQuery?: string;
  listSections?: TaskViewListSection[];
  onTaskSelect?: (taskId: string) => void;
  onTaskMove?: (payload: TaskMovePayload) => void;
  onListTaskMove?: (payload: TaskViewListTaskMovePayload) => void;
};
