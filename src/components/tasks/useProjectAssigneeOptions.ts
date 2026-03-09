import { useEffect, useMemo, useState } from "react";
import { Group, co } from "jazz-tools";
import { useCoState } from "jazz-tools/react";

import { Account, Project } from "@/schema";

export type TaskAssigneeOption = {
  id: string;
  name: string;
  profile: co.loaded<typeof Account, { profile: true }>["profile"];
};

const canAssignRole = (role: string | undefined) =>
  role === "reader" || role === "writer" || role === "manager" || role === "admin";

export const useProjectAssigneeOptions = (
  project: co.loaded<typeof Project> | null
): TaskAssigneeOption[] => {
  const ownerGroup = useCoState(Group, project ? project.$jazz.owner.$jazz.id : undefined);
  const [options, setOptions] = useState<TaskAssigneeOption[]>([]);

  const memberRoleKey = useMemo(() => {
    if (!ownerGroup.$isLoaded) return "";
    return ownerGroup.members
      .map((member) => `${member.id}:${ownerGroup.getRoleOf(member.id) ?? ""}`)
      .sort((left, right) => left.localeCompare(right))
      .join("|");
  }, [ownerGroup.$isLoaded, ownerGroup.$isLoaded ? ownerGroup.members.length : 0]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!ownerGroup.$isLoaded) {
        setOptions([]);
        return;
      }

      const eligibleIds = ownerGroup.members
        .map((member) => member.id)
        .filter((memberId) => canAssignRole(ownerGroup.getRoleOf(memberId)));

      if (eligibleIds.length === 0) {
        setOptions([]);
        return;
      }

      const loadedAccounts = await Promise.all(
        eligibleIds.map((memberId) =>
          Account.load(memberId, { resolve: { profile: true } }).catch(() => null)
        )
      );

      if (cancelled) return;

      const next = loadedAccounts
        .filter((account): account is co.loaded<typeof Account, { profile: true }> =>
          Boolean(account && account.$isLoaded && account.profile && account.profile.$isLoaded)
        )
        .map((account) => ({
          id: account.profile.$jazz.id,
          name: account.profile.name || account.$jazz.id,
          profile: account.profile,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));

      setOptions(next);
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [memberRoleKey, ownerGroup.$isLoaded]);

  return options;
};
