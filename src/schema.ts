import { co, z, setDefaultSchemaPermissions, Group } from "jazz-tools";

setDefaultSchemaPermissions({
  onInlineCreate: "sameAsContainer",
});

export const Document = co.map({
  name: z.string(), 
  content: co.richText(),
  get children(): co.Optional<co.List<typeof Document>> { return co.optional(co.list(Document)) }
})

export const Requirement = co.map({
  name: z.string(),
  details: co.richText(),
  version: z.int(),
  status: z.enum(["Defined", "In Development", "In Testing", "Completed", "Archived"]),
  get children(): co.Optional<co.List<typeof Requirement>> { return co.optional(co.list(Requirement)) }
})

export const Test = co.map({
  name: z.string(),
  details: co.richText(),
  version: z.int(),
  is_folder: z.boolean(),
  get children(): co.Optional<co.List<typeof Requirement>> { return co.optional(co.list(Requirement)) }
})
export type Test = co.loaded<typeof Test>

export const TestResult = co.map({
  test: Test,
  status: z.enum(["Pass", "Fail", "Skipped"]),
  details: co.richText(),
  performed_on: z.date(),
  performed_by: z.string()
})

export const TestReport = co.map({
  status: z.enum(["Pass", "Fail", "Other"]),
  details: co.richText(),
  performed_on: z.date(),
  performed_by: z.string(),
  test_results: co.list(TestResult)
})

export const Person = co.map({
  name: z.string(),
  fields: z.object(),
  comment: co.richText()
})

export const Task = co.map({
  summary: z.string(),
  assigned_to: co.profile(),
  status: z.enum(["Backlog", "In Progress", "In-Review", "Completed", "Cancelled", "Archived"]),
  details: co.richText(),
  custom_fields: z.object(),
  order: z.int(),
  type: z.enum(["Bug", "Task"]),
  tags: z.array(z.string()) 
}).withMigration((task) => {
  if (!task.$jazz.has("tags")) { task.$jazz.set("tags", []) }
})

export const TaskBucket = co.map({
  name: z.string(),
  type: z.enum(["Backlog", "Active", "Custom"]),
  order: z.int(),
  tasks: co.list(Task)
})

export const Project = co.map({
  name: z.string(),
  overview: co.richText(),
  documents: co.list(Document),
  requirements: co.list(Requirement),
  tests: co.list(Test),
  test_results: co.list(TestReport),
  people: co.list(Person),
  task_buckets: co.list(TaskBucket)
})
export type Project = co.loaded<typeof Project>;

export const Organization = co.map({
  name: z.string(),
  projects: co.list(Project)
}).withMigration((organization) => {
  if (!organization.$jazz.has("projects")) { organization.$jazz.set("projects", co.list(Project).create([], Group.create()))}
})
export type Organization = co.loaded<typeof Organization>;

export const AccountRoot = co.map({
  organizations: co.list(Organization),
  projects: co.list(Project),
  people: co.list(Person),
  pinned_projects: co.list(Project)
});
export type AccountRoot = co.loaded<typeof AccountRoot>;

const defaultAccount = {
  organizations: [],
  people: [],
  projects: [],
  pinned_projects: []
}

export const Account = co
  .account({
    root: AccountRoot,
    profile: co.profile(),
  })
  .withMigration(async (account) => {
    if (!account.$jazz.has("root")) {
      account.$jazz.set("root", defaultAccount);
    }

    const { root } = await account.$jazz.ensureLoaded({
      resolve: { root: true },
    });

    if (!root.$jazz.has("pinned_projects")) {
      root.$jazz.set("pinned_projects", co.list(Project).create([], Group.create()),
      );
    }

  });
  
export type Account = co.loaded<typeof Account>;
export type LoadedAccount = co.loaded<typeof Account>;
export type LoadedAccountRoot = co.loaded<typeof AccountRoot>;
