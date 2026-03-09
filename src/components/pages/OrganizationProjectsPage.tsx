import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { co } from "jazz-tools";
import { useAccount, useCoState } from "jazz-tools/react";

import { Account, Document, Organization, Person, Project, Requirement, Task, TaskBucket, Test, TestReport, TestResult } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { getProjectBasePath } from "@/lib/projectPaths";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const OrganizationProjectsPage = () => {
  const { orgId } = useParams();
  const me = useAccount(Account, {
    resolve: { profile: true },
    select: (account) => (account.$isLoaded ? account.profile : null),
  });
  const organization = useCoState(Organization, orgId, {
    resolve: {
      projects: { $each: true },
    },
  });

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isMigratingOwners, setIsMigratingOwners] = useState(false);

  const projects = useMemo(() => {
    if (!organization.$isLoaded) return [];
    return [...organization.projects].sort((left, right) => left.name.localeCompare(right.name));
  }, [organization]);

  const createProject = ({ name }: { name: string }) => {
    if (!organization.$isLoaded) return;

    const project = Project.create(
      {
        name,
        overview: co.richText().create(""),
        documents: [
          Document.create({ name: "Meeting Notes", content: co.richText().create(""), children: [] }),
          Document.create({ name: "Design Docs", content: co.richText().create(""), children: [] }),
          Document.create({ name: "Technical Docs", content: co.richText().create(""), children: [] }),
        ],
        requirements: [],
        tests: [],
        test_results: [],
        people: [],
        task_buckets: [],
      },
      { owner: organization.$jazz.owner }
    );

    organization.projects.$jazz.push(project);
  };

  const copyDocumentTree = (document: any): any => {
    const children = document?.children && document.children.$isLoaded ? [...document.children] : [];
    return Document.create({
      name: document.name,
      content: co.richText().create(document.content.toString()),
      children: children.map((child: any) => copyDocumentTree(child)),
    });
  };

  const copyRequirementTree = (requirement: any): any => {
    const children = requirement?.children && requirement.children.$isLoaded ? [...requirement.children] : [];
    return Requirement.create({
      name: requirement.name,
      details: co.richText().create(requirement.details.toString()),
      version: requirement.version,
      status: requirement.status,
      children: children.map((child: any) => copyRequirementTree(child)),
    });
  };

  const copyTestTree = (test: any): any => {
    const children = test?.children && test.children.$isLoaded ? [...test.children] : [];
    return Test.create({
      name: test.name,
      details: co.richText().create(test.details.toString()),
      version: test.version,
      is_folder: test.is_folder,
      // Existing schema currently types Test.children as Requirement children.
      children: children.map((child: any) => copyRequirementTree(child)),
    });
  };

  const copyTask = (task: any): any => {
    return Task.create({
      summary: task.summary,
      assigned_to: task.assigned_to?.$isLoaded ? task.assigned_to : me!,
      status: task.status,
      details: co.richText().create(task.details.toString()),
      custom_fields: task.custom_fields,
      order: task.order,
      type: task.type,
      tags: [...task.tags],
    });
  };

  const copyTaskBucket = (bucket: any): any => {
    const tasks = bucket?.tasks && bucket.tasks.$isLoaded ? [...bucket.tasks] : [];
    return TaskBucket.create({
      name: bucket.name,
      type: bucket.type,
      order: bucket.order,
      tasks: tasks.map((task: any) => copyTask(task)),
    });
  };

  const copyTestResult = (result: any): any => {
    if (!result.test || !result.test.$isLoaded) return null;
    const copiedTest = copyTestTree(result.test);
    return TestResult.create({
      test: copiedTest,
      status: result.status,
      details: co.richText().create(result.details.toString()),
      performed_on: result.performed_on,
      performed_by: result.performed_by,
    });
  };

  const copyTestReport = (report: any): any => {
    const results = report?.test_results && report.test_results.$isLoaded ? [...report.test_results] : [];
    return TestReport.create({
      status: report.status,
      details: co.richText().create(report.details.toString()),
      performed_on: report.performed_on,
      performed_by: report.performed_by,
      test_results: results.map((result: any) => copyTestResult(result)).filter(Boolean),
    });
  };

  const migrateProjectOwnersToOrganization = async () => {
    if (!organization.$isLoaded) return;
    if (!me) {
      window.alert("Please wait for your profile to load before running ownership migration.");
      return;
    }

    const orgOwnerId = organization.$jazz.owner.$jazz.id;
    const mismatched = organization.projects.filter((project) => project.$jazz.owner.$jazz.id !== orgOwnerId);
    if (mismatched.length === 0) return;

    const confirmed = window.confirm(
      `Migrate ${mismatched.length} project${mismatched.length === 1 ? "" : "s"} to the organization owner group? This performs a copy and swap to preserve data.`
    );
    if (!confirmed) return;

    setIsMigratingOwners(true);
    try {
      for (const projectRef of mismatched) {
        const source = await Project.load(projectRef.$jazz.id, {
          resolve: {
            documents: {
              $each: {
                children: {
                  $each: true,
                },
              },
            },
            requirements: {
              $each: {
                children: {
                  $each: true,
                },
              },
            },
            tests: {
              $each: {
                children: {
                  $each: true,
                },
              },
            },
            test_results: {
              $each: {
                test_results: {
                  $each: {
                    test: {
                      children: {
                        $each: true,
                      },
                    },
                  },
                },
              },
            },
            people: {
              $each: true,
            },
            task_buckets: {
              $each: {
                tasks: {
                  $each: {
                    assigned_to: true,
                    details: true,
                  },
                },
              },
            },
          },
        });

        if (!source.$isLoaded) continue;

        const replacement = Project.create(
          {
            name: source.name,
            overview: co.richText().create(source.overview.toString()),
            documents: source.documents.map((document) => copyDocumentTree(document)),
            requirements: source.requirements.map((requirement) => copyRequirementTree(requirement)),
            tests: source.tests.map((test) => copyTestTree(test)),
            test_results: source.test_results.map((report) => copyTestReport(report)),
            people: source.people.map((person) =>
              Person.create({
                name: person.name,
                fields: person.fields,
                comment: co.richText().create(person.comment.toString()),
              })
            ),
            task_buckets: source.task_buckets.map((bucket) => copyTaskBucket(bucket)),
          },
          { owner: organization.$jazz.owner }
        );

        const insertAt = organization.projects.findIndex((candidate) => candidate.$jazz.id === source.$jazz.id);
        organization.projects.$jazz.remove((candidate) => candidate.$jazz.id === source.$jazz.id);

        if (insertAt >= 0 && insertAt <= organization.projects.length) {
          organization.projects.$jazz.splice(insertAt, 0, replacement);
        } else {
          organization.projects.$jazz.push(replacement);
        }
      }

      window.alert("Project ownership migration complete.");
    } finally {
      setIsMigratingOwners(false);
    }
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

  const orgOwnerId = organization.$jazz.owner.$jazz.id;
  const mismatchedOwnerCount = projects.filter((project) => project.$jazz.owner.$jazz.id !== orgOwnerId).length;

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Projects</CardTitle>
          <div className="flex items-center gap-2">
            {mismatchedOwnerCount > 0 && (
              <Button type="button" variant="outline" onClick={() => void migrateProjectOwnersToOrganization()} disabled={isMigratingOwners}>
                {isMigratingOwners ? "Migrating..." : `Fix Ownership (${mismatchedOwnerCount})`}
              </Button>
            )}
            <Button type="button" onClick={() => setIsCreateProjectOpen(true)}>
              Create Project
            </Button>
          </div>
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
