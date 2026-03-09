import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Document, Organization, Project } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { getProjectBasePath } from "@/lib/projectPaths";

export const OrganizationProjectsPage = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId, {
    resolve: {
      projects: { $each: true },
    },
  });
  const account = useAccount(Account, {
    resolve: {
      root: {
        pinned_projects: { $each: true },
      },
    },
  });

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const pinnedProjectIds = useMemo(() => {
    if (!account.$isLoaded) return new Set<string>();
    return new Set(account.root.pinned_projects.map((project) => project.$jazz.id));
  }, [account]);

  const projects = useMemo(() => {
    if (!organization.$isLoaded) return [];
    const all = [...organization.projects];
    return all.sort((left, right) => {
      const leftPinned = pinnedProjectIds.has(left.$jazz.id);
      const rightPinned = pinnedProjectIds.has(right.$jazz.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      return left.name.localeCompare(right.name);
    });
  }, [organization, pinnedProjectIds]);

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

  const togglePinned = (project: Project) => {
    if (!account.$isLoaded) return;
    const isPinned = account.root.pinned_projects.some((pinned) => pinned.$jazz.id === project.$jazz.id);

    if (isPinned) {
      account.root.pinned_projects.$jazz.remove((pinned) => pinned.$jazz.id === project.$jazz.id);
      return;
    }

    account.root.pinned_projects.$jazz.push(project);
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
                const isPinned = pinnedProjectIds.has(project.$jazz.id);
                return (
                  <li key={project.$jazz.id} className="flex items-center justify-between rounded border bg-background px-3 py-2">
                    <Link className="text-sm font-medium hover:underline" to={`${path}/overview`}>
                      {project.name}
                    </Link>
                    <Button type="button" variant={isPinned ? "secondary" : "outline"} size="sm" onClick={() => togglePinned(project)}>
                      {isPinned ? "Pinned" : "Pin"}
                    </Button>
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
