import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { co } from "jazz-tools";
import { useCoState } from "jazz-tools/react";

import { Document, Organization, Project } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { getProjectBasePath } from "@/lib/projectPaths";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const OrganizationProjectsPage = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId, {
    resolve: {
      projects: { $each: true },
    },
  });

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const projects = useMemo(() => {
    if (!organization.$isLoaded) return [];
    return [...organization.projects].sort((left, right) => left.name.localeCompare(right.name));
  }, [organization]);

  const createProject = ({ name }: { name: string }) => {
    if (!organization.$isLoaded) return;

    const project = Project.create({
      name,
      overview: co.richText().create(""),
      documents: [Document.create({ name: "Notes", content: co.richText().create(""), children: [] })],
      requirements: [],
      tests: [],
      test_results: [],
      people: [],
      task_buckets: [],
    });

    organization.projects.$jazz.push(project);
  };

  const renameProject = (projectId: string) => {
    if (!organization.$isLoaded) return;

    const project = organization.projects.find((candidate) => candidate.$jazz.id === projectId);
    if (!project) return;

    const nextName = window.prompt("Rename project", project.name)?.trim();
    if (!nextName || nextName === project.name) return;

    project.$jazz.set("name", nextName);
  };

  const deleteProject = (projectId: string) => {
    if (!organization.$isLoaded) return;

    const project = organization.projects.find((candidate) => candidate.$jazz.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(`Delete project \"${project.name}\"?`);
    if (!confirmed) return;

    organization.projects.$jazz.remove((candidate) => candidate.$jazz.id === projectId);
  };

  if (!orgId) return <div className="text-sm text-red-700">Invalid organization URL.</div>;
  if (!organization.$isLoaded) return <div className="text-sm text-muted-foreground">Loading organization projects...</div>;

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Projects</CardTitle>
          <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
            Create Project
          </Button>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet in this organization.</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => {
                const path = getProjectBasePath(project.$jazz.id, orgId);
                return (
                  <li key={project.$jazz.id} className="flex items-center justify-between rounded border bg-background px-3 py-2">
                    <Link className="text-sm font-medium hover:underline" to={`${path}/overview`}>
                      {project.name}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Actions for ${project.name}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => renameProject(project.$jazz.id)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => deleteProject(project.$jazz.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen} onSubmit={createProject} />
    </section>
  );
};
