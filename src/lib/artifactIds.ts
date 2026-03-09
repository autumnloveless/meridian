import { normalizeProjectKey } from "@/lib/taskIds";

type RequirementOwner = {
  project_key: string;
  next_requirement_number: number;
  $jazz: {
    set: (field: "project_key" | "next_requirement_number", value: string | number) => void;
  };
};

type TestOwner = {
  project_key: string;
  next_test_number: number;
  $jazz: {
    set: (field: "project_key" | "next_test_number", value: string | number) => void;
  };
};

type RequirementLike = {
  sequence_number?: number;
};

type RequirementNode = RequirementLike & {
  children?: unknown;
  $jazz?: {
    set: (field: "sequence_number", value: number) => void;
  };
};

type TestLike = {
  sequence_number?: number;
};

type TestNode = TestLike & {
  children?: unknown;
  $jazz?: {
    set: (field: "sequence_number", value: number) => void;
  };
};

const toNodeArray = (value: unknown): any[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof (value as any).map === "function") {
    return (value as any).map((entry: any) => entry);
  }
  return [];
};

const walkRequirements = (items: readonly RequirementNode[], visit: (item: RequirementNode) => void) => {
  for (const item of items) {
    visit(item);
    const children = toNodeArray(item.children) as RequirementNode[];
    if (children.length > 0) {
      walkRequirements(children, visit);
    }
  }
};

const walkTests = (items: readonly TestNode[], visit: (item: TestNode) => void) => {
  for (const item of items) {
    visit(item);
    if (Array.isArray(item.children) && item.children.length > 0) {
      walkTests(item.children as TestNode[], visit);
    }
  }
};

export const allocateRequirementId = (owner: RequirementOwner) => {
  const prefix = normalizeProjectKey(owner.project_key, "REQ");
  const nextNumber = Math.max(owner.next_requirement_number, 1);

  owner.$jazz.set("project_key", prefix);
  owner.$jazz.set("next_requirement_number", nextNumber + 1);

  return {
    sequence_number: nextNumber,
  };
};

export const allocateTestId = (owner: TestOwner) => {
  const prefix = normalizeProjectKey(owner.project_key, "TST");
  const nextNumber = Math.max(owner.next_test_number, 1);

  owner.$jazz.set("project_key", prefix);
  owner.$jazz.set("next_test_number", nextNumber + 1);

  return {
    sequence_number: nextNumber,
  };
};

export const getRequirementDisplayId = (requirement: RequirementLike, prefix?: string) => {
  const resolvedPrefix = normalizeProjectKey(prefix || "", "REQ");
  const resolvedNumber = Math.max(requirement.sequence_number || 1, 1);
  return `${resolvedPrefix}-REQ-${resolvedNumber}`;
};

export const getTestDisplayId = (test: TestLike, prefix?: string) => {
  const resolvedPrefix = normalizeProjectKey(prefix || "", "TST");
  const resolvedNumber = Math.max(test.sequence_number || 1, 1);
  return `${resolvedPrefix}-TST-${resolvedNumber}`;
};

export const ensureRequirementSequenceNumbers = (
  owner: RequirementOwner,
  requirements: readonly RequirementNode[],
) => {
  const used = new Set<number>();
  const toAssign: RequirementNode[] = [];
  let maxExisting = 0;

  walkRequirements(requirements, (item) => {
    const sequence = Math.floor(item.sequence_number || 0);
    if (sequence < 1 || used.has(sequence)) {
      toAssign.push(item);
      return;
    }

    used.add(sequence);
    if (sequence > maxExisting) {
      maxExisting = sequence;
    }
  });

  let nextNumber = Math.max(owner.next_requirement_number || 1, maxExisting + 1);
  let didAssign = false;

  for (const item of toAssign) {
    if (!item.$jazz) continue;
    while (used.has(nextNumber)) {
      nextNumber += 1;
    }

    item.$jazz.set("sequence_number", nextNumber);
    used.add(nextNumber);
    if (nextNumber > maxExisting) {
      maxExisting = nextNumber;
    }
    nextNumber += 1;
    didAssign = true;
  }

  const requiredNext = Math.max(nextNumber, maxExisting + 1);
  if (didAssign || owner.next_requirement_number !== requiredNext) {
    owner.$jazz.set("next_requirement_number", requiredNext);
  }
};

export const ensureTestSequenceNumbers = (owner: TestOwner, tests: readonly TestNode[]) => {
  const used = new Set<number>();
  const toAssign: TestNode[] = [];
  let maxExisting = 0;

  walkTests(tests, (item) => {
    const sequence = Math.floor(item.sequence_number || 0);
    if (sequence < 1 || used.has(sequence)) {
      toAssign.push(item);
      return;
    }

    used.add(sequence);
    if (sequence > maxExisting) {
      maxExisting = sequence;
    }
  });

  let nextNumber = Math.max(owner.next_test_number || 1, maxExisting + 1);
  let didAssign = false;

  for (const item of toAssign) {
    if (!item.$jazz) continue;
    while (used.has(nextNumber)) {
      nextNumber += 1;
    }

    item.$jazz.set("sequence_number", nextNumber);
    used.add(nextNumber);
    if (nextNumber > maxExisting) {
      maxExisting = nextNumber;
    }
    nextNumber += 1;
    didAssign = true;
  }

  const requiredNext = Math.max(nextNumber, maxExisting + 1);
  if (didAssign || owner.next_test_number !== requiredNext) {
    owner.$jazz.set("next_test_number", requiredNext);
  }
};

export const ensureUniqueArtifactIds = (owner: RequirementOwner & TestOwner, requirements: readonly RequirementNode[], tests: readonly TestNode[]) => {
  ensureRequirementSequenceNumbers(owner, requirements);
  ensureTestSequenceNumbers(owner, tests);
};
