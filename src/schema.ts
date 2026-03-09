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
  overview: co.richText(),
  projects: co.list(Project),
  documents: co.list(Document),
  people: co.list(Person),
  task_buckets: co.list(TaskBucket),
}).withMigration((organization) => {
  if (!organization.$jazz.has("overview")) {
    organization.$jazz.set("overview", co.richText().create(""));
  }
  if (!organization.$jazz.has("projects")) {
    organization.$jazz.set("projects", co.list(Project).create([], Group.create()));
  }
  if (!organization.$jazz.has("documents")) {
    organization.$jazz.set("documents", co.list(Document).create([], Group.create()));
  }
  if (!organization.$jazz.has("people")) {
    organization.$jazz.set("people", co.list(Person).create([], Group.create()));
  }
  if (!organization.$jazz.has("task_buckets")) {
    organization.$jazz.set(
      "task_buckets",
      co.list(TaskBucket).create(
        [
          TaskBucket.create({ name: "Backlog", type: "Backlog", order: 1, tasks: [] }),
          TaskBucket.create({ name: "Active", type: "Active", order: 2, tasks: [] }),
        ],
        Group.create()
      )
    );
  }
})
export type Organization = co.loaded<typeof Organization>;

export const AccountRoot = co.map({
  personal_organization: co.optional(Organization),
  organizations: co.list(Organization),
  // Deprecated top-level standalone collections. Kept only for migration.
  projects: co.list(Project),
  people: co.list(Person),
  pinned_organizations: co.list(Organization),
  pinned_projects: co.list(Project),
  recent_projects: co.list(Project),
});
export type AccountRoot = co.loaded<typeof AccountRoot>;

const defaultAccount = {
  personal_organization: undefined,
  organizations: [],
  people: [],
  pinned_organizations: [],
  projects: [],
  pinned_projects: [],
  recent_projects: [],
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

    // Load root shallowly first, then backfill missing refs before any deep loads.
    const { root } = await account.$jazz.ensureLoaded({
      resolve: { root: true },
    });

    if (!root.$jazz.has("projects")) {
      root.$jazz.set("projects", co.list(Project).create([], Group.create()));
    }

    if (!root.$jazz.has("people")) {
      root.$jazz.set("people", co.list(Person).create([], Group.create()));
    }

    if (!root.$jazz.has("pinned_projects")) {
      root.$jazz.set("pinned_projects", co.list(Project).create([], Group.create()));
    }

    if (!root.$jazz.has("pinned_organizations")) {
      root.$jazz.set("pinned_organizations", co.list(Organization).create([], Group.create()));
    }

    if (!root.$jazz.has("recent_projects")) {
      root.$jazz.set("recent_projects", co.list(Project).create([], Group.create()));
    }

    if (!root.$jazz.has("organizations")) {
      root.$jazz.set("organizations", co.list(Organization).create([], Group.create()));
    }

    if (!root.$jazz.has("personal_organization")) {
      root.$jazz.set("personal_organization", undefined);
    }

    const loadedRoot = await account.$jazz.ensureLoaded({
      resolve: {
        root: {
          personal_organization: {
            projects: true,
            people: true,
          },
          organizations: {
            $each: {
              projects: true,
              people: true,
            },
          },
          projects: true,
          people: true,
        },
      },
    });
    const loaded = loadedRoot.root;

    let personalOrg = loaded.personal_organization;
    if (!personalOrg) {
      personalOrg = loaded.organizations.find((organization) => organization.name === "My Org") ?? loaded.organizations[0];
    }

    if (!personalOrg) {
      personalOrg = Organization.create({
        name: "My Org",
        overview: co.richText().create(""),
        projects: [],
        documents: [],
        people: [],
        task_buckets: [
          TaskBucket.create({ name: "Backlog", type: "Backlog", order: 1, tasks: [] }),
          TaskBucket.create({ name: "Active", type: "Active", order: 2, tasks: [] }),
        ],
      });
    }

    root.$jazz.set("personal_organization", personalOrg);
    loaded.organizations.$jazz.remove((organization) => organization.$jazz.id === personalOrg.$jazz.id);

    if (personalOrg && loaded.projects.length > 0) {
      const existingProjectIds = new Set(personalOrg.projects.map((project) => project.$jazz.id));
      for (const project of loaded.projects.values()) {
        if (!existingProjectIds.has(project.$jazz.id)) {
          personalOrg.projects.$jazz.push(project);
        }
      }
      loaded.projects.$jazz.retain(() => false);
    }

    if (personalOrg && loaded.people.length > 0) {
      const existingPeopleIds = new Set(personalOrg.people.map((person) => person.$jazz.id));
      for (const person of loaded.people.values()) {
        if (!existingPeopleIds.has(person.$jazz.id)) {
          personalOrg.people.$jazz.push(person);
        }
      }
      loaded.people.$jazz.retain(() => false);
    }

  });
  
export type Account = co.loaded<typeof Account>;
export type LoadedAccount = co.loaded<typeof Account>;
export type LoadedAccountRoot = co.loaded<typeof AccountRoot>;
