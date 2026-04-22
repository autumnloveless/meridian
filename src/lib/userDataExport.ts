import { Account, Document, Organization, Project, Requirement, Test } from "@/schema";

type ExportContextRef = {
  legacyId: string;
  ownerGroupId: string | null;
};

type ExportProfileRef = {
  profileId: string | null;
  displayName: string | null;
};

type ExportDocumentNode = ExportContextRef & {
  name: string;
  content: string;
  children: ExportDocumentNode[];
};

type ExportRequirementNode = ExportContextRef & {
  name: string;
  sequenceNumber: number;
  details: string;
  version: number;
  status: string;
  children: ExportRequirementNode[];
};

type ExportTestNode = ExportContextRef & {
  name: string;
  sequenceNumber: number;
  details: string;
  version: number;
  isFolder: boolean;
  children: ExportTestNode[];
};

type ExportPerson = ExportContextRef & {
  name: string;
  fields: Record<string, unknown>;
  comment: string;
};

type ExportTask = ExportContextRef & {
  summary: string;
  assignee: ExportProfileRef;
  sequenceNumber: number;
  status: string;
  details: string;
  customFields: Record<string, unknown>;
  order: number;
  type: string;
  tags: string[];
};

type ExportTaskBucket = ExportContextRef & {
  name: string;
  type: string;
  order: number;
  tasks: ExportTask[];
};

type ExportTestResult = ExportContextRef & {
  testLegacyId: string | null;
  testName: string | null;
  status: string;
  details: string;
  performedOn: string | null;
  performedBy: string;
};

type ExportTestReport = ExportContextRef & {
  status: string;
  details: string;
  performedOn: string | null;
  performedBy: string;
  testResults: ExportTestResult[];
};

type ExportProject = ExportContextRef & {
  legacyOrganizationId: string;
  name: string;
  projectKey: string;
  nextTaskNumber: number;
  nextRequirementNumber: number;
  nextTestNumber: number;
  overview: string;
  linkedPeopleLegacyIds: string[];
  legacyPeople: ExportPerson[];
  documents: ExportDocumentNode[];
  requirements: ExportRequirementNode[];
  tests: ExportTestNode[];
  testReports: ExportTestReport[];
  taskBuckets: ExportTaskBucket[];
};

type ExportOrganization = ExportContextRef & {
  membership: "personal" | "shared";
  name: string;
  projectKey: string;
  nextTaskNumber: number;
  overview: string;
  documents: ExportDocumentNode[];
  people: ExportPerson[];
  taskBuckets: ExportTaskBucket[];
  projects: ExportProject[];
};

type ExportRootState = {
  personalOrganizationLegacyId: string | null;
  organizationLegacyIds: string[];
  pinnedOrganizationLegacyIds: string[];
  pinnedProjectLegacyIds: string[];
  recentProjectLegacyIds: string[];
  legacyStandaloneProjectIds: string[];
  legacyStandalonePersonIds: string[];
};

type ExportSummary = {
  organizations: number;
  projects: number;
  people: number;
  documents: number;
  requirements: number;
  tests: number;
  testReports: number;
  testResults: number;
  taskBuckets: number;
  tasks: number;
};

export type MeridianUserDataExport = {
  format: "meridian-jazz1-export";
  version: 1;
  exportedAt: string;
  source: {
    application: "Meridian";
    storage: "jazz-v1";
    encoding: "utf-8";
    compression: "none";
  };
  account: {
    accountId: string;
    profile: ExportProfileRef;
  };
  root: ExportRootState;
  summary: ExportSummary;
  organizations: ExportOrganization[];
};

export type MeridianUserDataExportFile = {
  fileName: string;
  contents: string;
  payload: MeridianUserDataExport;
};

function coId(value: any): string {
  return value?.$jazz?.id ?? "";
}

function ownerGroupId(value: any): string | null {
  return value?.$jazz?.owner?.$jazz?.id ?? null;
}

function richTextToString(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value.toString === "function") return value.toString();
  return String(value);
}

function dateToIsoString(value: any): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value?.toISOString === "function") return value.toISOString();
  return null;
}

function cloneJsonRecord(value: any): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function profileSnapshot(profile: any): ExportProfileRef {
  if (!profile) {
    return { profileId: null, displayName: null };
  }

  return {
    profileId: coId(profile) || null,
    displayName: profile?.$isLoaded ? profile.name || coId(profile) || null : coId(profile) || null,
  };
}

