import { co } from "jazz-tools";

import { Requirement } from "@/schema";

export type LoadedRequirement = co.loaded<typeof Requirement>;

export type RequirementTreeEntry = {
  item: LoadedRequirement;
  depth: number;
  parentId: string | null;
};

const childList = (item: LoadedRequirement) => {
  if (!item.children) return [];
  return (item.children as any).map((entry: LoadedRequirement) => entry);
};

export const flattenRequirements = (
  items: LoadedRequirement[],
  depth = 0,
  parentId: string | null = null,
): RequirementTreeEntry[] => {
  const result: RequirementTreeEntry[] = [];

  for (const item of items) {
    result.push({ item, depth, parentId });
    result.push(...flattenRequirements(childList(item), depth + 1, item.$jazz.id));
  }

  return result;
};

export const findRequirement = (items: LoadedRequirement[], id: string): LoadedRequirement | null => {
  for (const item of items) {
    if (item.$jazz.id === id) return item;
    const found = findRequirement(childList(item), id);
    if (found) return found;
  }
  return null;
};

const findParentList = (
  items: LoadedRequirement[],
  id: string,
): { list: any; index: number } | null => {
  const index = items.findIndex((item) => item.$jazz.id === id);
  if (index >= 0) {
    return { list: items as any, index };
  }

  for (const item of items) {
    const nested = findParentList(childList(item), id);
    if (nested) return nested;
  }

  return null;
};

export const deleteRequirementById = (rootList: any, id: string) => {
  const located = findParentList([...rootList], id);
  if (!located) return;
  located.list.$jazz.splice(located.index, 1);
};

export const isRequirementDescendant = (item: LoadedRequirement, candidateParentId: string): boolean => {
  for (const child of childList(item)) {
    if (child.$jazz.id === candidateParentId) return true;
    if (isRequirementDescendant(child, candidateParentId)) return true;
  }
  return false;
};

export const moveRequirement = (
  rootList: any,
  activeId: string,
  overId: string,
  sameParent: boolean,
  parentId: string | null,
  overParentId: string | null,
) => {
  const roots = [...rootList] as LoadedRequirement[];
  const active = findRequirement(roots, activeId);
  if (!active) return;

  const source = findParentList(roots, activeId);
  if (!source) return;

  if (sameParent) {
    const list = parentId
      ? findRequirement(roots, parentId)?.children
      : rootList;
    if (!list) return;

    const values = [...list] as LoadedRequirement[];
    const oldIndex = values.findIndex((entry) => entry.$jazz.id === activeId);
    const newIndex = values.findIndex((entry) => entry.$jazz.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const [moved] = values.splice(oldIndex, 1);
    values.splice(newIndex, 0, moved);
    list.$jazz.applyDiff(values);
    return;
  }

  const targetParent = findRequirement(roots, overId);
  if (!targetParent) return;
  if (active.$jazz.id === targetParent.$jazz.id) return;
  if (isRequirementDescendant(active, targetParent.$jazz.id)) return;

  const [moved] = source.list.$jazz.splice(source.index, 1);
  if (!moved) return;

  if (!targetParent.children) {
    targetParent.$jazz.set("children", []);
  }

  const nextChildren = targetParent.children
    ? [...((targetParent.children as any).map((entry: LoadedRequirement) => entry)), moved]
    : [moved];
  (targetParent.children as any)?.$jazz.applyDiff(nextChildren);

  if (overParentId === null && parentId === null) {
    rootList.$jazz.applyDiff([...rootList]);
  }
};

export const relocateRequirement = (
  rootList: any,
  activeId: string,
  targetParentId: string | null,
) => {
  const roots = [...rootList] as LoadedRequirement[];
  const active = findRequirement(roots, activeId);
  if (!active) return false;

  if (targetParentId === activeId) return false;
  if (targetParentId && isRequirementDescendant(active, targetParentId)) return false;

  const source = findParentList(roots, activeId);
  if (!source) return false;

  const [moved] = source.list.$jazz.splice(source.index, 1);
  if (!moved) return false;

  if (!targetParentId) {
    rootList.$jazz.push(moved);
    return true;
  }

  const targetParent = findRequirement([...rootList] as LoadedRequirement[], targetParentId);
  if (!targetParent) {
    rootList.$jazz.push(moved);
    return false;
  }

  if (!targetParent.children) {
    targetParent.$jazz.set("children", []);
  }

  (targetParent.children as any)?.$jazz.push(moved);
  return true;
};
