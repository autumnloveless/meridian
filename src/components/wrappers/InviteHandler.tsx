import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAccount, useIsAuthenticated } from "jazz-tools/react";
import { co } from "jazz-tools";

import { Account, Organization, Project } from "@/schema";
import { getProjectBasePath } from "@/lib/projectPaths";

type PendingInvite = {
  invitedId: string;
  inviteSecret: string;
};

type InviteSecret = `inviteSecret_z${string}`;

function parseInviteHash(hash: string): PendingInvite | null {
  if (!hash) return null;

  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  const segments = cleaned.split("/").filter(Boolean);
  if (segments.length < 3) return null;

  if (segments[0] !== "invite") return null;

  const invitedId = decodeURIComponent(segments[1] ?? "");
  const inviteSecret = decodeURIComponent(segments[2] ?? "");

  if (!invitedId || !inviteSecret) return null;

  return { invitedId, inviteSecret };
}

function projectExistsInOrg(
  org: co.loaded<typeof Organization, { projects: true }>,
  projectId: string
) {
  return org.projects.some((project) => project.$jazz.id === projectId);
}

export const InviteHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(Account, {
    resolve: {
      root: {
        personal_organization: { projects: true },
        organizations: { $each: { projects: true } },
      },
    },
  });

  const [message, setMessage] = useState<string | null>(null);
  const processedHashRef = useRef<string | null>(null);

  useEffect(() => {
    const pendingInvite = parseInviteHash(location.hash);
    if (!pendingInvite) {
      setMessage(null);
      processedHashRef.current = null;
      return;
    }

    if (!isAuthenticated) {
      setMessage("Sign in to accept invites and join organizations or projects.");
      return;
    }

    if (!account.$isLoaded) return;

    if (processedHashRef.current === location.hash) return;
    processedHashRef.current = location.hash;

    let canceled = false;

    const clearHash = () => {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    };

    const handleInvite = async () => {
      const me = account;
      const secret = pendingInvite.inviteSecret as InviteSecret;
      const loadedMe = await me.$jazz.ensureLoaded({
        resolve: {
          root: {
            personal_organization: { projects: true },
            organizations: { $each: { projects: true } },
          },
        },
      });

      try {
        await me.acceptInvite(pendingInvite.invitedId, secret, Organization);
        const acceptedOrganization = await Organization.load(pendingInvite.invitedId, {
          resolve: { projects: true },
        });

        if (canceled || !acceptedOrganization.$isLoaded) return;

        const isPersonalOrg = loadedMe.root.personal_organization?.$jazz.id === acceptedOrganization.$jazz.id;
        const alreadyListed = loadedMe.root.organizations.some(
          (organization) => organization.$jazz.id === acceptedOrganization.$jazz.id
        );

        if (!isPersonalOrg && !alreadyListed) {
          loadedMe.root.organizations.$jazz.push(acceptedOrganization);
        }

        clearHash();
        setMessage("Organization invite accepted.");
        navigate(`/organizations/${acceptedOrganization.$jazz.id}/overview`, { replace: true });
        return;
      } catch {
        // Try as project invite next.
      }

      try {
        await me.acceptInvite(pendingInvite.invitedId, secret, Project);
        const acceptedProject = await Project.load(pendingInvite.invitedId);

        if (canceled || !acceptedProject.$isLoaded) return;

        let targetOrgId: string | null = null;

        const personalOrg = loadedMe.root.personal_organization;
        if (personalOrg && projectExistsInOrg(personalOrg, acceptedProject.$jazz.id)) {
          targetOrgId = personalOrg.$jazz.id;
        }

        if (!targetOrgId) {
          loadedMe.root.organizations.forEach((organization) => {
            if (targetOrgId) return;
            if (projectExistsInOrg(organization, acceptedProject.$jazz.id)) {
              targetOrgId = organization.$jazz.id;
            }
          });
        }

        if (!targetOrgId && personalOrg) {
          personalOrg.projects.$jazz.push(acceptedProject);
          targetOrgId = personalOrg.$jazz.id;
        }

        clearHash();
        setMessage("Project invite accepted.");

        if (targetOrgId) {
          navigate(`${getProjectBasePath(acceptedProject.$jazz.id, targetOrgId)}/overview`, { replace: true });
        }
        return;
      } catch {
        if (!canceled) {
          setMessage("Invite could not be accepted.");
          clearHash();
        }
      }
    };

    void handleInvite();

    return () => {
      canceled = true;
    };
  }, [location.hash, isAuthenticated, account, navigate]);

  if (!message) return null;

  return (
    <div className="border-b border-border/70 bg-blue-500/10 px-4 py-2 text-center text-xs font-medium text-blue-900 sm:px-6 lg:px-8">
      {message}
    </div>
  );
};
