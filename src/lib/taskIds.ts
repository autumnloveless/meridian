type TaskOwner = {
  project_key: string;
  next_task_number: number;
  $jazz: {
    set: (field: "project_key" | "next_task_number", value: string | number) => void;
  };
};

type TaskLike = {
  sequence_number?: number;
  order: number;
};

const PROJECT_KEY_PATTERN = /[^A-Z0-9]/g;

export const normalizeProjectKey = (value: string, fallback: string) => {
  const normalized = value.toUpperCase().replace(PROJECT_KEY_PATTERN, "").slice(0, 6);
  if (normalized) return normalized;
  return fallback;
};

export const defaultProjectKeyFromName = (name: string, fallback: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  const initials = words.map((part) => part[0]).join("");
  if (initials) return normalizeProjectKey(initials, fallback);

  const compact = name.replace(/[^a-zA-Z0-9]/g, "");
  if (compact) return normalizeProjectKey(compact.slice(0, 6), fallback);

  return fallback;
};

export const allocateTaskId = (owner: TaskOwner) => {
  const prefix = normalizeProjectKey(owner.project_key, "TASK");
  const nextNumber = Math.max(owner.next_task_number, 1);

  owner.$jazz.set("project_key", prefix);
  owner.$jazz.set("next_task_number", nextNumber + 1);

  return {
    sequence_number: nextNumber,
  };
};

export const formatTaskId = (prefix: string | undefined, sequenceNumber: number | undefined, order: number) => {
  const resolvedPrefix = normalizeProjectKey(prefix || "", "TASK");
  const resolvedNumber = Math.max(sequenceNumber || order, 1);
  return `${resolvedPrefix}-${resolvedNumber}`;
};

export const getTaskDisplayId = (task: TaskLike, prefix?: string) => {
  return formatTaskId(prefix, task.sequence_number, task.order);
};
