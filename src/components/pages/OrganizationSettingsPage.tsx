import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { Group, co } from "jazz-tools";
import { createInviteLink, useAccount, useCoState, useIsAuthenticated } from "jazz-tools/react";

import { Account, Organization } from "@/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { cascadeDeleteOrganization } from "@/lib/cascadeDelete";

type EditableRole = "reader" | "writer" | "manager" | "admin";

const inviteRoleOptions: Array<{ value: EditableRole; label: string }> = [
  { value: "reader", label: "Read" },
  { value: "writer", label: "Write" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const roleLabelMap: Record<EditableRole, string> = {
  reader: "Read",
  writer: "Write",
  manager: "Manager",
  admin: "Admin",
};

const MemberPermissionRow = ({
  memberId,
  currentRole,
  canManage,
  canGrantAdmin,
  onRoleChange,
  onRemove,
}: {
  memberId: string;
  currentRole?: string;
  canManage: boolean;
  canGrantAdmin: boolean;
  onRoleChange: (member: co.loaded<typeof Account>, role: EditableRole) => void;
  onRemove: (member: co.loaded<typeof Account>) => void;
}) => {
  const memberAccount = useCoState(Account, memberId, {
    resolve: { profile: true },
  });

  const displayName = memberAccount.$isLoaded ? memberAccount.profile.name || memberAccount.$jazz.id : memberId;

  const normalizedCurrentRole: EditableRole | "unknown" =
    currentRole === "reader" ||
    currentRole === "writer" ||
    currentRole === "manager" ||
    currentRole === "admin"
      ? currentRole
      : "unknown";

  return (
    <li className="rounded border bg-background px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{memberId}</p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && memberAccount.$isLoaded ? (
            <>
              <select
                aria-label={`Permission for ${displayName}`}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={normalizedCurrentRole === "unknown" ? "reader" : normalizedCurrentRole}
                onChange={(event) => {
                  const value = event.target.value as EditableRole;
                  if (value === "admin" && !canGrantAdmin) return;
                  onRoleChange(memberAccount, value);
                }}
              >
                <option value="reader">Read</option>
                <option value="writer">Write</option>
                <option value="manager">Manager</option>
                <option value="admin" disabled={!canGrantAdmin}>
                  Admin
                </option>
              </select>

              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() => onRemove(memberAccount)}
              >
                Remove
              </Button>
            </>
          ) : (
            <span className="rounded border px-2 py-1 text-xs text-muted-foreground">
              {normalizedCurrentRole === "unknown" ? "Unknown" : roleLabelMap[normalizedCurrentRole]}
            </span>
          )}
        </div>
      </div>
    </li>
  );
};

