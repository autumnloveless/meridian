import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router";
import { Group, co } from "jazz-tools";
import { createInviteLink, useAccount, useCoState, useIsAuthenticated } from "jazz-tools/react";

import { Account, Organization, Project } from "@/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

              <Button type="button" variant="outline" className="h-9" onClick={() => onRemove(memberAccount)}>
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

export const ProjectSettingsPage = () => {
  const { projectId, orgId } = useParams();

  const project = useCoState(Project, projectId);
  const organization = useCoState(Organization, orgId);
  const ownerGroup = useCoState(Group, project.$isLoaded ? project.$jazz.owner.$jazz.id : undefined);

  const me = useAccount(Account);
  const isAuthenticated = useIsAuthenticated();

  const [projectName, setProjectName] = useState("");
  const [inviteRole, setInviteRole] = useState<EditableRole>("reader");
  const [inviteLink, setInviteLink] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [publicAccessStatus, setPublicAccessStatus] = useState<"idle" | "updated" | "failed">("idle");

  useEffect(() => {
    if (!project.$isLoaded) return;
    setProjectName(project.name);
  }, [project.$isLoaded, project.$isLoaded ? project.$jazz.id : null, project.$isLoaded ? project.name : null]);

  const canManagePermissions = useMemo(() => {
    if (!isAuthenticated || !me.$isLoaded || !project.$isLoaded) return false;
    return me.canManage(project);
  }, [isAuthenticated, me, project]);

  const canGrantAdmin = useMemo(() => {
    if (!ownerGroup.$isLoaded) return false;
    return ownerGroup.myRole() === "admin";
  }, [ownerGroup]);

  const everyoneRole = ownerGroup.$isLoaded ? ownerGroup.getRoleOf("everyone") : undefined;
  const isPubliclyReadable = everyoneRole === "reader" || everyoneRole === "writer" || everyoneRole === "manager" || everyoneRole === "admin";

  const isCascadingFromOrg = useMemo(() => {
    if (!project.$isLoaded || !organization.$isLoaded) return false;
    return project.$jazz.owner.$jazz.id === organization.$jazz.owner.$jazz.id;
  }, [project, organization]);

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading project settings...</div>;
  }

  const saveName = (event: FormEvent) => {
    event.preventDefault();

    const nextName = projectName.trim();
    if (!nextName || nextName === project.name) return;

    project.$jazz.set("name", nextName);
    setProjectName(nextName);
  };

  const generateInviteLink = () => {
    if (!isAuthenticated) return;
    const link = createInviteLink(project, inviteRole);
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

    const displayName = member.profile.$isLoaded ? member.profile.name || member.$jazz.id : member.$jazz.id;
    const shouldRemove = window.confirm(`Remove ${displayName} from this project?`);
    if (!shouldRemove) return;

    try {
      setMemberActionError(null);
      ownerGroup.removeMember(member);
    } catch {
      setMemberActionError("Unable to remove this member with your current permissions.");
    }
  };

  const makeProjectPubliclyReadable = () => {
    if (!isAuthenticated || !ownerGroup.$isLoaded || !canManagePermissions) return;

    try {
      ownerGroup.makePublic("reader");
      setPublicAccessStatus("updated");
    } catch {
      setPublicAccessStatus("failed");
    }
  };

  const memberIds = ownerGroup.$isLoaded ? ownerGroup.members.map((member) => member.id) : [];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Project Settings</h2>

      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>Update the project display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={saveName}>
            <Input
              aria-label="Project name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project name"
            />
            <Button type="submit" disabled={!projectName.trim() || projectName.trim() === project.name}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Access</CardTitle>
          <CardDescription>Allow anyone with the project link to read project data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Current visibility: {isPubliclyReadable ? "Publicly readable" : "Private"}
          </p>

          {isCascadingFromOrg ? (
            <p className="text-xs text-muted-foreground">
              This project shares the organization owner group. Making it public also affects the organization-level group.
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            onClick={makeProjectPubliclyReadable}
            disabled={!canManagePermissions || isPubliclyReadable}
          >
            {isPubliclyReadable ? "Already Public" : "Make Publicly Readable"}
          </Button>

          {publicAccessStatus === "updated" ? <p className="text-xs text-green-700">Project is now publicly readable.</p> : null}
          {publicAccessStatus === "failed" ? <p className="text-xs text-red-700">Could not update public access with your current permissions.</p> : null}
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
              Sign in with a full account to join organizations/projects and manage project membership.
            </p>
          ) : null}

          {organization.$isLoaded ? (
            <p className="text-xs text-muted-foreground">
              {isCascadingFromOrg
                ? "Project permissions inherit from the organization owner group."
                : "This project uses a different owner group than its organization. New projects will inherit organization permissions."}
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
              You do not have manager or admin access for this project.
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
    </section>
  );
};