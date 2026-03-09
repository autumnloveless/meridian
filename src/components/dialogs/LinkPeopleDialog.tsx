import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LinkablePerson = {
  id: string;
  name: string;
};

type LinkPeopleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: LinkablePerson[];
  onLink: (personIds: string[]) => void;
};

export const LinkPeopleDialog = ({ open, onOpenChange, people, onLink }: LinkPeopleDialogProps) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filteredPeople = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return people;
    return people.filter((person) => person.name.toLowerCase().includes(normalized));
  }, [people, query]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const close = () => {
    setQuery("");
    setSelected({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? close() : onOpenChange(nextOpen))}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link People</DialogTitle>
          <DialogDescription>Choose organization contacts to link to this project.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts"
            autoFocus
          />

          <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border/70 p-2">
            {filteredPeople.length === 0 ? (
              <p className="px-1 py-2 text-sm text-muted-foreground">No contacts found.</p>
            ) : (
              filteredPeople.map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selected[person.id])}
                    onChange={() => toggle(person.id)}
                  />
                  <span className="text-sm">{person.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedCount === 0}
            onClick={() => {
              onLink(
                Object.entries(selected)
                  .filter((entry) => entry[1])
                  .map((entry) => entry[0]),
              );
              close();
            }}
          >
            Link {selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
