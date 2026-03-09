import { deleteCoValues } from "jazz-tools";

import {
  Document,
  Organization,
  Person,
  Project,
  Requirement,
  Task,
  TaskBucket,
  Test,
  TestReport,
  TestResult,
} from "@/schema";

const deleteByIds = async <T>(schema: T, ids: string[]) => {
  for (const id of ids) {
    await deleteCoValues(schema as never, id as never);
  }
};

const collectDocumentTreeIds = async (rootIds: string[]) => {
  const visited = new Set<string>();
  const stack = [...rootIds];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    const document = await Document.load(currentId, {
      resolve: { children: { $each: true } },
    });

    if (!document.$isLoaded || !document.children?.$isLoaded) continue;

    const children = Array.from(document.children);
    for (const child of children) {
      stack.push(child.$jazz.id);
    }
  }

  return [...visited];
};

const collectRequirementTreeIds = async (rootIds: string[]) => {
  const visited = new Set<string>();
  const stack = [...rootIds];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId)) continue;

    visited.add(currentId);

    const requirement = await Requirement.load(currentId, {
      resolve: { children: { $each: true } },
    });

    if (!requirement.$isLoaded || !requirement.children?.$isLoaded) continue;

    const children = Array.from(requirement.children);
    for (const child of children) {
      stack.push(child.$jazz.id);
    }
  }

  return [...visited];
};

export const cascadeDeleteProject = async (projectId: string) => {
  const project = await Project.load(projectId, {
    resolve: {
      documents: { $each: true },
      requirements: { $each: true },
      tests: {
        $each: {
          children: { $each: true },
        },
      },
      test_results: {
        $each: {
          test_results: { $each: true },
        },
      },
      people: { $each: true },
      task_buckets: {
        $each: {
          tasks: { $each: true },
        },
      },
    },
  });

  if (!project.$isLoaded) {
    throw new Error("Project could not be loaded for deletion.");
  }

  const taskBucketIds = project.task_buckets.map((bucket) => bucket.$jazz.id);
  const taskIds = project.task_buckets.flatMap((bucket) =>
    bucket.tasks.map((task) => task.$jazz.id),
  );

  const personIds = project.people.map((person) => person.$jazz.id);
  const testIds = project.tests.map((test) => test.$jazz.id);
  const reportIds = project.test_results.map((report) => report.$jazz.id);
  const resultIds = project.test_results.flatMap((report) =>
    report.test_results.map((result) => result.$jazz.id),
  );

  const documentRootIds = project.documents.map((document) => document.$jazz.id);
  const requirementRootIds = project.requirements.map(
    (requirement) => requirement.$jazz.id,
  );
  const requirementIdsFromTests = project.tests.flatMap((test) =>
    test.children?.$isLoaded ? test.children.map((child) => child.$jazz.id) : [],
  );

  const documentIds = await collectDocumentTreeIds(documentRootIds);
  const requirementIds = await collectRequirementTreeIds([
    ...requirementRootIds,
    ...requirementIdsFromTests,
  ]);

  await deleteByIds(TestResult, resultIds);
  await deleteByIds(TestReport, reportIds);
  await deleteByIds(Task, taskIds);
  await deleteByIds(TaskBucket, taskBucketIds);
  await deleteByIds(Person, personIds);
  await deleteByIds(Requirement, requirementIds);
  await deleteByIds(Test, testIds);
  await deleteByIds(Document, documentIds);
  await deleteCoValues(Project, projectId);
};

export const cascadeDeleteOrganization = async (organizationId: string) => {
  const organization = await Organization.load(organizationId, {
    resolve: {
      projects: { $each: true },
      documents: { $each: true },
      people: { $each: true },
      task_buckets: {
        $each: {
          tasks: { $each: true },
        },
      },
    },
  });

  if (!organization.$isLoaded) {
    throw new Error("Organization could not be loaded for deletion.");
  }

  const projectIds = organization.projects.map((project) => project.$jazz.id);

  for (const projectId of projectIds) {
    await cascadeDeleteProject(projectId);
  }

  const taskBucketIds = organization.task_buckets.map((bucket) => bucket.$jazz.id);
  const taskIds = organization.task_buckets.flatMap((bucket) =>
    bucket.tasks.map((task) => task.$jazz.id),
  );
  const personIds = organization.people.map((person) => person.$jazz.id);
  const documentRootIds = organization.documents.map((document) => document.$jazz.id);
  const documentIds = await collectDocumentTreeIds(documentRootIds);

  await deleteByIds(Task, taskIds);
  await deleteByIds(TaskBucket, taskBucketIds);
  await deleteByIds(Person, personIds);
  await deleteByIds(Document, documentIds);
  await deleteCoValues(Organization, organizationId);

  return { deletedProjectIds: projectIds };
};
