export const getProjectBasePath = (projectId: string, organizationId?: string | null) => {
  if (organizationId) {
    return `/organizations/${organizationId}/projects/${projectId}`;
  }

  return `/projects/${projectId}`;
};
