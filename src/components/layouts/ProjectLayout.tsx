import { useEffect, useMemo } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useAccount, useCoState } from "jazz-tools/react";
import {
  Archive,
  CircleCheck,
  ClipboardList,
  FileText,
  FlaskConical,
  House,
  LayoutList,
  Settings,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Account, Organization, Project } from "@/schema";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DocsNavSection } from "@/components/docs/DocsNavSection";
import { cn } from "@/lib/utils";
import { getProjectBasePath } from "@/lib/projectPaths";

const projectNavItems = [
  { to: "overview", label: "Overview", icon: House },
  { to: "tasks", label: "Tasks", icon: CircleCheck },
  { to: "requirements", label: "Requirements", icon: ClipboardList },
  { to: "tests", label: "Tests", icon: FlaskConical },
  { to: "docs", label: "Docs", icon: FileText },
  { to: "people", label: "People", icon: User },
] as const;

const taskSubNavItems = [
  { to: "tasks/list", label: "List", icon: LayoutList },
  { to: "tasks/board", label: "Board", icon: CircleCheck },
  { to: "tasks/archive", label: "Archive", icon: Archive },
] as const;

export const ProjectLayout = () => {
  const { projectId, orgId } = useParams();
  const location = useLocation();

  const project = useCoState(Project, projectId, {
    resolve: {
      documents: { $each: { $onError: "catch" } },
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
    <section className="grid h-full min-h-0 w-full grid-cols-1 gap-4 bg-muted/20 p-4 md:grid-cols-[240px_minmax(0,1fr)]">
      <Card size="sm" className="h-full min-h-0 rounded-xl border-border/70 !gap-0">
        <CardHeader className="border-b">
          <h2 className="whitespace-normal break-all text-base font-semibold leading-tight">{projectTitle}</h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">{organizationSubtitle ?? "Organization"}</p>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
            <nav aria-label="Project navigation" className="flex flex-col gap-1">
              {projectNavItems.map((item) => {
                const Icon: LucideIcon = item.icon;

                return (
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
                            "w-full justify-start gap-2 rounded-md px-3",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                          )
                        }
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </NavLink>
                    )}

                    {item.to === "tasks" && isInTasksSection && (
                      <div className="ml-5 flex flex-col gap-1 border-l pl-2">
                        {taskSubNavItems.map((subItem) => {
                          const SubIcon = subItem.icon;

                          return (
                            <NavLink
                              key={subItem.to}
                              to={subItem.to}
                              className={({ isActive }) =>
                                cn(
                                  buttonVariants({ variant: "ghost" }),
                                  "h-8 w-full justify-start gap-2 rounded-md px-2 text-xs",
                                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                                )
                              }
                            >
                              <SubIcon className="size-3.5" />
                              {subItem.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-auto border-t pt-3">
              <NavLink
                to="settings"
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-start gap-2 rounded-md px-3",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                  )
                }
              >
                <Settings className="size-4" />
                Settings
              </NavLink>
            </div>
          </CardContent>
      </Card>

      <div className="h-full min-h-0 p-0">
        <Card className="h-full min-h-0 rounded-xl border-border/70" size="sm">
          <CardContent className="h-full min-h-0">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
