export const getOrganizationBasePath = (organizationId: string) => {
  return `/organizations/${organizationId}`;
};

export const getProjectBasePath = (projectId: string, organizationId: string) => {
  return `${getOrganizationBasePath(organizationId)}/projects/${projectId}`;
};
