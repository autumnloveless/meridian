import { useMemo } from "react";
import { co } from "jazz-tools";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ObjectFieldsEditor } from "@/components/ui/object-fields-editor";
import { Person as PersonSchema } from "@/schema";

type Person = co.loaded<typeof PersonSchema>;

type PersonDetailsCardProps = {
  person: Person;
};

export const PersonDetailsCard = ({ person }: PersonDetailsCardProps) => {
  const commentsValue = useMemo(() => {
    if (!person.comment.$isLoaded) return "";
    return person.comment.toString();
  }, [person]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="border-b border-border/70">
        <CardTitle>Contact Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</span>
          <Input
            value={person.name}
            onChange={(event) => person.$jazz.set("name", event.target.value)}
            placeholder="Contact name"
          />
        </label>

        <div className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fields (Object)</span>
          <ObjectFieldsEditor
            key={person.$jazz.id}
            value={person.fields}
            addLabel="Add contact field"
            onChange={(nextObject) => {
              person.$jazz.set("fields", nextObject);
            }}
          />
        </div>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comments</span>
          <textarea
            className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={commentsValue}
            onChange={(event) => {
              if (person.comment.$isLoaded) {
                person.comment.$jazz.applyDiff(event.target.value);
              }
            }}
            placeholder="Add notes about this contact"
          />
        </label>
      </CardContent>
    </Card>
  );
};
