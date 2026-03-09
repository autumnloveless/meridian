import { NavLink, Outlet, useLocation, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Project } from "@/schema";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const { projectId } = useParams();
  const location = useLocation();
  const project = useCoState(Project, projectId);

  const isInTasksSection = projectId
    ? location.pathname.startsWith(`/projects/${projectId}/tasks`)
    : false;

  const projectTitle = project.$isLoaded
    ? project.name
    : project.$jazz.loadingState === "unauthorized"
      ? "Project not accessible"
      : project.$jazz.loadingState === "unavailable"
        ? "Project not found"
        : project.$jazz.loadingState === "deleted"
          ? "Project deleted"
          : "Loading project...";

  return (
    <section className="grid min-h-[calc(100vh-4.5rem)] grid-cols-1 gap-4 p-4 md:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="border-b">
          <CardTitle className="truncate text-lg">{projectTitle}</CardTitle>
        </CardHeader>

        <CardContent className="flex h-full flex-col gap-2">
          <nav aria-label="Project navigation" className="flex flex-col gap-1">
            {projectNavItems.map((item) => (
              <div key={item.to} className="flex flex-col gap-1">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({ variant: "ghost" }),
                      "w-full justify-start",
                      isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                    )
                  }
                >
                  {item.label}
                </NavLink>

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
                            isActive ? "bg-muted text-foreground" : "text-muted-foreground"
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
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                )
              }
            >
              Settings
            </NavLink>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full min-h-0">
        <CardContent className="h-full min-h-0 p-4 md:p-6">
          <Outlet />
        </CardContent>
      </Card>
    </section>
  );
};