import { Link, useLocation, useParams } from "react-router";
import { Fragment, useMemo } from "react";
import { useCoState } from "jazz-tools/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Document, Organization, Project, Requirement, Task, Test, TestReport } from "@/schema";

type Crumb = {
  label: string;
  to: string;
  kind: string;
};

const semanticBadgeClasses: Record<string, string> = {
  home: "bg-slate-100 text-slate-800 border-slate-300",
  orgs: "bg-sky-100 text-sky-900 border-sky-300",
  projects: "bg-indigo-100 text-indigo-900 border-indigo-300",
  org: "bg-cyan-100 text-cyan-900 border-cyan-300",
  project: "bg-violet-100 text-violet-900 border-violet-300",
  overview: "bg-zinc-100 text-zinc-800 border-zinc-300",
  tasks: "bg-emerald-100 text-emerald-900 border-emerald-300",
  list: "bg-emerald-100 text-emerald-900 border-emerald-300",
  board: "bg-emerald-100 text-emerald-900 border-emerald-300",
  archive: "bg-emerald-100 text-emerald-900 border-emerald-300",
  people: "bg-teal-100 text-teal-900 border-teal-300",
  docs: "bg-amber-100 text-amber-900 border-amber-300",
  document: "bg-yellow-100 text-yellow-900 border-yellow-300",
  requirements: "bg-orange-100 text-orange-900 border-orange-300",
  requirement: "bg-orange-100 text-orange-900 border-orange-300",
  tests: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  test: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
  "test-results": "bg-pink-100 text-pink-900 border-pink-300",
  "test-result": "bg-pink-100 text-pink-900 border-pink-300",
  settings: "bg-neutral-100 text-neutral-900 border-neutral-300",
  tags: "bg-lime-100 text-lime-900 border-lime-300",
  task: "bg-emerald-100 text-emerald-900 border-emerald-300",
  default: "bg-muted text-foreground border-border",
};

const staticLabels: Record<string, string> = {
  overview: "Overview",
  organizations: "Orgs",
  projects: "Projects",
  tasks: "Tasks",
  list: "List",
  board: "Board",
  archive: "Archive",
  people: "People",
  docs: "Docs",
  requirements: "Requirements",
  tests: "Tests",
  "test-results": "Test Results",
  settings: "Settings",
  tags: "Tags",
};

export const AppBreadcrumbs = () => {
  const { pathname } = useLocation();
  const params = useParams();

  const organization = useCoState(Organization, params.orgId);
  const project = useCoState(Project, params.projectId);
  const document = useCoState(Document, params.docId);
  const task = useCoState(Task, params.taskId);
  const requirement = useCoState(Requirement, params.requirementId);
  const test = useCoState(Test, params.testId);
  const testResult = useCoState(TestReport, params.testResultId);

  const dynamicLabels = useMemo(() => {
    const byValue: Record<string, string> = {};

    if (params.orgId) {
      byValue[params.orgId] = organization.$isLoaded ? organization.name : "Organization";
    }
    if (params.projectId) {
      byValue[params.projectId] = project.$isLoaded ? project.name : "Project";
    }
    if (params.docId) {
      byValue[params.docId] = document.$isLoaded ? document.name : "Document";
    }
    if (params.taskId) {
      byValue[params.taskId] = task.$isLoaded ? task.summary : "Task";
    }
    if (params.requirementId) {
      byValue[params.requirementId] = requirement.$isLoaded ? requirement.name : "Requirement";
    }
    if (params.testId) {
      byValue[params.testId] = test.$isLoaded ? test.name : "Test";
    }
    if (params.testResultId) {
      byValue[params.testResultId] = testResult.$isLoaded ? testResult.performed_by : "Test Result";
    }

    return byValue;
  }, [
    params.docId,
    params.orgId,
    params.projectId,
    params.requirementId,
    params.taskId,
    params.testId,
    params.testResultId,
    document,
    organization,
    project,
    requirement,
    task,
    test,
    testResult,
  ]);

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    const built: Crumb[] = [{ label: "Home", to: "/overview", kind: "home" }];
    if (segments.length === 0) return built;

    let currentPath = "";

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      currentPath += `/${segment}`;

      // Normalize organizations label while keeping semantic routing segments.
      if (segment === "organizations") {
        built.push({ label: staticLabels.organizations, to: currentPath, kind: "orgs" });
        continue;
      }

      const label = dynamicLabels[segment] ?? staticLabels[segment] ?? segment;
      let kind = segment;
      if (segment === params.orgId) kind = "org";
      else if (segment === params.projectId) kind = "project";
      else if (segment === params.docId) kind = "document";
      else if (segment === params.taskId) kind = "task";
      else if (segment === params.requirementId) kind = "requirement";
      else if (segment === params.testId) kind = "test";
      else if (segment === params.testResultId) kind = "test-result";

      built.push({ label, to: currentPath, kind });
    }

    return built;
  }, [
    dynamicLabels,
    pathname,
    params.docId,
    params.orgId,
    params.projectId,
    params.requirementId,
    params.taskId,
    params.testId,
    params.testResultId,
  ]);

  if (crumbs.length === 0) return null;

  const getBadgeClass = (kind: string) => {
    return semanticBadgeClasses[kind] ?? semanticBadgeClasses.default;
  };

  return (
    <Breadcrumb className="w-full min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={crumb.to}>
              <BreadcrumbItem className="min-w-0 shrink">
                {isLast ? (
                  <BreadcrumbPage>
                    <Badge
                      variant="outline"
                      className={`min-w-0 shrink max-w-[min(30ch,55vw)] truncate font-semibold ${getBadgeClass(crumb.kind)}`}
                    >
                      {crumb.label}
                    </Badge>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} className="inline-flex min-w-0 shrink">
                      <Badge
                        variant="outline"
                        className={`min-w-0 shrink max-w-[min(30ch,55vw)] truncate ${getBadgeClass(crumb.kind)}`}
                      >
                        {crumb.label}
                      </Badge>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="text-muted-foreground/70" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};