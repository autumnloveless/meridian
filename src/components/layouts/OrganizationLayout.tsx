import { useMemo } from "react";
import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DocsNavSection } from "@/components/docs/DocsNavSection";
import { cn } from "@/lib/utils";
import { getOrganizationBasePath } from "@/lib/projectPaths";

const organizationNavItems = [
  { to: "overview", label: "Overview" },
  { to: "projects", label: "Projects" },
  { to: "people", label: "People" },
  { to: "docs", label: "Docs" },
] as const;

export const OrganizationLayout = () => {
  const { orgId } = useParams();
  const location = useLocation();

  const organization = useCoState(Organization, orgId, {
    resolve: {
      documents: {
        $each: true,
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
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle className="truncate text-lg">{organizationTitle}</CardTitle>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-2">
          <nav aria-label="Organization navigation" className="flex flex-col gap-1">
            {organizationNavItems.map((item) => (
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
                        "w-full justify-start",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          <div className="mt-auto border-t pt-2">
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
