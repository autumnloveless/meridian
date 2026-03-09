import { useMemo } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";
import { Archive, CircleCheck, FileText, FolderKanban, House, LayoutList, Settings, User } from "lucide-react";

import { Organization } from "@/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DocsNavSection } from "@/components/docs/DocsNavSection";
import { cn } from "@/lib/utils";
import { getOrganizationBasePath } from "@/lib/projectPaths";

const organizationNavItems = [
  { to: "overview", label: "Overview", icon: House },
  { to: "projects", label: "Projects", icon: FolderKanban },
  { to: "tasks", label: "Tasks", icon: CircleCheck },
  { to: "people", label: "People", icon: User },
  { to: "docs", label: "Docs", icon: FileText },
] as const;

const taskSubNavItems = [
  { to: "tasks/list", label: "List", icon: LayoutList },
  { to: "tasks/board", label: "Board", icon: CircleCheck },
  { to: "tasks/archive", label: "Archive", icon: Archive },
] as const;

export const OrganizationLayout = () => {
  const { orgId } = useParams();
  const location = useLocation();

  const organization = useCoState(Organization, orgId, {
    resolve: {
      documents: {
        $each: { $onError: "catch" },
      },
    },
  });

  const organizationBasePath = useMemo(() => {
    if (!orgId) return "";
    return getOrganizationBasePath(orgId);
  }, [orgId]);

  const isInDocsSection = orgId
    ? location.pathname.startsWith(`${organizationBasePath}/docs`)
    : false;
  const isInTasksSection = orgId
    ? location.pathname.startsWith(`${organizationBasePath}/tasks`)
    : false;

  const activeDocId = useMemo(() => {
    const match = location.pathname.match(/\/docs\/(.+)$/);
    return match?.[1] ?? null;
  }, [location.pathname]);

  const organizationTitle = organization.$isLoaded
    ? organization.name
    : organization.$jazz.loadingState === "unauthorized"
      ? "Organization not accessible"
      : organization.$jazz.loadingState === "unavailable"
        ? "Organization not found"
        : "Loading organization...";

  return (
    <section className="grid h-full min-h-0 w-full grid-cols-1 gap-4 bg-muted/20 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <Card size="sm" className="h-full min-h-0 rounded-xl border-border/70 !gap-0">
        <CardHeader className="border-b">
          <h2 className="whitespace-normal break-all text-base font-semibold leading-tight">{organizationTitle}</h2>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
            <nav aria-label="Organization navigation" className="flex flex-col gap-1">
              {organizationNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.to} className="flex flex-col gap-1">
                    {item.to === "docs" && organization.$isLoaded ? (
                      <DocsNavSection
                        to="docs"
                        label="Docs"
                        isActive={isInDocsSection}
                        basePath={organizationBasePath}
                        documents={organization.documents}
                        activeDocId={activeDocId}
                      />
                    ) : (
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            buttonVariants({ variant: "ghost" }),
                            "w-full justify-start gap-2 px-3",
                            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                          )
                        }
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </NavLink>
                    )}

                    {item.to === "tasks" && isInTasksSection && (
                      <div className="ml-4 flex flex-col gap-1 border-l pl-2">
                        {taskSubNavItems.map((subItem) => {
                          const SubIcon = subItem.icon;

                          return (
                            <NavLink
                              key={subItem.to}
                              to={subItem.to}
                              className={({ isActive }) =>
                                cn(
                                  buttonVariants({ variant: "ghost" }),
                                  "h-8 w-full justify-start gap-2 px-2 text-xs",
                                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
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

            <div className="mt-auto border-t pt-2">
              <NavLink
                to="settings"
                className={({ isActive }) =>
                  cn(
                    buttonVariants({ variant: "ghost" }),
                    "w-full justify-start gap-2 rounded-md px-3",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
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
        <Card className="h-full min-h-0" size="sm">
          <CardContent className="h-full min-h-0">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
