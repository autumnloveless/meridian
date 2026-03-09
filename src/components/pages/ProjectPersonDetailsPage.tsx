import { Link, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { PersonDetailsCard } from "@/components/people/PersonDetailsCard";
import { Button } from "@/components/ui/button";
import { Person } from "@/schema";

export const ProjectPersonDetailsPage = () => {
  const { orgId, projectId, personId } = useParams();
  const person = useCoState(Person, personId, {
    resolve: {
      comment: true,
    },
  });

  if (!orgId || !projectId || !personId) {
    return <div className="text-sm text-red-700">Invalid person URL.</div>;
  }

  if (!person.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading person details...</div>;
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{person.name}</h2>
        <Button type="button" variant="outline" asChild>
          <Link to={`/organizations/${orgId}/projects/${projectId}/people`}>Back to People</Link>
        </Button>
      </div>
      <PersonDetailsCard person={person} />
    </section>
  );
};
