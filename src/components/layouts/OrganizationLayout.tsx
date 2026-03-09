import { NavLink, Outlet, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const organizationNavItems = [
  { to: "overview", label: "Overview" },
  { to: "projects", label: "Projects" },
  { to: "people", label: "People" },
  { to: "docs", label: "Docs" },
] as const;

export const OrganizationLayout = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId);

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

        <CardContent>
          <nav aria-label="Organization navigation" className="flex flex-col gap-1">
            {organizationNavItems.map((item) => (
              <NavLink
                key={item.to}
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
            ))}
          </nav>
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
