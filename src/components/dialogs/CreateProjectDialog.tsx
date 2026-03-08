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
  onSubmit: (payload: { name: string; organization?: Organization }) => void;
};

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: CreateProjectDialogProps) => {
  const [projectName, setProjectName] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = projectName.trim();
    if (!name) {
      return;
    }

    onSubmit({ name });
    setProjectName("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setProjectName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Set up a new project.</DialogDescription>
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
