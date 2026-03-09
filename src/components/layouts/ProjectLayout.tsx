import { useMemo } from "react";
import { FileText, Plus } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { co } from "jazz-tools";
import { useCoState } from "jazz-tools/react";

import { Document, Project } from "@/schema";
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
  const navigate = useNavigate();

  const project = useCoState(Project, projectId, {
    resolve: {
      documents: { $each: true },
    },
  });

  const isInTasksSection = projectId
    ? location.pathname.startsWith(`/projects/${projectId}/tasks`)
    : false;

  const isInDocsSection = projectId
    ? location.pathname.startsWith(`/projects/${projectId}/docs`)
    : false;

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

  const createPage = () => {
    if (!project.$isLoaded || !projectId) return;

    const newDocument = Document.create({
      name: "Untitled",
      content: co.richText().create(""),
      children: [],
    });

    if (activeDocId) {
      const parent = project.documents.find((doc) => doc.$jazz.id === activeDocId);
      if (parent) {
        if (!parent.children) parent.$jazz.set("children", []);
        parent.children?.$jazz.push(newDocument);
      } else {
        project.documents.$jazz.push(newDocument);
      }
    } else {
      project.documents.$jazz.push(newDocument);
    }

    navigate(`/projects/${projectId}/docs/${newDocument.$jazz.id}`);
  };

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
                <div className="flex items-center gap-1">
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

                  {item.to === "docs" && isInDocsSection && project.$isLoaded && (
                    <button
                      type="button"
                      aria-label="Create page"
                      onClick={createPage}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

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

                {item.to === "docs" && isInDocsSection && project.$isLoaded && (
                  <div className="ml-4 max-h-[45vh] overflow-auto border-l pl-2">
                    {project.documents.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-muted-foreground">No pages yet.</p>
                    ) : (
                      <ul className="space-y-1 py-1">
                        {project.documents.map((document) => (
                          <DocsTreeItem
                            key={document.$jazz.id}
                            projectId={projectId ?? ""}
                            docId={document.$jazz.id}
                            activeDocId={activeDocId}
                          />
                        ))}
                      </ul>
                    )}
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

      <Card className="h-full min-h-0">
        <CardContent className="h-full min-h-0">
          <Outlet />
        </CardContent>
      </Card>
    </section>
  );
};

const DocsTreeItem = ({
  projectId,
  docId,
  activeDocId,
}: {
  projectId: string;
  docId: string;
  activeDocId: string | null;
}) => {
  const document = useCoState(Document, docId, {
    resolve: {
      children: {
        $each: true,
      },
    },
  });

  if (!document.$isLoaded) return null;

  const isActive = activeDocId === docId;
  const children = document.children ?? [];

  return (
    <li className="space-y-1">
      <NavLink
        to={`/projects/${projectId}/docs/${docId}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1 text-xs",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{document.name}</span>
      </NavLink>

      {children.length > 0 && (
        <ul className="ml-3 border-l pl-2">
          {children.map((child) => (
            <DocsTreeItem key={child.$jazz.id} projectId={projectId} docId={child.$jazz.id} activeDocId={activeDocId} />
          ))}
        </ul>
      )}
    </li>
  );
};
