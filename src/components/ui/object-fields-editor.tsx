import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ObjectRow = {
  id: string;
  key: string;
  value: string;
};

type ObjectFieldsEditorProps = {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  addLabel?: string;
};

const toRows = (value: Record<string, unknown>): ObjectRow[] => {
  return Object.entries(value).map(([key, rowValue], index) => ({
    id: `${key}-${index}`,
    key,
    value: typeof rowValue === "string" ? rowValue : JSON.stringify(rowValue),
  }));
};

const parseValue = (raw: string): unknown => {
  const trimmed = raw.trim();

  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed !== "") {
    return asNumber;
  }

  return raw;
};

const toObject = (rows: ObjectRow[]) => {
  const next: Record<string, unknown> = {};

  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    next[key] = parseValue(row.value);
  }

  return next;
};

export const ObjectFieldsEditor = ({ value, onChange, addLabel = "Add field" }: ObjectFieldsEditorProps) => {
  const initialRows = useMemo(() => toRows(value), [value]);
  const [rows, setRows] = useState<ObjectRow[]>(initialRows);

  const setAndEmit = (nextRows: ObjectRow[]) => {
    setRows(nextRows);
    onChange(toObject(nextRows));
  };

  const updateRow = (rowId: string, updates: Partial<ObjectRow>) => {
    setAndEmit(
      rows.map((row) => (row.id === rowId ? { ...row, ...updates } : row)),
    );
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No fields yet.</p>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={row.key}
              onChange={(event) => updateRow(row.id, { key: event.target.value })}
              placeholder="Key"
            />
            <Input
              value={row.value}
              onChange={(event) => updateRow(row.id, { value: event.target.value })}
              placeholder="Value"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setAndEmit(rows.filter((candidate) => candidate.id !== row.id))}
              aria-label="Remove field"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          const id = `new-${Date.now()}-${rows.length}`;
          setAndEmit([...rows, { id, key: "", value: "" }]);
        }}
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
};
