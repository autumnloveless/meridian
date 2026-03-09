import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Pin } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { co } from "jazz-tools";

import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrganizationDialog } from "../dialogs/CreateOrganizationDialog";
import { CreateProjectDialog } from "../dialogs/CreateProjectDialog";
import { Account, Document, Organization, Project } from "@/schema";
import { cn } from "@/lib/utils";

type ProjectScope = "all" | "standalone" | string;

export const ProjectsPage = () => {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
  const [dropTargetOrgId, setDropTargetOrgId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const data = useAccount(Account, {
    resolve: {
      root: {
        organizations: { $each: { projects: { $each: true } } },
        projects: { $each: true },
        pinned_projects: { $each: true },
      },
    },
    select: (account) =>
      account.$isLoaded
        ? {
            account,
            organizations: account.root.organizations,
            projects: account.root.projects,
            pinned_projects: account.root.pinned_projects,
          }
        : { account: null, organizations: null, projects: null, pinned_projects: null },
  });

  const standaloneProjects = useMemo(
    () => [...(data.projects ?? [])].sort((left, right) => left.name.localeCompare(right.name)),
    [data.projects],
  );

  const sortedOrganizations = useMemo(
    () => [...data.organizations ?? []].sort((left, right) => left.name.localeCompare(right.name)),
    [data.organizations],
  );

  const organizationProjects = useMemo(() => {
    return sortedOrganizations.flatMap((organization) =>
      [...(organization.projects ?? [])].map((project) => ({
        project,
        organizationId: organization.$jazz.id,
        organizationName: organization.name,
      })),
    );
  }, [sortedOrganizations]);

  const allProjects = useMemo(() => {
    const standalone = standaloneProjects.map((project) => ({
      project,
      organizationId: null,
      organizationName: null,
    }));
    return [...standalone, ...organizationProjects].sort((left, right) => left.project.name.localeCompare(right.project.name));
  }, [standaloneProjects, organizationProjects]);

  const allProjectsById = useMemo(
    () => allProjects.reduce<Record<string, (typeof allProjects)[number]>>((prev, current) => ({ ...prev, [current.project.$jazz.id]: current }), {}),
    [allProjects],
  );

  const pinnedProjectIds = useMemo(() => new Set((data.pinned_projects ?? []).map((project) => project.$jazz.id)), [data.pinned_projects]);

  const selectedScope = useMemo<ProjectScope>(() => {
    const scope = searchParams.get("scope") ?? "all";
    if (scope === "all" || scope === "standalone") {
      return scope;
    }

    const isKnownOrg = sortedOrganizations.some((organization) => organization.$jazz.id === scope);
    return isKnownOrg ? scope : "all";
  }, [searchParams, sortedOrganizations]);

  const setScope = (scope: ProjectScope) => {
    const next = new URLSearchParams(searchParams);
    if (scope === "all") {
      next.delete("scope");
    } else {
      next.set("scope", scope);
    }
    setSearchParams(next);
  };

  const visibleProjects = useMemo(() => {
    if (selectedScope === "all") {
      const pinned = allProjects.filter((entry) => pinnedProjectIds.has(entry.project.$jazz.id));
      const unpinned = allProjects.filter((entry) => !pinnedProjectIds.has(entry.project.$jazz.id));
      return [...pinned, ...unpinned];
    }

    if (selectedScope === "standalone") {
      return allProjects.filter((entry) => entry.organizationId === null);
    }

    return allProjects.filter((entry) => entry.organizationId === selectedScope);
  }, [allProjects, selectedScope, pinnedProjectIds]);

  const activeOrgName = useMemo(
    () => sortedOrganizations.find((organization) => organization.$jazz.id === selectedScope)?.name,
    [selectedScope, sortedOrganizations],
  );

  const hasAnyContent = allProjects.length > 0;
  const isPageLoading = !data.account;

  const moveProjectToOrganization = (projectId: string, targetOrganizationId: string) => {
    if (!data.account) {
      return;
    }

    const projectEntry = allProjectsById[projectId];
    if (!projectEntry || projectEntry.organizationId === targetOrganizationId) {
      return;
    }

    const sourceOrganization =
      projectEntry.organizationId === null
        ? null
        : sortedOrganizations.find((organization) => organization.$jazz.id === projectEntry.organizationId);
    const targetOrganization = sortedOrganizations.find((organization) => organization.$jazz.id === targetOrganizationId);

    if (!targetOrganization) {
      return;
    }

    if (sourceOrganization) {
      sourceOrganization.projects.$jazz.remove((project) => project.$jazz.id === projectId);
    } else {
      data.account.root.projects.$jazz.remove((project) => project.$jazz.id === projectId);
    }

    const isAlreadyInTarget = targetOrganization.projects.some((project) => project.$jazz.id === projectId);
    if (!isAlreadyInTarget) {
      targetOrganization.projects.$jazz.push(projectEntry.project);
    }
  };

  const canDropProjectIntoOrganization = (projectId: string, organizationId: string) => {
    const projectEntry = allProjectsById[projectId];
    if (!projectEntry) {
      return false;
    }

    return projectEntry.organizationId !== organizationId;
  };

  const togglePin = (projectId: string) => {
    const projectEntry = allProjectsById[projectId];
    if (!projectEntry) return;

    if (!pinnedProjectIds.has(projectId)) {
      data.pinned_projects?.$jazz.push(projectEntry.project);
    } else {
      data.pinned_projects?.$jazz.remove((p) => p.$jazz.id === projectId);
    }
  };

  const createOrganization = (name: string) => {
    if (!data.account?.root) {
      return;
    }

    const { root } = data.account;

    root.organizations.$jazz.push(Organization.create({ name, projects: [] }));
  };

  const createProject = ({ name }: { name: string }) => {
    if (!data.account?.root) {
      return;
    }

    const project = Project.create({
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
    });

    if (selectedScope !== "all" && selectedScope !== "standalone") {
      const targetOrganization = sortedOrganizations.find((organization) => organization.$jazz.id === selectedScope);

      if (targetOrganization) {
        targetOrganization.projects.$jazz.push(project);
        return;
      }
    }

    data.account.root.projects.$jazz.push(project);
  };

  const scopeLabel =
    selectedScope === "all"
      ? "All projects"
      : selectedScope === "standalone"
        ? "Standalone projects"
        : activeOrgName
          ? `${activeOrgName} projects`
          : "Projects";

  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle className="truncate text-lg">Organizations</CardTitle>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-col gap-4">
          {isPageLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              <nav aria-label="Project filters" className="flex flex-col gap-1">
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-start",
                    selectedScope === "all" ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setScope("all")}
                >
                  All projects
                </button>

                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-start",
                    selectedScope === "standalone" ? "bg-muted text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setScope("standalone")}
                >
                  Standalone
                </button>
              </nav>

              <div className="border-t pt-3">
                <p className="px-3 pb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">My organizations</p>

                {sortedOrganizations.length === 0 ? (
                  <p className="px-3 text-sm text-muted-foreground">No organizations yet.</p>
                ) : (
                  <nav aria-label="Organizations" className="flex flex-col gap-1">
                    {sortedOrganizations.map((organization) => {
                      const isActive = selectedScope === organization.$jazz.id;
                      const isDropTarget = dropTargetOrgId === organization.$jazz.id;

                      return (
                        <button
                          key={organization.$jazz.id}
                          type="button"
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "w-full min-w-0 justify-start truncate",
                            isActive ? "bg-muted text-foreground" : "text-muted-foreground",
                            isDropTarget ? "ring-2 ring-primary ring-offset-1" : null,
                          )}
                          onClick={() => setScope(organization.$jazz.id)}
                          onDragOver={(event) => {
                            if (!draggingProjectId) {
                              return;
                            }

                            if (!canDropProjectIntoOrganization(draggingProjectId, organization.$jazz.id)) {
                              return;
                            }

                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDropTargetOrgId(organization.$jazz.id);
                          }}
                          onDragLeave={() => {
                            setDropTargetOrgId((prev) => (prev === organization.$jazz.id ? null : prev));
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const projectId = draggingProjectId ?? event.dataTransfer.getData("text/plain");
                            if (!projectId) {
                              return;
                            }

                            moveProjectToOrganization(projectId, organization.$jazz.id);
                            setDraggingProjectId(null);
                            setDropTargetOrgId(null);
                          }}
                        >
                          {organization.name}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            </>
          )}

          <div className="mt-auto border-t pt-3">
            <Button type="button" className="w-full" onClick={() => setIsCreateOrgOpen(true)}>
              Create Org
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full min-h-0 !gap-0">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="truncate text-lg">{scopeLabel}</CardTitle>
              {!isPageLoading ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}
                </p>
              ) : null}
            </div>

            <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
              Create Project
            </Button>
          </div>
        </CardHeader>

        <CardContent className="h-full min-h-0 overflow-auto p-0">
          {isPageLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !hasAnyContent ? (
            <div className="p-8 text-center">
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
          ) : visibleProjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">This organization does not contain any projects.</div>
          ) : (
            <ul className="divide-y">
              {visibleProjects.map(({ project, organizationName }) => {
                const isPinned = pinnedProjectIds.has(project.$jazz.id);

                return (
                  <li
                    key={project.$jazz.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", project.$jazz.id);
                      setDraggingProjectId(project.$jazz.id);
                    }}
                    onDragEnd={() => {
                      setDraggingProjectId(null);
                      setDropTargetOrgId(null);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/projects/${project.$jazz.id}/overview`}
                        className="block truncate text-sm font-semibold text-stone-900 hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {organizationName ? `Organization: ${organizationName}` : "Standalone project"}
                      </p>
                    </div>

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
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

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
    </section>
  );
};