export const OrganizationSettingsPage = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const organization = useCoState(Organization, orgId, {
    resolve: {
      projects: { $each: true },
    },
  });
  const ownerGroup = useCoState(Group, organization.$isLoaded ? organization.$jazz.owner.$jazz.id : undefined);

  const me = useAccount(Account);
  const accountWithRoot = useAccount(Account, {
    resolve: {
      root: {
        organizations: { $each: true },
        personal_organization: true,
        recent_projects: true,
        pinned_projects: true,
        pinned_organizations: true,
      },
    },
  });
  const isAuthenticated = useIsAuthenticated();

  const [orgName, setOrgName] = useState("");
  const [inviteRole, setInviteRole] = useState<EditableRole>("reader");
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingOrganization, setIsDeletingOrganization] = useState(false);
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState<co.loaded<typeof Account> | null>(null);
  const [isDeleteOrganizationConfirmOpen, setIsDeleteOrganizationConfirmOpen] = useState(false);

  useEffect(() => {
    if (!organization.$isLoaded) return;
    setOrgName(organization.name);
  }, [organization.$isLoaded, organization.$isLoaded ? organization.$jazz.id : null, organization.$isLoaded ? organization.name : null]);

  const canManagePermissions = useMemo(() => {
    if (!isAuthenticated || !me.$isLoaded || !organization.$isLoaded) return false;
    return me.canManage(organization);
  }, [isAuthenticated, me, organization]);

  const canGrantAdmin = useMemo(() => {
    if (!ownerGroup.$isLoaded) return false;
    return ownerGroup.myRole() === "admin";
  }, [ownerGroup]);

  if (!organization.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading organization settings...</div>;
  }

  const saveName = (event: FormEvent) => {
    event.preventDefault();

    const nextName = orgName.trim();
    if (!nextName || nextName === organization.name) return;

    organization.$jazz.set("name", nextName);
    setOrgName(nextName);
  };

  const generateInviteLink = () => {
    if (!isAuthenticated) return;
    const link = createInviteLink(organization, inviteRole);
    setInviteLink(link);
    setCopyStatus("idle");
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  };

  const updateMemberRole = (member: co.loaded<typeof Account>, role: EditableRole) => {
    if (!isAuthenticated || !ownerGroup.$isLoaded || !canManagePermissions) return;
    if (role === "admin" && !canGrantAdmin) return;

    setMemberActionError(null);
    ownerGroup.addMember(member, role);
  };

  const removeMember = (member: co.loaded<typeof Account>) => {
    if (!isAuthenticated || !ownerGroup.$isLoaded || !canManagePermissions) return;

    setPendingMemberRemoval(member);
  };

  const confirmMemberRemoval = () => {
    if (!isAuthenticated || !ownerGroup.$isLoaded || !canManagePermissions || !pendingMemberRemoval) return;

    try {
      setMemberActionError(null);
      ownerGroup.removeMember(pendingMemberRemoval);
      setPendingMemberRemoval(null);
    } catch {
      setMemberActionError("Unable to remove this member with your current permissions.");
    }
  };

  const memberIds = ownerGroup.$isLoaded ? ownerGroup.members.map((member) => member.id) : [];

  const requestDeleteOrganization = () => {
    setDeleteError(null);
    setIsDeleteOrganizationConfirmOpen(true);
  };

  const confirmDeleteOrganization = async () => {
    if (!orgId) return;

    setIsDeletingOrganization(true);
    setDeleteError(null);

    try {
      const projectIds = organization.$isLoaded ? organization.projects.map((project) => project.$jazz.id) : [];

      if (accountWithRoot.$isLoaded) {
        accountWithRoot.root.organizations.$jazz.remove((candidate) => candidate.$jazz.id === orgId);
        accountWithRoot.root.pinned_organizations.$jazz.remove((candidate) => candidate.$jazz.id === orgId);

        if (accountWithRoot.root.personal_organization?.$isLoaded && accountWithRoot.root.personal_organization.$jazz.id === orgId) {
          accountWithRoot.root.$jazz.set("personal_organization", undefined);
        }

        if (projectIds.length > 0) {
          accountWithRoot.root.recent_projects.$jazz.remove((candidate) => projectIds.includes(candidate.$jazz.id));
          accountWithRoot.root.pinned_projects.$jazz.remove((candidate) => projectIds.includes(candidate.$jazz.id));
        }
      }

      await cascadeDeleteOrganization(orgId);
      setIsDeleteOrganizationConfirmOpen(false);
      navigate("/organizations", { replace: true });
    } catch {
      setDeleteError("Could not delete this organization. Make sure you have admin permissions on all nested data.");
    } finally {
      setIsDeletingOrganization(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Organization Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>Update the organization display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={saveName}>
            <Input
              aria-label="Organization name"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="Organization name"
            />
            <Button type="submit" disabled={!orgName.trim() || orgName.trim() === organization.name}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Delete this organization and all nested data including every project, docs, tests, tasks, and people.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {deleteError ? <p className="text-xs text-destructive">{deleteError}</p> : null}
          <Button type="button" variant="destructive" onClick={requestDeleteOrganization}>
            Delete Organization
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Invite users and manage access levels (Read, Write, Manager, Admin).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <p className="text-sm text-muted-foreground">
              Sign in with a full account to join organizations/projects and manage organization membership.
            </p>
          ) : null}

          {canManagePermissions ? (
            <div className="space-y-2 rounded border bg-muted/20 p-3">
              <p className="text-sm font-medium">Invite new users</p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  aria-label="Invite role"
                  className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as EditableRole)}
                >
                  {inviteRoleOptions.map((roleOption) => (
                    <option
                      key={roleOption.value}
                      value={roleOption.value}
                      disabled={roleOption.value === "admin" && !canGrantAdmin}
                    >
                      {roleOption.label}
                    </option>
                  ))}
                </select>

                <Button type="button" onClick={generateInviteLink}>
                  Generate Invite Link
                </Button>
              </div>

              {inviteLink ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input aria-label="Generated invite link" value={inviteLink} readOnly />
                  <Button type="button" variant="outline" onClick={copyInviteLink}>
                    Copy
                  </Button>
                </div>
              ) : null}

              {copyStatus === "copied" ? <p className="text-xs text-green-700">Invite link copied.</p> : null}
              {copyStatus === "failed" ? <p className="text-xs text-red-700">Could not copy invite link.</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have manager or admin access for this organization.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Current members</p>
            {memberActionError ? <p className="text-xs text-red-700">{memberActionError}</p> : null}

            {!ownerGroup.$isLoaded ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : memberIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members found.</p>
            ) : (
              <ul className="space-y-2">
                {memberIds.map((memberId) => {
                  const currentRole = ownerGroup.getRoleOf(memberId);

                  return (
                    <MemberPermissionRow
                      key={memberId}
                      memberId={memberId}
                      currentRole={currentRole}
                      canManage={canManagePermissions}
                      canGrantAdmin={canGrantAdmin}
                      onRoleChange={updateMemberRole}
                      onRemove={removeMember}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingMemberRemoval}
        onOpenChange={(open) => {
          if (!open) setPendingMemberRemoval(null);
        }}
        title="Remove member"
        description={
          pendingMemberRemoval
            ? `Remove ${pendingMemberRemoval.profile.$isLoaded ? pendingMemberRemoval.profile.name || pendingMemberRemoval.$jazz.id : pendingMemberRemoval.$jazz.id} from this organization?`
            : undefined
        }
        confirmText="Remove"
        confirmVariant="destructive"
        onConfirm={confirmMemberRemoval}
      />

      <ConfirmDialog
        open={isDeleteOrganizationConfirmOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteError(null);
          setIsDeleteOrganizationConfirmOpen(open);
        }}
        title="Delete organization"
        description={`Delete \"${organization.name}\" and all nested data? This action cannot be undone.`}
        confirmText={isDeletingOrganization ? "Deleting..." : "Delete organization"}
        confirmVariant="destructive"
        isConfirmDisabled={isDeletingOrganization}
        onConfirm={() => {
          void confirmDeleteOrganization();
        }}
      />
    </section>
  );
};
