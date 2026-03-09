import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Project } from "@/schema";

const flattenDocuments = (documents: any[]): any[] => {
  const flat: any[] = [];

  const visit = (doc: any) => {
    flat.push(doc);
    if (!doc.children) return;
    doc.children.forEach((child: any) => visit(child));
  };

  documents.forEach((doc) => visit(doc));
  return flat;
};

export const ProjectDocsPage = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();

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

  const firstDocumentId = useMemo(() => {
    if (!project.$isLoaded) return null;
    const sorted = flattenDocuments(project.documents).sort((a, b) => a.name.localeCompare(b.name));
    return sorted[0]?.$jazz.id ?? null;
  }, [project]);

  useEffect(() => {
    if (!project.$isLoaded || !firstDocumentId || !projectId) return;
    navigate(`/projects/${projectId}/docs/${firstDocumentId}`, { replace: true });
  }, [firstDocumentId, navigate, project, projectId]);

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading docs...</div>;
  }

  if (project.documents.length === 0) {
    return (
      <section className="space-y-3 border rounded-md p-6 bg-background">
        <h2 className="text-lg font-semibold">Project Docs</h2>
        <p className="text-sm text-muted-foreground">Create your first page from the Docs sidebar button.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2 border rounded-md p-6 bg-background">
      <h2 className="text-lg font-semibold">Project Docs</h2>
      <p className="text-sm text-muted-foreground">Choose a page from the sidebar to start editing.</p>
      {projectId && firstDocumentId && (
        <Link className="text-sm underline" to={`/projects/${projectId}/docs/${firstDocumentId}`}>
          Open first page
        </Link>
      )}
    </section>
  );
};
