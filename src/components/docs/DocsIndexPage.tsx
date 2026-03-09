import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";

import { flattenDocuments } from "@/components/docs/docsUtils";

export const DocsIndexPage = ({
  title,
  documents,
  isLoaded,
  basePath,
  loadingMessage,
  emptyMessage,
}: {
  title: string;
  documents: ReadonlyArray<any>;
  isLoaded: boolean;
  basePath: string;
  loadingMessage: string;
  emptyMessage: string;
}) => {
  const navigate = useNavigate();

  const firstDocumentId = useMemo(() => {
    if (!isLoaded) return null;
    const sorted = flattenDocuments(documents).sort((a, b) => a.name.localeCompare(b.name));
    return sorted[0]?.$jazz.id ?? null;
  }, [documents, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !firstDocumentId) return;
    navigate(`${basePath}/docs/${firstDocumentId}`, { replace: true });
  }, [basePath, firstDocumentId, isLoaded, navigate]);

  if (!isLoaded) {
    return <div className="text-sm text-muted-foreground">{loadingMessage}</div>;
  }

  if (documents.length === 0) {
    return (
      <section className="space-y-3 border rounded-md p-6 bg-background">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-2 border rounded-md p-6 bg-background">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">Choose a page from the sidebar to start editing.</p>
      {firstDocumentId ? (
        <Link className="text-sm underline" to={`${basePath}/docs/${firstDocumentId}`}>
          Open first page
        </Link>
      ) : null}
    </section>
  );
};
