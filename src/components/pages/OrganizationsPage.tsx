import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAccount } from "jazz-tools/react";
import { co } from "jazz-tools";

import { Account, Organization } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateOrganizationDialog } from "@/components/dialogs/CreateOrganizationDialog";
import { getProjectBasePath } from "@/lib/projectPaths";

export const OrganizationsPage = () => {
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  const account = useAccount(Account, {
    resolve: {
      root: {
        personal_organization: { projects: { $each: true } },
        organizations: { $each: { projects: { $each: true } } },
      },
    },
  });

  const organizations = useMemo(() => {
    if (!account.$isLoaded) return [];

    const personal = account.root.personal_organization
      ? [{ org: account.root.personal_organization, type: "personal" as const }]
      : [];

    const memberOrgs = [...account.root.organizations]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((org) => ({ org, type: "member" as const }));

    return [...personal, ...memberOrgs];
  }, [account]);

  if (!account.$isLoaded) {
    return <div className="p-4 text-sm text-muted-foreground">Loading organizations...</div>;
  }

  const createOrganization = (name: string) => {
    const organization = Organization.create({
      name,
      overview: co.richText().create(""),
      projects: [],
      documents: [],
      people: [],
    });

    account.root.organizations.$jazz.push(organization);
  };

  return (
    <section className="p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organizations</CardTitle>
          <Button type="button" onClick={() => setIsCreateOrgOpen(true)}>
            Create Org
          </Button>
        </CardHeader>
        <CardContent>
          <p className="pb-3 text-sm text-muted-foreground">Select an organization to view details.</p>
          {organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No organizations found.</p>
          ) : (
            <ul className="space-y-4">
              {organizations.map(({ org, type }) => (
                <li key={org.$jazz.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/organizations/${org.$jazz.id}/overview`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {org.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{type === "personal" ? "Personal" : "Member"}</span>
                  </div>

                  <ul className="ml-5 list-disc space-y-1 text-sm">
                    {org.projects.length === 0 ? (
                      <li className="list-none text-xs text-muted-foreground">No projects</li>
                    ) : (
                      [...org.projects]
                        .sort((left, right) => left.name.localeCompare(right.name))
                        .map((project) => (
                          <li key={project.$jazz.id}>
                            <Link
                              to={`${getProjectBasePath(project.$jazz.id, org.$jazz.id)}/overview`}
                              className="text-muted-foreground hover:text-foreground hover:underline"
                            >
                              {project.name}
                            </Link>
                          </li>
                        ))
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateOrganizationDialog
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
        onSubmit={createOrganization}
      />
    </section>
  );
};
