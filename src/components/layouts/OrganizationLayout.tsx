import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";
import { Archive, CircleCheck, FileText, FolderKanban, House, LayoutList, Menu, Settings, User, X } from "lucide-react";

import { Organization } from "@/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
                  onClick={() => setIsMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-9 w-full justify-start gap-2 px-3",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              )}

              {item.to === "tasks" && isInTasksSection ? (
                <div className="ml-4 flex flex-col gap-1 border-l pl-2">
                  {taskSubNavItems.map((subItem) => {
                    const SubIcon = subItem.icon;

                    return (
                      <NavLink
                        key={subItem.to}
                        to={subItem.to}
                        onClick={() => setIsMobileNavOpen(false)}
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
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t pt-2">
        <NavLink
          to="settings"
          onClick={() => setIsMobileNavOpen(false)}
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-full justify-start gap-2 rounded-md px-3",
              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
            )
          }
        >
          <Settings className="size-4" />
          Settings
        </NavLink>
      </div>
    </>
  );

  return (
    <section className="relative grid h-full min-h-0 w-full grid-cols-1 gap-3 bg-muted/20 p-3 md:grid-cols-[260px_minmax(0,1fr)] md:gap-4 md:p-4">
      <div className="md:hidden">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-start gap-2"
          onClick={() => setIsMobileNavOpen(true)}
        >
          <Menu className="size-4" />
          Organization menu
        </Button>
      </div>

      {isMobileNavOpen ? (
        <div className="absolute inset-0 z-20 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close organization menu"
            onClick={() => setIsMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[85vw] max-w-[22rem] border-r border-border/70 bg-background p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Organization menu</p>
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
          <h2 className="whitespace-normal break-all text-base font-semibold leading-tight">{organizationTitle}</h2>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-col gap-2 px-3 py-3">
          {navigationContent}
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
