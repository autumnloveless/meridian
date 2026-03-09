import { useMemo } from "react";
import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Project } from "@/schema";
import { DocsIndexPage } from "@/components/docs/DocsIndexPage";
import { getProjectBasePath } from "@/lib/projectPaths";

export const ProjectDocsPage = () => {
  const { projectId, orgId } = useParams();

  const projectBasePath = useMemo(() => {
    if (!projectId || !orgId) return "";
    return getProjectBasePath(projectId, orgId);
  }, [orgId, projectId]);

  const project = useCoState(Project, projectId, {
    resolve: {
      documents: {
        $each: {
          children: {
            $each: true,
          },
        },
      },
    },
  });

  if (!orgId || !projectId) {
    return <div className="text-sm text-red-700">Invalid project URL.</div>;
  }

  return (
    <DocsIndexPage
      title="Project Docs"
      documents={project.$isLoaded ? project.documents : []}
      isLoaded={project.$isLoaded}
      basePath={projectBasePath}
      loadingMessage="Loading docs..."
      emptyMessage="Create your first page from the Docs sidebar button."
    />
  );
};
