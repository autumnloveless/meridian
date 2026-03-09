import { co } from "jazz-tools";

import { Test } from "@/schema";

export type LoadedTest = co.loaded<typeof Test>;

export type TestTreeEntry = {
  item: LoadedTest;
  depth: number;
  parentId: string | null;
};

const childList = (item: LoadedTest) => {
  if (!item.children) return [];
  return (item.children as any).map((entry: LoadedTest) => entry);
};

export const flattenTests = (
  items: LoadedTest[],
  depth = 0,
  parentId: string | null = null,
): TestTreeEntry[] => {
  const result: TestTreeEntry[] = [];

  for (const item of items) {
    result.push({ item, depth, parentId });
    result.push(...flattenTests(childList(item), depth + 1, item.$jazz.id));
  }

  return result;
};

export const findTest = (items: LoadedTest[], id: string): LoadedTest | null => {
  for (const item of items) {
    if (item.$jazz.id === id) return item;
    const found = findTest(childList(item), id);
    if (found) return found;
  }
  return null;
};

const findParentList = (
  items: LoadedTest[],
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

export const deleteTestById = (rootList: any, id: string) => {
  const located = findParentList([...rootList], id);
  if (!located) return;
  located.list.$jazz.splice(located.index, 1);
};

export const isTestDescendant = (item: LoadedTest, candidateParentId: string): boolean => {
  for (const child of childList(item)) {
    if (child.$jazz.id === candidateParentId) return true;
    if (isTestDescendant(child, candidateParentId)) return true;
  }
  return false;
};

export const moveTest = (
  rootList: any,
  activeId: string,
  overId: string,
  sameParent: boolean,
  parentId: string | null,
  overParentId: string | null,
) => {
  const roots = [...rootList] as LoadedTest[];
  const active = findTest(roots, activeId);
  if (!active) return;

  const source = findParentList(roots, activeId);
  if (!source) return;

  if (sameParent) {
    const list = parentId
      ? findTest(roots, parentId)?.children
      : rootList;
    if (!list) return;

    const values = [...list] as LoadedTest[];
    const oldIndex = values.findIndex((entry) => entry.$jazz.id === activeId);
    const newIndex = values.findIndex((entry) => entry.$jazz.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const [moved] = values.splice(oldIndex, 1);
    values.splice(newIndex, 0, moved);
    list.$jazz.applyDiff(values);
    return;
  }

  const targetParent = findTest(roots, overId);
  if (!targetParent) return;
  if (active.$jazz.id === targetParent.$jazz.id) return;
  if (isTestDescendant(active, targetParent.$jazz.id)) return;

  const [moved] = source.list.$jazz.splice(source.index, 1);
  if (!moved) return;

  if (!targetParent.children) {
    targetParent.$jazz.set("children", []);
  }

  const nextChildren = targetParent.children
    ? [...((targetParent.children as any).map((entry: LoadedTest) => entry)), moved]
    : [moved];
  (targetParent.children as any)?.$jazz.applyDiff(nextChildren);

  if (overParentId === null && parentId === null) {
    rootList.$jazz.applyDiff([...rootList]);
  }
};
