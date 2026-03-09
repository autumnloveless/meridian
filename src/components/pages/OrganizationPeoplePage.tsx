import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";

export const OrganizationPeoplePage = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId, {
    resolve: {
      people: { $each: true },
    },
  });

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading organization people...</div>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">People</h2>
      {organization.people.length === 0 ? (
        <p className="text-sm text-muted-foreground">No people in this organization yet.</p>
      ) : (
        <ul className="space-y-1">
          {organization.people.map((person) => (
            <li key={person.$jazz.id} className="rounded border bg-background px-3 py-2 text-sm">
              {person.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
