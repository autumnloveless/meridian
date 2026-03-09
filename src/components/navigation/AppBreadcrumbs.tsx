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
import { Document, Organization, Project, Requirement, Task, Test, TestReport } from "@/schema";

type Crumb = {
  label: string;
  to: string;
  kind: string;
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

  return (
    <Breadcrumb className="w-full min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isMiddleCrumb = index > 0 && !isLast;

          return (
            <Fragment key={crumb.to}>
              <BreadcrumbItem className={isMiddleCrumb ? "hidden min-w-0 shrink sm:flex" : "min-w-0 shrink"}>
                {isLast ? (
                  <BreadcrumbPage>
                    <span className="min-w-0 shrink max-w-[min(30ch,55vw)] truncate">
                      {crumb.label}
                    </span>
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} className="inline-flex min-w-0 shrink max-w-[min(30ch,55vw)] truncate">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator
                  className={isMiddleCrumb ? "hidden text-muted-foreground/70 sm:flex" : "text-muted-foreground/70"}
                />
              ) : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};