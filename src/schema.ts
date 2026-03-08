import { co, z, setDefaultSchemaPermissions } from "jazz-tools";

setDefaultSchemaPermissions({
  onInlineCreate: "sameAsContainer",
});

export const Organization = co.map({
  id: z.number(),
  name: z.string(),
});

export const Project = co.map({
  id: z.number(),
  name: z.string(),
  orgId: z.number().optional(),
});

export const ProjectOverview = co.map({
  id: z.number(),
  projectId: z.number(),
  content: z.string(),
});

export const ProjectDocument = co.map({
  id: z.number(),
  projectId: z.number(),
  parentDocumentId: z.number(),
  name: z.string(),
  content: z.string(),
});

export const ProjectTaskBucket = co.map({
  id: z.number(),
  projectId: z.number(),
  name: z.string(),
  order: z.number(),
  type: z.string(),
});

export const ProjectTask = co.map({
  id: z.number(),
  projectId: z.number(),
  projectBucketId: z.number(),
  summary: z.string(),
  description: z.string(),
  status: z.string(),
  assignedTo: z.string(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
  completedBy: z.string().optional(),
  completedAt: z.date().optional(),
  deletedBy: z.string().optional(),
  deletedAt: z.date().optional(),
  order: z.number(),
  type: z.string(),
  isArchived: z.boolean(),
});

export const NextIds = co.map({
  organization: z.number(),
  project: z.number(),
  projectOverview: z.number(),
  projectDocument: z.number(),
  projectTaskBucket: z.number(),
  projectTask: z.number(),
});

export const AccountRoot = co.map({
  organizations: co.list(Organization),
  projects: co.list(Project),
  projectOverviews: co.list(ProjectOverview),
  projectDocuments: co.list(ProjectDocument),
  projectTaskBuckets: co.list(ProjectTaskBucket),
  projectTasks: co.list(ProjectTask),
  nextIds: NextIds,
  profileName: z.string().optional(),
});

export const Account = co
  .account({
    root: AccountRoot,
    profile: co.profile(),
  })
  .withMigration((account) => {
    if (!account.$jazz.has("root")) {
      account.$jazz.set("root", {
        organizations: [],
        projects: [],
        projectOverviews: [],
        projectDocuments: [],
        projectTaskBuckets: [],
        projectTasks: [],
        nextIds: NextIds.create({
          organization: 1,
          project: 1,
          projectOverview: 1,
          projectDocument: 1,
          projectTaskBucket: 1,
          projectTask: 1,
        }),
      });
    }
  });