async function ensureDocumentNodeLoaded(document: any): Promise<any> {
  const loaded = await Document.load(coId(document), {
    resolve: {
      children: { $each: true },
    },
  }).catch(() => null);

  if (!loaded?.$isLoaded) return document;

  const children = loaded.children && loaded.children.$isLoaded ? [...loaded.children] : [];
  await Promise.all(children.map((child) => ensureDocumentNodeLoaded(child)));
  return loaded;
}

async function ensureRequirementNodeLoaded(requirement: any): Promise<any> {
  const loaded = await Requirement.load(coId(requirement), {
    resolve: {
      details: true,
      children: { $each: true },
    },
  }).catch(() => null);

  if (!loaded?.$isLoaded) return requirement;

  const children = loaded.children && loaded.children.$isLoaded ? [...loaded.children] : [];
  await Promise.all(children.map((child) => ensureRequirementNodeLoaded(child)));
  return loaded;
}

async function ensureTestNodeLoaded(test: any): Promise<any> {
  const loaded = await Test.load(coId(test), {
    resolve: {
      details: true,
      children: { $each: true },
    },
  }).catch(() => null);

  if (!loaded?.$isLoaded) return test;

  const children = loaded.children && loaded.children.$isLoaded ? [...loaded.children] : [];
  await Promise.all(children.map((child) => ensureTestNodeLoaded(child)));
  return loaded;
}

function snapshotDocumentNode(document: any): ExportDocumentNode {
  const children = document?.children && document.children.$isLoaded ? [...document.children] : [];

  return {
    legacyId: coId(document),
    ownerGroupId: ownerGroupId(document),
    name: document?.name ?? "",
    content: richTextToString(document?.content),
    children: children.map((child) => snapshotDocumentNode(child)),
  };
}

function snapshotRequirementNode(requirement: any): ExportRequirementNode {
  const children = requirement?.children && requirement.children.$isLoaded ? [...requirement.children] : [];

  return {
    legacyId: coId(requirement),
    ownerGroupId: ownerGroupId(requirement),
    name: requirement?.name ?? "",
    sequenceNumber: requirement?.sequence_number ?? 0,
    details: richTextToString(requirement?.details),
    version: requirement?.version ?? 0,
    status: requirement?.status ?? "",
    children: children.map((child) => snapshotRequirementNode(child)),
  };
}

function snapshotTestNode(test: any): ExportTestNode {
  const children = test?.children && test.children.$isLoaded ? [...test.children] : [];

  return {
    legacyId: coId(test),
    ownerGroupId: ownerGroupId(test),
    name: test?.name ?? "",
    sequenceNumber: test?.sequence_number ?? 0,
    details: richTextToString(test?.details),
    version: test?.version ?? 0,
    isFolder: Boolean(test?.is_folder),
    children: children.map((child) => snapshotTestNode(child)),
  };
}

function snapshotPerson(person: any): ExportPerson {
  return {
    legacyId: coId(person),
    ownerGroupId: ownerGroupId(person),
    name: person?.name ?? "",
    fields: cloneJsonRecord(person?.fields),
    comment: richTextToString(person?.comment),
  };
}

function snapshotTask(task: any): ExportTask {
  return {
    legacyId: coId(task),
    ownerGroupId: ownerGroupId(task),
    summary: task?.summary ?? "",
    assignee: profileSnapshot(task?.assigned_to),
    sequenceNumber: task?.sequence_number ?? 0,
    status: task?.status ?? "",
    details: richTextToString(task?.details),
    customFields: cloneJsonRecord(task?.custom_fields),
    order: task?.order ?? 0,
    type: task?.type ?? "",
    tags: Array.isArray(task?.tags) ? [...task.tags] : [],
  };
}

function snapshotTaskBucket(bucket: any): ExportTaskBucket {
  const tasks = bucket?.tasks && bucket.tasks.$isLoaded ? [...bucket.tasks] : [];

  return {
    legacyId: coId(bucket),
    ownerGroupId: ownerGroupId(bucket),
    name: bucket?.name ?? "",
    type: bucket?.type ?? "",
    order: bucket?.order ?? 0,
    tasks: tasks.map((task) => snapshotTask(task)),
  };
}

