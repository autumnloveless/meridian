import { useMemo } from "react";
import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";
import { DocsIndexPage } from "@/components/docs/DocsIndexPage";
import { getOrganizationBasePath } from "@/lib/projectPaths";

export const OrganizationDocsPage = () => {
  const { orgId } = useParams();
  const organizationBasePath = useMemo(() => {
    if (!orgId) return "";
    return getOrganizationBasePath(orgId);
  }, [orgId]);

  const organization = useCoState(Organization, orgId, {
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

  if (!orgId) {
    return <div className="text-sm text-red-700">Invalid organization URL.</div>;
  }

  return (
    <DocsIndexPage
      title="Organization Docs"
      documents={organization.$isLoaded ? organization.documents : []}
      isLoaded={organization.$isLoaded}
      basePath={organizationBasePath}
      loadingMessage="Loading organization docs..."
      emptyMessage="Create your first page from the Docs sidebar button."
    />
  );
};
