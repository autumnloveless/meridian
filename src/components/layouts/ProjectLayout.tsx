import { useEffect, useMemo, useRef, useState } from "react";
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
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Account, Organization, Project } from "@/schema";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const syncedRecentProjectIdRef = useRef<string | null>(null);

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
    if (syncedRecentProjectIdRef.current === projectId) return;

    const recentProjects = account.root.recent_projects;
    if (recentProjects[0]?.$jazz.id !== projectId) {
      recentProjects.$jazz.remove((item) => item.$jazz.id === projectId);
      recentProjects.$jazz.unshift(project);
      recentProjects.$jazz.retain((_, index) => index < 25);
    }

    syncedRecentProjectIdRef.current = projectId;
  }, [account.$isLoaded, project.$isLoaded, projectId]);

  const isInTasksSection = projectId
    ? location.pathname.startsWith(`${projectBasePath}/tasks`)
    : false;

  const isInDocsSection = projectId
    ? location.pathname.startsWith(`${projectBasePath}/docs`)
    : false;

  const visibleTaskSubNavItems = isMobileNavOpen
    ? taskSubNavItems.filter((item) => item.to !== "tasks/board")
    : taskSubNavItems;

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

  useEffect(() => {
    if (!isMobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  const navigationContent = (
    <>
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
                  onClick={() => setIsMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-9 w-full justify-start gap-2 rounded-md px-3",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              )}

              {item.to === "tasks" && isInTasksSection ? (
                <div className="ml-5 flex flex-col gap-1 border-l pl-2">
                  {visibleTaskSubNavItems.map((subItem) => {
                    const SubIcon = subItem.icon;

                    return (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        onClick={() => setIsMobileNavOpen(false)}
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
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-3">
        <NavLink
          to="settings"
          onClick={() => setIsMobileNavOpen(false)}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-full justify-start gap-2 rounded-md px-3",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground",
            )
          }
        >
          <Settings className="size-4" />
          Settings
        </NavLink>
      </div>
    </>
  );


  if (!orgId || !projectId) {
    return <div className="p-4 text-sm text-red-700">Invalid project URL.</div>;
  }

  return (
    <section className="grid h-full min-h-0 w-full grid-cols-1 gap-3 bg-muted/20 p-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-4 md:p-4">
      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start gap-2"
          onClick={() => setIsMobileNavOpen(true)}
        >
          <Menu className="size-4" />
          Project menu
        </Button>
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close project menu"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[85vw] max-w-[22rem] border-r border-border/70 bg-background p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Project menu</p>
              <Button type="button" variant="ghost" className="size-9 p-0" onClick={() => setIsMobileNavOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex h-[calc(100%-2.5rem)] min-h-0 flex-col gap-2 overflow-y-auto pr-1">{navigationContent}</div>
          </aside>
        </div>
      ) : null}

      <Card size="sm" className="hidden h-full min-h-0 rounded-xl border-border/70 !gap-0 md:flex">
        <CardHeader className="border-b">
          <h2 className="truncate text-base font-semibold leading-tight" title={projectTitle}>{projectTitle}</h2>
          <p className="mt-1 break-all text-xs text-muted-foreground">{organizationSubtitle ?? "Organization"}</p>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
          {navigationContent}
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
