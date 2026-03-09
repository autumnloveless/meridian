import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Link2, Plus, Unlink2 } from "lucide-react";
import { useCoState } from "jazz-tools/react";

import { CreatePersonDialog } from "@/components/dialogs/CreatePersonDialog";
import { LinkPeopleDialog } from "@/components/dialogs/LinkPeopleDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Organization, Person, Project } from "@/schema";

export const ProjectPeoplePage = () => {
  const { orgId, projectId } = useParams();
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const organization = useCoState(Organization, orgId, {
    resolve: {
      people: { $each: true },
    },
  });

  const project = useCoState(Project, projectId, {
    resolve: {
      people: { $each: true },
      linked_people: { $each: true },
    },
  });

  useEffect(() => {
    if (!project.$isLoaded) return;

    const legacyPeople = project.people.map((person) => person);
    for (const person of legacyPeople) {
      const alreadyLinked = project.linked_people.some(
        (candidate) => candidate.$jazz.id === person.$jazz.id,
      );
      if (!alreadyLinked) {
        project.linked_people.$jazz.push(person);
      }
    }
  }, [project]);

  const linkedPeople = useMemo(() => {
    if (!project.$isLoaded) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return [...project.linked_people]
      .filter((person) => person.name.toLowerCase().includes(normalizedQuery))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [project, searchQuery]);

  const linkablePeople = useMemo(() => {
    if (!organization.$isLoaded || !project.$isLoaded) return [];

    const linkedIds = new Set(project.linked_people.map((person) => person.$jazz.id));
    return organization.people
      .filter((person) => !linkedIds.has(person.$jazz.id))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((person) => ({ id: person.$jazz.id, name: person.name }));
  }, [organization, project]);

  if (!organization.$isLoaded || !project.$isLoaded || !orgId || !projectId) {
    return <div className="text-sm text-muted-foreground">Loading project people...</div>;
  }

  return (
    <section className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Project People</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="sm:self-start" onClick={() => setIsCreateOpen(true)}>
              <Plus className="size-4" />
              Add Person
            </Button>
            <Button
              type="button"
              variant="outline"
              className="sm:self-start"
              onClick={() => setIsLinkOpen(true)}
              disabled={linkablePeople.length === 0}
            >
              <Link2 className="size-4" />
              Link Person
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search people"
            className="mb-3"
          />
          {linkedPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? "No linked people match your search." : "No contacts linked to this project yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {linkedPeople.map((person) => (
                <li
                  key={person.$jazz.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/40 px-3 py-2"
                >
                  <Link
                    to={`/organizations/${orgId}/projects/${projectId}/people/${person.$jazz.id}`}
                    className="text-sm transition-colors hover:text-primary hover:underline"
                  >
                    {person.name}
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      project.linked_people.$jazz.remove(
                        (candidate) => candidate.$jazz.id === person.$jazz.id,
                      );
                    }}
                  >
                    <Unlink2 className="size-4" />
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LinkPeopleDialog
        open={isLinkOpen}
        onOpenChange={setIsLinkOpen}
        people={linkablePeople}
        onLink={(personIds) => {
          for (const personId of personIds) {
            const person = organization.people.find((candidate) => candidate.$jazz.id === personId);
            if (!person) continue;

            const alreadyLinked = project.linked_people.some(
              (candidate) => candidate.$jazz.id === person.$jazz.id,
            );
            if (alreadyLinked) continue;

            project.linked_people.$jazz.push(person);
          }
        }}
      />

      <CreatePersonDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(name) => {
          const person = Person.create({
            name,
            fields: {},
            comment: "",
          });
          organization.people.$jazz.push(person);
          project.linked_people.$jazz.push(person);
        }}
      />
    </section>
  );
};