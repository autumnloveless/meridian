import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { Group } from "jazz-tools";
import { useAccount, useCoState, useIsAuthenticated } from "jazz-tools/react";

import { Account, Organization, Project } from "@/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/dialogs/CreateProjectDialog";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { getProjectBasePath } from "@/lib/projectPaths";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { defaultProjectKeyFromName } from "@/lib/taskIds";

export const OrganizationProjectsPage = () => {
  const { orgId } = useParams();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(Account);
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
  const [isMigrationConfirmOpen, setIsMigrationConfirmOpen] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<{ title: string; description: string } | null>(null);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<{ id: string; name: string } | null>(null);

  const projects = useMemo(() => {
    if (!organization.$isLoaded) return [];
    return [...organization.projects].sort((left, right) => left.name.localeCompare(right.name));
  }, [organization]);

  const organizationOwner = organization.$isLoaded ? organization.$jazz.owner : null;

  const createProjectOwnerGroup = () => {
    if (!organizationOwner) return null;
    const projectOwner = Group.create();
    projectOwner.addMember(organizationOwner);
    return projectOwner;
  };

  const projectInheritsFromOrganization = (project: typeof projects[number]) => {
    if (!organizationOwner) return false;
    const orgOwnerId = organizationOwner.$jazz.id;
    if (project.$jazz.owner.$jazz.id === orgOwnerId) return false;
    return project.$jazz.owner.getParentGroups().some((group) => group.$jazz.id === orgOwnerId);
  };

  const canManageOrganization = useMemo(() => {
    if (!isAuthenticated || !account.$isLoaded || !organization.$isLoaded) return false;
    return account.canManage(organization);
  }, [isAuthenticated, account, organization]);

  const createProject = ({ name }: { name: string }) => {
    if (!organization.$isLoaded) return;

    const projectOwner = createProjectOwnerGroup();
    if (!projectOwner) return;

    const project = Project.create(
      {
        name,
        project_key: defaultProjectKeyFromName(name, "PRJ"),
        next_task_number: 1,
        overview: "",
        documents: [
          { name: "Meeting Notes", content: "", children: [] },
          { name: "Design Docs", content: "", children: [] },
          { name: "Technical Docs", content: "", children: [] },
        ],
        requirements: [],
        tests: [],
        test_results: [],
        linked_people: [],
        people: [],
        task_buckets: [],
      },
      { owner: projectOwner }
    );

    organization.projects.$jazz.push(project);
  };

  const copyDocumentTree = (document: any): any => {
    const children = document?.children && document.children.$isLoaded ? [...document.children] : [];
    return {
      name: document.name,
      content: document.content.toString(),
      children: children.map((child: any) => copyDocumentTree(child)),
    };
  };

  const copyRequirementTree = (requirement: any): any => {
    const children = requirement?.children && requirement.children.$isLoaded ? [...requirement.children] : [];
    return {
      name: requirement.name,
      details: requirement.details.toString(),
      version: requirement.version,
      status: requirement.status,
      children: children.map((child: any) => copyRequirementTree(child)),
    };
  };

  const copyTestTree = (test: any): any => {
    const children = test?.children && test.children.$isLoaded ? [...test.children] : [];
    return {
      name: test.name,
      details: test.details.toString(),
      version: test.version,
      is_folder: test.is_folder,
      // Existing schema currently types Test.children as Requirement children.
      children: children.map((child: any) => copyRequirementTree(child)),
    };
  };

  const copyTask = (task: any): any => {
    const fallbackAssignee = me;
    const assigned = task.assigned_to?.$isLoaded ? task.assigned_to : fallbackAssignee;
    if (!assigned) {
      throw new Error("Cannot migrate task assignee without a loaded profile.");
    }

    return {
      summary: task.summary,
      assigned_to: assigned,
      sequence_number: task.sequence_number,
      status: task.status,
      details: task.details.toString(),
      custom_fields: task.custom_fields,
      order: task.order,
      type: task.type,
      tags: [...task.tags],
    };
  };

  const copyTaskBucket = (bucket: any): any => {
    const tasks = bucket?.tasks && bucket.tasks.$isLoaded ? [...bucket.tasks] : [];
    return {
      name: bucket.name,
      type: bucket.type,
      order: bucket.order,
      tasks: tasks.map((task: any) => copyTask(task)),
    };
  };

  const copyTestResult = (result: any): any => {
    if (!result.test || !result.test.$isLoaded) return null;
    const copiedTest = copyTestTree(result.test);
    return {
      test: copiedTest,
      status: result.status,
      details: result.details.toString(),
      performed_on: result.performed_on,
      performed_by: result.performed_by,
    };
  };

  const copyTestReport = (report: any): any => {
    const results = report?.test_results && report.test_results.$isLoaded ? [...report.test_results] : [];
    return {
      status: report.status,
      details: report.details.toString(),
      performed_on: report.performed_on,
      performed_by: report.performed_by,
      test_results: results.map((result: any) => copyTestResult(result)).filter(Boolean),
    };
  };

  const migrateProjectOwnersToOrganization = async () => {
    if (!organization.$isLoaded) return;
    if (!canManageOrganization) {
      setMigrationNotice({
        title: "Insufficient permissions",
        description: "You need manager or admin access on this organization to run ownership migration.",
      });
      return;
    }

    if (!me) {
      setMigrationNotice({
        title: "Profile still loading",
        description: "Please wait for your profile to load before running ownership migration.",
      });
      return;
    }

    setIsMigratingOwners(true);
    try {
      const mismatched = organization.projects.filter((project) => !projectInheritsFromOrganization(project));

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
            linked_people: {
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

        const replacementOwner = createProjectOwnerGroup();
        if (!replacementOwner) continue;
        const replacement = Project.create(
          {
            name: source.name,
            project_key: source.project_key,
            next_task_number: source.next_task_number,
            overview: source.overview.toString(),
            documents: source.documents.map((document) => copyDocumentTree(document)),
            requirements: source.requirements.map((requirement) => copyRequirementTree(requirement)),
            tests: source.tests.map((test) => copyTestTree(test)),
            test_results: source.test_results.map((report) => copyTestReport(report)),
            linked_people: source.linked_people.map((person) => person),
            people: source.people.map((person) => ({
              name: person.name,
              fields: person.fields,
              comment: person.comment.toString(),
            })),
            task_buckets: source.task_buckets.map((bucket) => copyTaskBucket(bucket)),
          },
          { owner: replacementOwner }
        );

        const insertAt = organization.projects.findIndex((candidate) => candidate.$jazz.id === source.$jazz.id);
        organization.projects.$jazz.remove((candidate) => candidate.$jazz.id === source.$jazz.id);

        if (insertAt >= 0 && insertAt <= organization.projects.length) {
          organization.projects.$jazz.splice(insertAt, 0, replacement);
        } else {
          organization.projects.$jazz.push(replacement);
        }
      }

      setMigrationNotice({
        title: "Migration complete",
        description: "Project ownership migration finished successfully.",
      });
    } finally {
      setIsMigratingOwners(false);
      setIsMigrationConfirmOpen(false);
    }
  };

  const requestProjectOwnerMigration = () => {
    if (!organization.$isLoaded) return;
    if (!canManageOrganization) return;

    const mismatched = organization.projects.filter((project) => !projectInheritsFromOrganization(project));
    if (mismatched.length === 0) {
      setMigrationNotice({
        title: "Already up to date",
        description: "All projects already use the inherited-owner model.",
      });
      return;
    }

    setIsMigrationConfirmOpen(true);
  };

  const renameProject = (projectId: string) => {
    if (!organization.$isLoaded) return;

    const project = organization.projects.find((candidate) => candidate.$jazz.id === projectId);
    if (!project) return;

    const nextName = window.prompt("Rename project", project.name)?.trim();
    if (!nextName || nextName === project.name) return;

    project.$jazz.set("name", nextName);
  };

  const requestDeleteProject = (projectId: string) => {
    if (!organization.$isLoaded) return;

    const project = organization.projects.find((candidate) => candidate.$jazz.id === projectId);
    if (!project) return;

    setPendingDeleteProject({ id: projectId, name: project.name });
  };

  const confirmDeleteProject = () => {
    if (!organization.$isLoaded || !pendingDeleteProject) return;

    organization.projects.$jazz.remove((candidate) => candidate.$jazz.id === pendingDeleteProject.id);
    setPendingDeleteProject(null);
  };

  if (!orgId) return <div className="text-sm text-red-700">Invalid organization URL.</div>;
  if (!organization.$isLoaded) return <div className="text-sm text-muted-foreground">Loading organization projects...</div>;

  const mismatchedOwnerCount = projects.filter((project) => !projectInheritsFromOrganization(project)).length;
  const ownershipFixLabel = `Fix Ownership (${mismatchedOwnerCount})`;

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Projects</CardTitle>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {mismatchedOwnerCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={requestProjectOwnerMigration}
                disabled={isMigratingOwners || !canManageOrganization}
                title={!canManageOrganization ? "Requires organization manager/admin access" : undefined}
                className="w-full sm:w-auto"
              >
                {isMigratingOwners ? "Migrating..." : ownershipFixLabel}
              </Button>
            ) : null}
            <Button type="button" onClick={() => setIsCreateProjectOpen(true)} className="w-full sm:w-auto">
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
                  <li key={project.$jazz.id} className="flex items-center justify-between gap-2 rounded border bg-background px-3 py-2">
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
                          onSelect={() => requestDeleteProject(project.$jazz.id)}
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

      <ConfirmDialog
        open={isMigrationConfirmOpen}
        onOpenChange={setIsMigrationConfirmOpen}
        title="Migrate project ownership"
        description={`Migrate ${mismatchedOwnerCount} project${mismatchedOwnerCount === 1 ? "" : "s"} to the organization owner group? This performs a copy and swap to preserve data.`}
        confirmText={isMigratingOwners ? "Migrating..." : "Run migration"}
        onConfirm={() => void migrateProjectOwnersToOrganization()}
        isConfirmDisabled={isMigratingOwners}
      />

      <ConfirmDialog
        open={!!pendingDeleteProject}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteProject(null);
        }}
        title="Delete project"
        description={pendingDeleteProject ? `Delete project \"${pendingDeleteProject.name}\"?` : undefined}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeleteProject}
      />

      <ConfirmDialog
        open={!!migrationNotice}
        onOpenChange={(open) => {
          if (!open) setMigrationNotice(null);
        }}
        title={migrationNotice?.title ?? "Notice"}
        description={migrationNotice?.description}
        confirmText="OK"
        showCancel={false}
        onConfirm={() => setMigrationNotice(null)}
      />
    </section>
  );
};
