import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Pin } from "lucide-react";
import { useAccount } from "jazz-tools/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Account } from "@/schema";

export const ProjectsPage = () => {
  const data = useAccount(Account, {
    resolve: {
      root: {
        organizations: { $each: true },
        projects: { $each: true },
        pinnedProjects: { $each: true }
      },
    },
    select: (account) =>
      account.$isLoaded
        ? { account: account, organizations: account.root.organizations, projects: account.root.projects, pinnedProjects: account.root.pinnedProjects }
        : { account: null, organizations: null, projects: null, pinnedProjects: null},
  });

  const standaloneProjects = useMemo(
    () =>
      [...data.projects ?? []]
        .filter((project) => !project.orgId || project.orgId === 0)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [data.projects],
  );

  const sortedOrganizations = useMemo(
    () => [...data.organizations ?? []].sort((left, right) => left.name.localeCompare(right.name)),
    [data.organizations],
  );

  const pinnedProjectIds: Record<number, object> = data.pinnedProjects?.reduce(((prev, current) => ({...prev, [current.id]: current})), {}) ?? {}

  const hasAnyContent = standaloneProjects.length > 0 || sortedOrganizations.length > 0;
  const isPageLoading = data === null;

  const togglePin = (projectId: number) => {
    const project = data.projects?.find(p => p.id === projectId)
    if (!project) return
    const pinnedProject = pinnedProjectIds[projectId]
    if (pinnedProject === undefined) {
      data.pinnedProjects?.$jazz.push(project)
    } else {
      data.pinnedProjects?.$jazz.remove(p => p.id === projectId)
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-6">
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
                  <Button type="button">Create Project</Button>
                  <Button type="button" variant="outline">
                    Create Org
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className="space-y-4">
              <p className="text-xs uppercase tracking-[0.14em] text-stone-500">My Organizations</p>

              {sortedOrganizations.length === 0 ? (
                <Card className="border-stone-200 bg-stone-50">
                  <CardContent className="py-5 text-sm text-stone-500">No organizations yet.</CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedOrganizations.map((organization) => (
                    <Link key={organization.id} to={`/organizations/${organization.id}`}>
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
                        <Button type="button">Create Project</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {standaloneProjects.map((project) => {
                    const isPinned = project.id in pinnedProjectIds

                    return (
                      <Card
                        key={project.id}
                        className="border-stone-200 bg-stone-50 transition-colors hover:border-stone-300 hover:bg-stone-100/70"
                      >
                        <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/projects/${project.id}/overview`}
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
                              onClick={() => togglePin(project.id)}
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
    </div>
  );
};