function snapshotTestResult(result: any): ExportTestResult {
  const loadedTest = result?.test && result.test.$isLoaded ? result.test : null;

  return {
    legacyId: coId(result),
    ownerGroupId: ownerGroupId(result),
    testLegacyId: loadedTest ? coId(loadedTest) : coId(result?.test) || null,
    testName: loadedTest?.name ?? null,
    status: result?.status ?? "",
    details: richTextToString(result?.details),
    performedOn: dateToIsoString(result?.performed_on),
    performedBy: result?.performed_by ?? "",
  };
}

function snapshotTestReport(report: any): ExportTestReport {
  const results = report?.test_results && report.test_results.$isLoaded ? [...report.test_results] : [];

  return {
    legacyId: coId(report),
    ownerGroupId: ownerGroupId(report),
    status: report?.status ?? "",
    details: richTextToString(report?.details),
    performedOn: dateToIsoString(report?.performed_on),
    performedBy: report?.performed_by ?? "",
    testResults: results.map((result) => snapshotTestResult(result)),
  };
}

async function loadProjectForExport(projectId: string): Promise<any> {
  const project = await Project.load(projectId, {
    resolve: {
      documents: { $each: true },
      requirements: { $each: { details: true } },
      tests: { $each: { details: true } },
      test_results: {
        $each: {
          details: true,
          test_results: {
            $each: {
              details: true,
              test: true,
            },
          },
        },
      },
      linked_people: { $each: { comment: true } },
      people: { $each: { comment: true } },
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
  }).catch(() => null);

  if (!project?.$isLoaded) {
    throw new Error(`Project ${projectId} could not be loaded for export.`);
  }

  await Promise.all((project.documents ?? []).map((document: any) => ensureDocumentNodeLoaded(document)));
  await Promise.all((project.requirements ?? []).map((requirement: any) => ensureRequirementNodeLoaded(requirement)));
  await Promise.all((project.tests ?? []).map((test: any) => ensureTestNodeLoaded(test)));

  return project;
}

async function loadOrganizationForExport(organizationId: string): Promise<any> {
  const organization = await Organization.load(organizationId, {
    resolve: {
      documents: { $each: true },
      people: { $each: { comment: true } },
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
      projects: true,
    },
  }).catch(() => null);

  if (!organization?.$isLoaded) {
    throw new Error(`Organization ${organizationId} could not be loaded for export.`);
  }

  await Promise.all((organization.documents ?? []).map((document: any) => ensureDocumentNodeLoaded(document)));

  return organization;
}

function summarizeExport(organizations: ExportOrganization[]): ExportSummary {
  const summary: ExportSummary = {
    organizations: organizations.length,
    projects: 0,
    people: 0,
    documents: 0,
    requirements: 0,
    tests: 0,
    testReports: 0,
    testResults: 0,
    taskBuckets: 0,
    tasks: 0,
  };

  const countDocumentNodes = (documents: ExportDocumentNode[]): number =>
    documents.reduce((total, document) => total + 1 + countDocumentNodes(document.children), 0);

  const countRequirementNodes = (requirements: ExportRequirementNode[]): number =>
    requirements.reduce((total, requirement) => total + 1 + countRequirementNodes(requirement.children), 0);

  const countTestNodes = (tests: ExportTestNode[]): number =>
    tests.reduce((total, test) => total + 1 + countTestNodes(test.children), 0);

  for (const organization of organizations) {
    summary.people += organization.people.length;
    summary.documents += countDocumentNodes(organization.documents);
    summary.taskBuckets += organization.taskBuckets.length;
    summary.tasks += organization.taskBuckets.reduce((total, bucket) => total + bucket.tasks.length, 0);

    for (const project of organization.projects) {
      summary.projects += 1;
      summary.people += project.legacyPeople.length;
      summary.documents += countDocumentNodes(project.documents);
      summary.requirements += countRequirementNodes(project.requirements);
      summary.tests += countTestNodes(project.tests);
      summary.testReports += project.testReports.length;
      summary.testResults += project.testReports.reduce((total, report) => total + report.testResults.length, 0);
      summary.taskBuckets += project.taskBuckets.length;
      summary.tasks += project.taskBuckets.reduce((total, bucket) => total + bucket.tasks.length, 0);
    }
  }

  return summary;
}

function exportFileName(exportedAt: string): string {
  const stamp = exportedAt.replace(/[:]/g, "-").replace(/\..+$/, "");
  return `meridian-jazz1-export-${stamp}.json`;
}

export async function createUserDataExportFile(account: any): Promise<MeridianUserDataExportFile> {
  const loadedAccount = await Account.load(coId(account), {
    resolve: {
      profile: true,
      root: {
        personal_organization: true,
        organizations: { $each: true },
        pinned_organizations: { $each: true },
        pinned_projects: { $each: true },
        recent_projects: { $each: true },
        projects: { $each: true },
        people: { $each: true },
      },
    },
  }).catch(() => null);

  if (!loadedAccount?.$isLoaded) {
    throw new Error("Your account could not be loaded for export.");
  }

  const exportedAt = new Date().toISOString();
  const root = loadedAccount.root;

  const organizationEntries: Array<{ organizationId: string; membership: "personal" | "shared" }> = [];
  if (root.personal_organization) {
    organizationEntries.push({
      organizationId: coId(root.personal_organization),
      membership: "personal",
    });
  }

  root.organizations.forEach((organization: any) => {
    organizationEntries.push({
      organizationId: coId(organization),
      membership: "shared",
    });
  });

  const organizations = await Promise.all(
    organizationEntries.map(async ({ organizationId, membership }) => {
      const organization = await loadOrganizationForExport(organizationId);
      const projects = await Promise.all(
        organization.projects.map(async (project: any) => {
          const loadedProject = await loadProjectForExport(coId(project));

          return {
            legacyId: coId(loadedProject),
            ownerGroupId: ownerGroupId(loadedProject),
            legacyOrganizationId: coId(organization),
            name: loadedProject.name,
            projectKey: loadedProject.project_key,
            nextTaskNumber: loadedProject.next_task_number,
            nextRequirementNumber: loadedProject.next_requirement_number,
            nextTestNumber: loadedProject.next_test_number,
            overview: richTextToString(loadedProject.overview),
            linkedPeopleLegacyIds: loadedProject.linked_people.map((person: any) => coId(person)),
            legacyPeople: loadedProject.people.map((person: any) => snapshotPerson(person)),
            documents: loadedProject.documents.map((document: any) => snapshotDocumentNode(document)),
            requirements: loadedProject.requirements.map((requirement: any) => snapshotRequirementNode(requirement)),
            tests: loadedProject.tests.map((test: any) => snapshotTestNode(test)),
            testReports: loadedProject.test_results.map((report: any) => snapshotTestReport(report)),
            taskBuckets: loadedProject.task_buckets.map((bucket: any) => snapshotTaskBucket(bucket)),
          } satisfies ExportProject;
        }),
      );

      return {
        legacyId: coId(organization),
        ownerGroupId: ownerGroupId(organization),
        membership,
        name: organization.name,
        projectKey: organization.project_key,
        nextTaskNumber: organization.next_task_number,
        overview: richTextToString(organization.overview),
        documents: organization.documents.map((document: any) => snapshotDocumentNode(document)),
        people: organization.people.map((person: any) => snapshotPerson(person)),
        taskBuckets: organization.task_buckets.map((bucket: any) => snapshotTaskBucket(bucket)),
        projects,
      } satisfies ExportOrganization;
    }),
  );

  const payload: MeridianUserDataExport = {
    format: "meridian-jazz1-export",
    version: 1,
    exportedAt,
    source: {
      application: "Meridian",
      storage: "jazz-v1",
      encoding: "utf-8",
      compression: "none",
    },
    account: {
      accountId: coId(loadedAccount),
      profile: profileSnapshot(loadedAccount.profile),
    },
    root: {
      personalOrganizationLegacyId: coId(root.personal_organization) || null,
      organizationLegacyIds: root.organizations.map((organization: any) => coId(organization)),
      pinnedOrganizationLegacyIds: root.pinned_organizations.map((organization: any) => coId(organization)),
      pinnedProjectLegacyIds: root.pinned_projects.map((project: any) => coId(project)),
      recentProjectLegacyIds: root.recent_projects.map((project: any) => coId(project)),
      legacyStandaloneProjectIds: root.projects.map((project: any) => coId(project)),
      legacyStandalonePersonIds: root.people.map((person: any) => coId(person)),
    },
    summary: summarizeExport(organizations),
    organizations,
  };

  const json = JSON.stringify(payload);

  return {
    fileName: exportFileName(exportedAt),
    contents: json,
    payload,
  };
}

export function downloadUserDataExport(file: MeridianUserDataExportFile): void {
  const blob = new Blob([file.contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}