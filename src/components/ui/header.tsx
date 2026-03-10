import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, Pin, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAuth } from "./user";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAccount } from "jazz-tools/react";
import { useAgent, useIsAuthenticated } from "jazz-tools/react";
import { Account } from "@/schema";
import { getProjectBasePath } from "@/lib/projectPaths";

const topLevelNavItems = [
  { label: "Overview", to: "/overview" },
];

export const Header = () => {
  const location = useLocation();
  const logoHref = location.pathname === "/overview" ? "/" : "/overview";
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const agent = useAgent();
  const isAuthenticated = useIsAuthenticated();
  const isAnonymous = agent.$type$ === "Account" && !isAuthenticated;
  const account = useAccount(Account, {
    resolve: {
      root: {
        personal_organization: { projects: { $each: true } },
        organizations: { $each: { projects: { $each: true } } },
        pinned_organizations: { $each: true },
        pinned_projects: { $each: true },
        recent_projects: { $each: true },
      },
    },
  });

  const organizationEntries = (() => {
    if (!account.$isLoaded) return [] as Array<{ id: string; name: string }>;

    const entries = new Map<string, { id: string; name: string }>();

    if (account.root.personal_organization) {
      const personalOrg = account.root.personal_organization;
      entries.set(personalOrg.$jazz.id, { id: personalOrg.$jazz.id, name: personalOrg.name });
    }

    account.root.organizations.forEach((organization) => {
      entries.set(organization.$jazz.id, { id: organization.$jazz.id, name: organization.name });
    });

    const allOrganizations = [...entries.values()];
    const pinnedOrganizationIds = new Set(account.root.pinned_organizations.map((organization) => organization.$jazz.id));

    const pinnedOrganizations = allOrganizations
      .filter((organization) => pinnedOrganizationIds.has(organization.id))
      .sort((left, right) => left.name.localeCompare(right.name));

    const unpinnedOrganizations = allOrganizations
      .filter((organization) => !pinnedOrganizationIds.has(organization.id))
      .sort((left, right) => left.name.localeCompare(right.name));

    return [...pinnedOrganizations, ...unpinnedOrganizations].slice(0, 5);
  })();

  const projectEntries = (() => {
    if (!account.$isLoaded) return [] as Array<{ id: string; name: string; orgId: string; orgName: string }>;

    const projectOrgMap = new Map<string, { id: string; name: string; orgId: string; orgName: string }>();
    const recencyPriority = new Map<string, number>();

    account.root.recent_projects.forEach((project, index) => {
      recencyPriority.set(project.$jazz.id, index);
    });

    if (account.root.personal_organization) {
      const org = account.root.personal_organization;
      org.projects.forEach((project) => {
        projectOrgMap.set(project.$jazz.id, {
          id: project.$jazz.id,
          name: project.name,
          orgId: org.$jazz.id,
          orgName: org.name,
        });
      });
    }

    account.root.organizations.forEach((org) => {
      org.projects.forEach((project) => {
        projectOrgMap.set(project.$jazz.id, {
          id: project.$jazz.id,
          name: project.name,
          orgId: org.$jazz.id,
          orgName: org.name,
        });
      });
    });

    const allProjects = [...projectOrgMap.values()];
    const pinnedProjectIds = new Set(account.root.pinned_projects.map((project) => project.$jazz.id));

    const pinnedProjects = allProjects
      .filter((project) => pinnedProjectIds.has(project.id))
      .sort((left, right) => left.name.localeCompare(right.name));

    const unpinnedProjects = allProjects
      .filter((project) => !pinnedProjectIds.has(project.id))
      .sort((left, right) => {
        const leftRecent = recencyPriority.has(left.id);
        const rightRecent = recencyPriority.has(right.id);
        if (leftRecent !== rightRecent) return leftRecent ? -1 : 1;

        if (leftRecent && rightRecent) {
          return (recencyPriority.get(left.id) ?? 0) - (recencyPriority.get(right.id) ?? 0);
        }

        return left.name.localeCompare(right.name);
      });

    return [...pinnedProjects, ...unpinnedProjects].slice(0, 5);
  })();

  const isProjectPinned = (projectId: string) => {
    if (!account.$isLoaded) return false;
    return account.root.pinned_projects.some((project) => project.$jazz.id === projectId);
  };

  const isOrganizationPinned = (organizationId: string) => {
    if (!account.$isLoaded) return false;
    return account.root.pinned_organizations.some((organization) => organization.$jazz.id === organizationId);
  };

  const findOrganizationById = (organizationId: string) => {
    if (!account.$isLoaded) return null;

    if (account.root.personal_organization?.$jazz.id === organizationId) {
      return account.root.personal_organization;
    }

    return account.root.organizations.find((organization) => organization.$jazz.id === organizationId) ?? null;
  };

  const toggleOrganizationPin = (organizationId: string) => {
    if (!account.$isLoaded) return;

    if (isOrganizationPinned(organizationId)) {
      account.root.pinned_organizations.$jazz.remove((organization) => organization.$jazz.id === organizationId);
      return;
    }

    const organization = findOrganizationById(organizationId);
    if (!organization) return;

    account.root.pinned_organizations.$jazz.push(organization);
  };

  const findProjectById = (projectId: string) => {
    if (!account.$isLoaded) return null;

    if (account.root.personal_organization) {
      const personalProject = account.root.personal_organization.projects.find((project) => project.$jazz.id === projectId);
      if (personalProject && personalProject.$isLoaded) return personalProject;
    }

    let matchedProject: any = null;
    account.root.organizations.forEach((organization) => {
      if (matchedProject) return;
      const orgProject = organization.projects.find((project) => project.$jazz.id === projectId);
      if (orgProject && orgProject.$isLoaded) {
        matchedProject = orgProject;
      }
    });

    if (matchedProject) return matchedProject;

    return null;
  };

  const toggleProjectPin = (projectId: string) => {
    if (!account.$isLoaded) return;

    if (isProjectPinned(projectId)) {
      account.root.pinned_projects.$jazz.remove((project) => project.$jazz.id === projectId);
      return;
    }

    const project = findProjectById(projectId);
    if (!project) return;

    account.root.pinned_projects.$jazz.push(project);
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOrganizationsMenuOpen, setIsOrganizationsMenuOpen] = useState(false);
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(false);

  useEffect(() => {
    setIsOrganizationsMenuOpen(false);
    setIsProjectsMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const closeNavMenus = () => {
    setIsOrganizationsMenuOpen(false);
    setIsProjectsMenuOpen(false);
  };

  const mobileMenu = isMobileMenuOpen ? (
    <div
      className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-40 sm:hidden"
      aria-hidden={!isMobileMenuOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close navigation menu"
        onClick={closeMobileMenu}
      />
      <div
        id="mobile-nav-menu"
        className="absolute inset-0 overflow-y-auto border-t border-border/70 bg-background px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
      >
        <nav aria-label="Primary mobile" className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          {topLevelNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          {organizationEntries.length > 0 ? (
            <div className="rounded-md border border-border/70 px-3 py-2">
              <p className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Organizations</p>
              <div className="flex flex-col gap-1">
                {organizationEntries.map((organization) => (
                  <Link
                    key={organization.id}
                    to={`/organizations/${organization.id}/overview`}
                    onClick={closeMobileMenu}
                    className="rounded px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {organization.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {projectEntries.length > 0 ? (
            <div className="rounded-md border border-border/70 px-3 py-2">
              <p className="pb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Recent Projects</p>
              <div className="flex flex-col gap-1">
                {projectEntries.map((project) => (
                  <Link
                    key={project.id}
                    to={`${getProjectBasePath(project.id, project.orgId)}/overview`}
                    onClick={closeMobileMenu}
                    className="group rounded px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground group-focus:text-foreground">
                        {project.orgName}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  ) : null;

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 w-full items-center justify-between gap-3 px-3 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            to={logoHref}
            className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
            aria-label="Meridian home"
          >
            Meridian
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {topLevelNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            <DropdownMenu open={isOrganizationsMenuOpen} onOpenChange={setIsOrganizationsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-sm font-medium text-muted-foreground">
                  Organizations
                  <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-1.5">
                <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Your Organizations
                </p>
                {organizationEntries.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No organizations</div>
                ) : (
                  organizationEntries.map((organization) => (
                    <div
                      key={organization.id}
                      className="group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/70 focus-within:bg-muted/70"
                    >
                      <Link
                        to={`/organizations/${organization.id}/overview`}
                        onClick={closeNavMenus}
                        className="min-w-0 flex-1 rounded-sm text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <span className="transition-colors group-hover:text-foreground group-focus-within:text-foreground">{organization.name}</span>
                      </Link>
                      <button
                        type="button"
                        className={cn(
                          "cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          isOrganizationPinned(organization.id) && "text-foreground",
                          !isOrganizationPinned(organization.id) && "group-hover:text-foreground",
                        )}
                        aria-label={isOrganizationPinned(organization.id) ? `Unpin ${organization.name}` : `Pin ${organization.name}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleOrganizationPin(organization.id);
                        }}
                      >
                        <Pin className={cn("size-3.5", isOrganizationPinned(organization.id) && "fill-current")} />
                      </button>
                    </div>
                  ))
                )}

                <div className="mt-1 border-t border-border/70 pt-1.5">
                  <Link
                    to="/organizations"
                    onClick={closeNavMenus}
                    className="block rounded-md px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    View All Organizations
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={isProjectsMenuOpen} onOpenChange={setIsProjectsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-sm font-medium text-muted-foreground">
                  Projects
                  <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-1.5">
                <p className="px-2.5 pb-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Quick Access
                </p>
                {projectEntries.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No recent projects</div>
                ) : (
                  projectEntries.map((project) => (
                    <div
                      key={project.id}
                      className="group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/70 focus-within:bg-muted/70"
                    >
                      <Link
                        to={`${getProjectBasePath(project.id, project.orgId)}/overview`}
                        onClick={closeNavMenus}
                        className="min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm text-foreground transition-colors group-hover:text-foreground group-focus-within:text-foreground">
                            {project.name}
                          </span>
                          <span className="text-xs text-muted-foreground transition-colors group-hover:text-foreground group-focus-within:text-foreground">
                            {project.orgName}
                          </span>
                        </div>
                      </Link>
                      <button
                        type="button"
                        className={cn(
                          "cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          isProjectPinned(project.id) && "text-foreground",
                          !isProjectPinned(project.id) && "group-hover:text-foreground",
                        )}
                        aria-label={isProjectPinned(project.id) ? `Unpin ${project.name}` : `Pin ${project.name}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleProjectPin(project.id);
                        }}
                      >
                        <Pin className={cn("size-3.5", isProjectPinned(project.id) && "fill-current")} />
                      </button>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <Button
              variant="ghost"
              className="size-10 p-0 sm:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-controls="mobile-nav-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
          <UserAuth />
        </div>
      </div>

      {isAnonymous && (
        <div className="border-t border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:text-amber-200 sm:px-6 lg:px-8">
          You are browsing anonymously. Log in to enable sync and back up your data.
        </div>
      )}

      {isOffline && (
        <div className="border-t border-sky-500/25 bg-sky-500/10 px-4 py-1.5 text-center text-xs font-medium text-sky-900 dark:text-sky-100 sm:px-6 lg:px-8">
          Offline mode: You can keep working. Changes will sync automatically when your network connection is restored.
        </div>
      )}

      {typeof document !== "undefined" && mobileMenu ? createPortal(mobileMenu, document.body) : null}
    </header>
  );
};