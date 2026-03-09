import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";

export const OrganizationDocsPage = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId, {
    resolve: {
      documents: { $each: true },
    },
  });

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading organization docs...</div>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Docs</h2>
      {organization.documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No organization docs yet.</p>
      ) : (
        <ul className="space-y-1">
          {organization.documents.map((document) => (
            <li key={document.$jazz.id} className="rounded border bg-background px-3 py-2 text-sm">
              {document.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
