import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Pin } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { co } from "jazz-tools";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrganizationDialog } from "../dialogs/CreateOrganizationDialog";
import { CreateProjectDialog } from "../dialogs/CreateProjectDialog";
import { Account, Document, Organization, Project } from "@/schema";

export const ProjectsPage = () => {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);

  const data = useAccount(Account, {
    resolve: {
      root: {
        organizations: { $each: { projects: { $each: true } } },
        projects: { $each: true },
        pinned_projects: { $each: true }
      },
    },
    select: (account) =>
      account.$isLoaded
        ? { account: account, organizations: account.root.organizations, projects: account.root.projects, pinned_projects: account.root.pinned_projects }
        : { account: null, organizations: null, projects: null, pinned_projects: null},
  });

  const standaloneProjects = useMemo(
    () =>
      [...data.projects ?? []]
        .sort((left, right) => left.name.localeCompare(right.name)),
    [data.projects],
  );

  const sortedOrganizations = useMemo(
    () => [...data.organizations ?? []].sort((left, right) => left.name.localeCompare(right.name)),
    [data.organizations],
  );

  const pinnedProjectIds: Record<string, object> = data.pinned_projects?.reduce(((prev, current) => ({...prev, [current.$jazz.id]: current})), {}) ?? {}

  const organizationProjects = useMemo(
    () =>
      sortedOrganizations.flatMap((organization) =>
        [...(organization.projects ?? [])].map((project) => ({
          project,
          organizationName: organization.name,
        })),
      ),
    [sortedOrganizations],
  );

  const organizationNameByProjectId = useMemo(
    () =>
      organizationProjects.reduce<Record<string, string>>(
        (prev, current) => ({ ...prev, [current.project.$jazz.id]: current.organizationName }),
        {},
      ),
    [organizationProjects],
  );

  const pinnedProjects = useMemo(
    () => [...(data.pinned_projects ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [data.pinned_projects],
  );

  const hasAnyContent = standaloneProjects.length > 0 || sortedOrganizations.length > 0;
  const hasPinnedProjects = pinnedProjects.length > 0;
  const isPageLoading = !data.account;

  const togglePin = (projectId: string) => {
    const project = data.projects?.find(p => p.$jazz.id === projectId)
    if (!project) return
    const pinnedProject = pinnedProjectIds[projectId]
    if (pinnedProject === undefined) {
      data.pinned_projects?.$jazz.push(project)
    } else {
      data.pinned_projects?.$jazz.remove(p => p.$jazz.id === projectId)
    }
  };

  const createOrganization = (name: string) => {
    if (!data.account?.root) { return; }
    const { root } = data.account;

    root.organizations.$jazz.push(
      Organization.create({ name, projects: [] }),
    );
  };

  const createProject = ({ name }: { name: string }) => {
    if (!data.account?.root) { return; }
    const { root } = data.account;

    root.projects.$jazz.push(
      Project.create({
        name: name,
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
        task_buckets: []
      }),
    );

  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-6">
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
            Create Project
          </Button>

          <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(true)}>
            Create Org
          </Button>
        </div>

        {isPageLoading ? (
          <section className="space-y-3">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </section>
        ) : !hasAnyContent ? (
          <Card className="border-stone-200 bg-stone-50">
            <CardContent className="py-12">
              <div className="mx-auto max-w-md text-center">
                <h2 className="text-lg font-semibold text-stone-800">No projects or organizations yet</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Create an organization or start a standalone project to set up your workspace.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
                    Create Project
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(true)}>
                    Create Org
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {hasPinnedProjects ? (
              <section className="space-y-4">
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">Pinned projects</p>

                <div className="grid gap-4">
                  {pinnedProjects.map((project) => {
                    const isPinned = project.$jazz.id in pinnedProjectIds
                    const organizationName = organizationNameByProjectId[project.$jazz.id]

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
                            <p className="mt-1 text-sm text-stone-600">
                              {organizationName ? `Organization: ${organizationName}` : "Standalone project"}
                            </p>
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
                    )
                  })}
                </div>
              </section>
            ) : null}

            <section className="space-y-4">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500">My Organizations</p>

              {sortedOrganizations.length === 0 ? (
                <Card className="border-stone-200 bg-stone-50">
                  <CardContent className="py-5 text-sm text-stone-500">No organizations yet.</CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedOrganizations.map((organization) => (
                    <Link key={organization.$jazz.id} to={`/organizations/${organization.$jazz.id}`}>
                      <Card className="h-full border-stone-200 bg-stone-50 transition-colors hover:border-stone-300 hover:bg-stone-100/70">
                        <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                          <div>
                            <h2 className="text-base font-semibold text-stone-900">{organization.name}</h2>
                            <p className="mt-1 text-sm text-stone-600">View projects in this organization.</p>
                          </div>

                          <Badge variant="outline" className="uppercase tracking-[0.12em] text-stone-500">
                            Org
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500">My projects</p>

              {standaloneProjects.length === 0 ? (
                <Card className="border-stone-200 bg-stone-50">
                  <CardContent className="py-10">
                    <div className="max-w-xl">
                      <h2 className="text-lg font-semibold text-stone-800">No standalone projects yet</h2>
                      <p className="mt-2 text-sm text-stone-600">
                        Create a project without selecting an organization if you want it to live directly in your
                        workspace.
                      </p>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
                          Create Project
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {standaloneProjects.map((project) => {
                    const isPinned = project.$jazz.id in pinnedProjectIds

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
              )}
            </section>
          </>
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