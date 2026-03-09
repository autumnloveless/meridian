import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useAccount } from "jazz-tools/react";
import { Group } from "jazz-tools";

import { Account, Organization } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateOrganizationDialog } from "@/components/dialogs/CreateOrganizationDialog";
import { getProjectBasePath } from "@/lib/projectPaths";
import { defaultProjectKeyFromName } from "@/lib/taskIds";

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
    const organizationOwner = Group.create();
    const organization = Organization.create({
      name,
      project_key: defaultProjectKeyFromName(name, "ORG"),
      next_task_number: 1,
      overview: "",
      projects: [],
      documents: [
        { name: "Meeting Notes", content: "", children: [] },
        { name: "Project Ideas", content: "", children: [] },
      ],
      people: [],
      task_buckets: [],
    }, { owner: organizationOwner });

    account.root.organizations.$jazz.push(organization);
  };

  return (
    <section className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">Organizations</CardTitle>
            <p className="pt-1 text-sm text-muted-foreground">Browse your organizations and jump directly into projects.</p>
          </div>
          <Button type="button" onClick={() => setIsCreateOrgOpen(true)} className="sm:self-start">
            Create Org
          </Button>
        </CardHeader>
        <CardContent className="">
          {organizations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No organizations found.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {organizations.map(({ org, type }) => (
                <li key={org.$jazz.id} className="rounded-lg border border-border/70 bg-card/40 p-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/organizations/${org.$jazz.id}/overview`}
                      className="text-sm font-semibold text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {org.name}
                    </Link>
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {type === "personal" ? "Personal" : "Member"}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 border-l border-border/70 pl-4 text-sm">
                    {org.projects.length === 0 ? (
                      <li className="text-xs italic text-muted-foreground">No projects</li>
                    ) : (
                      [...org.projects]
                        .sort((left, right) => left.name.localeCompare(right.name))
                        .map((project) => (
                          <li key={project.$jazz.id}>
                            <Link
                              to={`${getProjectBasePath(project.$jazz.id, org.$jazz.id)}/overview`}
                              className="inline-flex items-center rounded-sm px-1 py-0.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground hover:underline"
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
