import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";
import { Plus } from "lucide-react";

import { CreatePersonDialog } from "@/components/dialogs/CreatePersonDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Organization, Person } from "@/schema";

export const OrganizationPeoplePage = () => {
  const { orgId } = useParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const organization = useCoState(Organization, orgId, {
    resolve: {
      people: { $each: true },
    },
  });

  const sortedPeople = useMemo(() => {
    if (!organization.$isLoaded) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...organization.people]
      .filter((person) => person.name.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [organization, searchQuery]);

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading organization people...</div>;
  }

  return (
    <section className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>People</CardTitle>
          <Button type="button" onClick={() => setIsCreateOpen(true)} className="sm:self-start">
            <Plus className="size-4" />
            Add Person
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search people"
            className="mb-3"
          />
          {sortedPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? "No people match your search." : "No people in this organization yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedPeople.map((person) => (
                <li key={person.$jazz.id}>
                  <Link
                    to={`/organizations/${orgId}/people/${person.$jazz.id}`}
                    className="block rounded-lg border border-border/70 bg-card/40 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                  >
                    {person.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreatePersonDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(name) => {
          organization.people.$jazz.push(
            Person.create({
              name,
              fields: {},
              comment: "",
            }),
          );
        }}
      />
    </section>
  );
};
