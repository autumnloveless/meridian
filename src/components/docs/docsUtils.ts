export const toDocumentArray = (value: unknown): Array<any> => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function") {
    return Array.from(value as Iterable<any>);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(
      (item) => !!item && typeof item === "object" && "$jazz" in (item as Record<string, unknown>)
    ) as Array<any>;
  }
  return [];
};

export const flattenDocuments = (documents: ReadonlyArray<any>): Array<any> => {
  const flat: Array<any> = [];

  const visit = (doc: any) => {
    flat.push(doc);
    for (const child of toDocumentArray(doc.children)) {
      visit(child);
    }
  };

  for (const doc of toDocumentArray(documents)) {
    visit(doc);
  }

  return flat;
};
