import { useState } from "react";
import type { SubmitEvent } from "react"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Organization } from "@/schema";

type CreateProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: Organization[];
  onSubmit: (payload: { name: string; organization?: Organization }) => void;
};

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  organizations,
  onSubmit,
}: CreateProjectDialogProps) => {
  const [projectName, setProjectName] = useState("");
  const [projectOrgId, setProjectOrgId] = useState("none");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = projectName.trim();
    if (!name) {
      return;
    }

    onSubmit({
      name,
      ...(projectOrgId === "none" ? {} : { orgId: Number(projectOrgId) }),
    });

    setProjectName("");
    setProjectOrgId("none");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setProjectName("");
    setProjectOrgId("none");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Set up a new project and optionally attach it to an organization.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-sm font-medium text-stone-700">
              Project name
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Customer Portal Redesign"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-organization" className="text-sm font-medium text-stone-700">
              Organization
            </label>
            <select
              id="project-organization"
              value={projectOrgId}
              onChange={(event) => setProjectOrgId(event.target.value)}
              className="flex h-9 w-full rounded-md border border-stone-300 bg-white px-3 py-1 text-sm text-stone-900 shadow-xs outline-none focus-visible:border-stone-500 focus-visible:ring-2 focus-visible:ring-stone-200"
            >
              <option value="none">No organization (standalone)</option>
              {organizations.map((organization) => (
                <option key={organization.$jazz.id} value={organization.name}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Save Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
