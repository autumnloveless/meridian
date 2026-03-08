import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Pin } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { co } from "jazz-tools";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrganizationDialog } from "../dialogs/CreateOrganizationDialog";
import { CreateProjectDialog } from "../dialogs/CreateProjectDialog";
import { Account, Document, Organization, Project } from "@/schema";

export const OrganizationProjectsPage = () => {
  const { orgId } = useParams();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  const data = useAccount(Account, {
    resolve: {
      root: {
        organizations: { $each: { projects: { $each: true } } },
        pinned_projects: { $each: true },
      },
    },
    select: (account) =>
      account.$isLoaded
        ? {
            account,
            organizations: account.root.organizations,
            pinned_projects: account.root.pinned_projects,
          }
        : { account: null, organizations: null, pinned_projects: null },
  });

  if (!orgId) {
    return <div>Organization not found</div>
  }

  const organization = data.organizations?.find((org) => org.$jazz.id === orgId) ?? null;

  const organizationProjects = useMemo(
    () => [...(organization?.projects ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [organization?.projects],
  );

  const pinnedProjectIds: Record<string, object> =
    data.pinned_projects?.reduce((prev, current) => ({ ...prev, [current.$jazz.id]: current }), {}) ?? {};

  const hasAnyContent = organizationProjects.length > 0;
  const isPageLoading = !data.account;

  const togglePin = (projectId: string) => {
    const project = organizationProjects.find((p) => p.$jazz.id === projectId);
    if (!project) return;

    const pinnedProject = pinnedProjectIds[projectId];
    if (pinnedProject === undefined) {
      data.pinned_projects?.$jazz.push(project);
    } else {
      data.pinned_projects?.$jazz.remove((p) => p.$jazz.id === projectId);
    }
  };

  const createOrganization = (name: string) => {
    if (!data.account?.root) {
      return;
    }

    data.account.root.organizations.$jazz.push(Organization.create({ name, projects: [] }));
  };

  const createProject = ({ name }: { name: string }) => {
    if (!organization) {
      return;
    }

    organization.projects?.$jazz.push(
      Project.create({
        name,
        overview: co.richText().create(""),
        documents: [
          Document.create({ name: "Meeting Notes", content: co.richText().create(""), children: [] }),
          Document.create({ name: "Design Docs", content: co.richText().create(""), children: [] }),
          Document.create({ name: "Technical Docs", content: co.richText().create(""), children: [] }),
        ],
        requirements: [],
        tests: [],
        test_results: [],
        people: [],
        task_buckets: [],
      }),
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" asChild>
            <Link to="/projects" aria-label="Back to projects">
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </Button>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
              Create Project
            </Button>

            <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(true)}>
              Create Org
            </Button>
          </div>
        </div>

        {isPageLoading ? (
          <section className="space-y-3">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </section>
        ) : !organization ? (
          <Card className="border-stone-200 bg-stone-50">
            <CardContent className="py-12">
              <div className="mx-auto max-w-md text-center">
                <h2 className="text-lg font-semibold text-stone-800">Organization not found</h2>
                <p className="mt-2 text-sm text-stone-600">The requested organization could not be loaded.</p>
              </div>
            </CardContent>
          </Card>
        ) : !hasAnyContent ? (
          <Card className="border-stone-200 bg-stone-50">
            <CardContent className="py-12">
              <div className="mx-auto max-w-md text-center">
                <h2 className="text-lg font-semibold text-stone-800">No projects yet</h2>
                <p className="mt-2 text-sm text-stone-600">Create a project to get started.</p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
                    Create Project
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4">
            <p className="text-xs uppercase tracking-[0.14em] text-stone-500">My projects</p>

            <div className="grid gap-4">
              {organizationProjects.map((project) => {
                const isPinned = project.$jazz.id in pinnedProjectIds;

                return (
                  <Card
                    key={project.$jazz.id}
                    className="border-stone-200 bg-stone-50 transition-colors hover:border-stone-300 hover:bg-stone-100/70"
                  >
                    <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/projects/${project.$jazz.id}/overview`}
                          className="block truncate text-base font-semibold text-stone-900 hover:underline"
                        >
                          {project.name}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant={isPinned ? "secondary" : "outline"}
                          onClick={() => togglePin(project.$jazz.id)}
                          aria-label={isPinned ? `Unpin ${project.name}` : `Pin ${project.name}`}
                          title={isPinned ? "Unpin project" : "Pin project"}
                        >
                          <Pin className="h-4 w-4" fill={isPinned ? "currentColor" : "none"} />
                        </Button>

                        <Badge variant="outline" className="uppercase tracking-[0.12em] text-stone-500">
                          Project
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </section>

      <CreateOrganizationDialog
        open={isCreateOrgOpen}
        onOpenChange={setIsCreateOrgOpen}
        onSubmit={createOrganization}
      />

      <CreateProjectDialog
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        onSubmit={createProject}
      />
    </div>
  );
};