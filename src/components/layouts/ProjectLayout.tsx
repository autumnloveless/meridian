import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Organization, Project } from "@/schema";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocsNavSection } from "@/components/docs/DocsNavSection";
import { cn } from "@/lib/utils";
import { getProjectBasePath } from "@/lib/projectPaths";

const projectNavItems = [
  { to: "overview", label: "Overview" },
  { to: "tasks", label: "Tasks" },
  { to: "people", label: "People" },
  { to: "requirements", label: "Requirements" },
  { to: "tests", label: "Tests" },
  { to: "docs", label: "Docs" },
] as const;

const taskSubNavItems = [
  { to: "tasks/list", label: "List" },
  { to: "tasks/board", label: "Board" },
  { to: "tasks/archive", label: "Archive" },
] as const;

export const ProjectLayout = () => {
  const { projectId, orgId } = useParams();
  const location = useLocation();

  const project = useCoState(Project, projectId, {
    resolve: {
      documents: { $each: true },
    },
  });

  const organization = useCoState(Organization, orgId);
  const account = useAccount(Account, {
    resolve: {
      root: {
        recent_projects: { $each: true },
      },
    },
  });

  const projectBasePath = useMemo(() => {
    if (!projectId || !orgId) return "";
    return getProjectBasePath(projectId, orgId);
  }, [orgId, projectId]);

  useEffect(() => {
    if (!account.$isLoaded || !project.$isLoaded || !projectId) return;

    const recentProjects = account.root.recent_projects;
    if (recentProjects[0]?.$jazz.id === projectId) return;

    recentProjects.$jazz.remove((item) => item.$jazz.id === projectId);
    recentProjects.$jazz.unshift(project);
    recentProjects.$jazz.retain((_, index) => index < 25);
  }, [account, project, projectId]);

  const isInTasksSection = projectId
    ? location.pathname.startsWith(`${projectBasePath}/tasks`)
    : false;

  const isInDocsSection = projectId
    ? location.pathname.startsWith(`${projectBasePath}/docs`)
    : false;
  const organizationSubtitle = orgId
    ? organization.$isLoaded
      ? organization.name
      : organization.$jazz.loadingState === "unauthorized"
        ? "Organization not accessible"
        : organization.$jazz.loadingState === "unavailable"
          ? "Organization not found"
          : "Loading organization..."
    : null;


  const activeDocId = useMemo(() => {
    const match = location.pathname.match(/\/docs\/(.+)$/);
    return match?.[1] ?? null;
  }, [location.pathname]);

  const projectTitle = project.$isLoaded
    ? project.name
    : project.$jazz.loadingState === "unauthorized"
      ? "Project not accessible"
      : project.$jazz.loadingState === "unavailable"
        ? "Project not found"
        : project.$jazz.loadingState === "deleted"
          ? "Project deleted"
          : "Loading project...";


  if (!orgId || !projectId) {
    return <div className="p-4 text-sm text-red-700">Invalid project URL.</div>;
  }

  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle className="truncate text-lg">{projectTitle}</CardTitle>
          {organizationSubtitle && <p className="text-xs text-muted-foreground">{organizationSubtitle}</p>}
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-2">
          <nav aria-label="Project navigation" className="flex flex-col gap-1">
            {projectNavItems.map((item) => (
              <div key={item.to} className="flex flex-col gap-1">
                {item.to === "docs" && project.$isLoaded ? (
                  <DocsNavSection
                    to="docs"
                    label="Docs"
                    isActive={isInDocsSection}
                    basePath={projectBasePath}
                    documents={project.documents}
                    activeDocId={activeDocId}
                  />
                ) : (
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        buttonVariants({ variant: "ghost" }),
                        "w-full justify-start",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                )}

                {item.to === "tasks" && isInTasksSection && (
                  <div className="ml-4 flex flex-col gap-1 border-l pl-2">
                    {taskSubNavItems.map((subItem) => (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        className={({ isActive }) =>
                          cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-8 w-full justify-start px-2 text-xs",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                          )
                        }
                      >
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}

              </div>
            ))}
          </nav>

          <div className="mt-auto border-t pt-3">
            <NavLink
              to="settings"
              className={({ isActive }) =>
                cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )
              }
            >
              Settings
            </NavLink>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full min-h-0" size="sm">
        <CardContent className="h-full min-h-0">
          <Outlet />
        </CardContent>
      </Card>

    </section>
  );
};
